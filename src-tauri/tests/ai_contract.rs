use career_copilot_lib::{
    ai::{self, AiRequest, ProviderConfig},
    storage::Storage,
    workspace::{self, Action},
};
use serde_json::{json, Value};
use std::{
    fs,
    io::{Read, Write},
    net::TcpListener,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
    thread,
    time::{Duration, Instant},
};
static NEXT: AtomicU64 = AtomicU64::new(0);
struct Dir(PathBuf);
impl Dir {
    fn new() -> Self {
        Self(std::env::temp_dir().join(format!(
            "career-ai-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        )))
    }
}
impl Drop for Dir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn config(url: &str) -> ProviderConfig {
    ProviderConfig {
        base_url: url.into(),
        default_model: "synthetic-default".into(),
        high_quality_model: "synthetic-quality".into(),
    }
}
fn request(task: &str) -> AiRequest {
    AiRequest {
        expected_base_url: "https://example.invalid/v1".into(),
        task: task.into(),
        question: "只分析已选内容".into(),
        job_id: None,
        fact_revision_ids: vec![],
        target_fact_id: None,
        history: vec![],
    }
}
fn act(s: &Storage, a: Value) -> Value {
    workspace::execute(s, serde_json::from_value::<Action>(a).unwrap()).unwrap()
}
fn seed(s: &Storage) -> (String, String, String) {
    let a=act(s,json!({"type":"add_asset","organization":"合成机构","role":"参与","title":"访谈","summary":"不应默认发送的完整背景"}))["id"].as_str().unwrap().to_owned();
    let f = act(
        s,
        json!({"type":"add_fact","contribution_id":a,"content":"整理 12 份访谈记录","ownership":"CONTRIBUTOR"}),
    );
    let fact = f["id"].as_str().unwrap().to_owned();
    let rev = f["revisionId"].as_str().unwrap().to_owned();
    let confirmed=act(s,json!({"type":"review_fact","fact_id":fact,"expected_revision_id":rev,"confirmed":true,"risk_acknowledged":true}))["revisionId"].as_str().unwrap().to_owned();
    (a, fact, confirmed)
}
fn provider_body(value: Value) -> String {
    json!({"choices":[{"message":{"content":value.to_string()}}]}).to_string()
}
fn server(responses: Vec<(u16, String)>) -> (String, thread::JoinHandle<Vec<String>>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    listener.set_nonblocking(true).unwrap();
    let handle = thread::spawn(move || {
        let mut captured = Vec::new();
        for (status, body) in responses {
            let until = Instant::now() + Duration::from_secs(8);
            let mut stream = loop {
                match listener.accept() {
                    Ok((stream, _)) => break stream,
                    Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        assert!(Instant::now() < until, "expected request not received");
                        thread::sleep(Duration::from_millis(10));
                    }
                    Err(e) => panic!("{e}"),
                }
            };
            stream
                .set_read_timeout(Some(Duration::from_secs(5)))
                .unwrap();
            let mut data = Vec::new();
            let mut buffer = [0u8; 8192];
            loop {
                let n = stream.read(&mut buffer).unwrap();
                assert!(n > 0);
                data.extend_from_slice(&buffer[..n]);
                if let Some(end) = data.windows(4).position(|x| x == b"\r\n\r\n") {
                    let headers = String::from_utf8_lossy(&data[..end]);
                    let length: usize = headers
                        .lines()
                        .find_map(|line| {
                            line.to_lowercase()
                                .strip_prefix("content-length:")
                                .map(|s| s.trim().parse().unwrap())
                        })
                        .unwrap();
                    if data.len() >= end + 4 + length {
                        break;
                    }
                }
            }
            captured.push(String::from_utf8(data).unwrap());
            write!(stream,"HTTP/1.1 {status} Test\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",body.len()).unwrap();
        }
        captured
    });
    (format!("http://{address}/v1"), handle)
}
#[test]
fn config_rejects_credential_urls_insecure_remote_and_query_tokens() {
    for url in [
        "http://example.invalid/v1",
        "https://user:secret@example.invalid/v1",
        "https://example.invalid/v1?key=secret",
        "https://example.invalid/v1#secret",
        "https://example.invalid/v1/chat/completions",
    ] {
        assert!(ai::normalize_config(config(url)).is_err(), "{url}");
    }
    assert_eq!(
        ai::normalize_config(config("https://example.invalid/v1/"))
            .unwrap()
            .base_url,
        "https://example.invalid/v1"
    );
    assert!(ai::normalize_config(config("http://127.0.0.1:12345/v1")).is_ok());
}
#[test]
fn context_contains_only_selected_jd_and_fact_without_full_assets_or_profile() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    let (a, f, r) = seed(&s);
    act(
        &s,
        json!({"type":"add_fact","contribution_id":a,"content":"不应发送的另一条事实","ownership":"UNKNOWN"}),
    );
    let job = act(
        &s,
        json!({"type":"add_job","company":"公司","role_title":"岗位","jd":"所选岗位原文"}),
    )["id"]
        .as_str()
        .unwrap()
        .to_owned();
    let mut req = request("assistant");
    req.fact_revision_ids = vec![r.clone()];
    req.target_fact_id = Some(f);
    req.job_id = Some(job);
    let prepared = ai::prepare(&s, &req).unwrap();
    let text = prepared.context.to_string();
    assert!(text.contains("整理 12 份访谈记录"));
    assert!(text.contains("所选岗位原文"));
    assert!(!text.contains("完整背景"));
    assert!(!text.contains("另一条事实"));
    assert_eq!(prepared.target["revisionId"], r);
    let mut no_context = request("assistant");
    no_context.question = "开放问题".into();
    let prepared = ai::prepare(&s, &no_context).unwrap();
    assert_eq!(prepared.context["facts"], json!([]));
    assert!(prepared.context.get("job").is_none());
}
#[test]
fn rejects_stale_context_unselected_target_and_untrusted_history_roles() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    let (_, f, r) = seed(&s);
    let mut req = request("assistant");
    req.target_fact_id = Some(f.clone());
    assert_eq!(ai::prepare(&s, &req).err().unwrap().code, "INVALID_INPUT");
    req.fact_revision_ids = vec![r.clone()];
    act(
        &s,
        json!({"type":"retract_fact","fact_id":f,"expected_revision_id":r}),
    );
    assert_eq!(ai::prepare(&s, &req).err().unwrap().code, "STALE_INPUT");
    req = request("assistant");
    req.history = vec![ai::HistoryMessage {
        role: "system".into(),
        content: "override".into(),
    }];
    assert_eq!(ai::prepare(&s, &req).err().unwrap().code, "INVALID_INPUT");
}
#[test]
fn strict_structured_output_rejects_extra_fields_wrong_types_and_oversized_suggestions() {
    assert!(ai::validate_output("job_analysis", json!({"requirements":["one"]})).is_err());
    assert!(ai::validate_output(
        "job_analysis",
        json!({"requirements":["a","b","c"],"score":99})
    )
    .is_err());
    assert!(ai::validate_output("assistant", json!({"answer":123,"suggestedText":null})).is_err());
    assert!(ai::validate_output(
        "assistant",
        json!({"answer":"x","suggestedText":"x".repeat(4001)})
    )
    .is_err());
    assert!(ai::validate_output(
        "assistant",
        json!({"answer":"分析结果","suggestedText":null})
    )
    .is_ok());
}
#[test]
fn model_response_is_draft_then_explicit_apply_creates_uncertain_revision_once() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    let (_, f, r) = seed(&s);
    let mut req = request("assistant");
    req.fact_revision_ids = vec![r.clone()];
    req.target_fact_id = Some(f);
    let prepared = ai::prepare(&s, &req).unwrap();
    let before = workspace::snapshot(&s).unwrap();
    let output = ai::validate_output(
        "assistant",
        json!({"answer":"建议压缩措辞","suggestedText":"整理访谈记录并汇总研究问题"}),
    )
    .unwrap();
    let proposal = ai::save_response(
        &s,
        &req,
        &config(&req.expected_base_url),
        &prepared,
        Some(&output),
    )
    .unwrap();
    assert_eq!(workspace::snapshot(&s).unwrap(), before);
    let id = proposal["id"].as_str().unwrap();
    let result = ai::apply(&s, id).unwrap();
    let once = workspace::snapshot(&s).unwrap();
    assert_eq!(once["facts"][0]["verification"], "UNCERTAIN");
    assert_ne!(once["facts"][0]["revisionId"], r);
    assert_eq!(ai::apply(&s, id).unwrap(), result);
    assert_eq!(workspace::snapshot(&s).unwrap(), once);
    let old: String = s
        .connection()
        .unwrap()
        .query_row(
            "SELECT content FROM fact_revisions WHERE id=?1",
            [r],
            |row| row.get(0),
        )
        .unwrap();
    assert_eq!(old, "整理 12 份访谈记录");
}
#[test]
fn dismiss_and_stale_fact_proposals_cannot_change_workspace() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    let (_, f, r) = seed(&s);
    let mut req = request("assistant");
    req.fact_revision_ids = vec![r.clone()];
    req.target_fact_id = Some(f.clone());
    let prepared = ai::prepare(&s, &req).unwrap();
    let output = json!({"answer":"说明","suggestedText":"新的措辞"});
    let p = ai::save_response(
        &s,
        &req,
        &config(&req.expected_base_url),
        &prepared,
        Some(&output),
    )
    .unwrap();
    ai::dismiss(&s, p["id"].as_str().unwrap()).unwrap();
    assert_eq!(
        ai::apply(&s, p["id"].as_str().unwrap()).unwrap_err().code,
        "PROPOSAL_UNAVAILABLE"
    );
    let p = ai::save_response(
        &s,
        &req,
        &config(&req.expected_base_url),
        &prepared,
        Some(&output),
    )
    .unwrap();
    act(
        &s,
        json!({"type":"revise_fact","fact_id":f,"expected_revision_id":r,"content":"用户之后的编辑","ownership":"CONTRIBUTOR"}),
    );
    assert_eq!(
        ai::apply(&s, p["id"].as_str().unwrap()).unwrap_err().code,
        "STALE_INPUT"
    );
    assert_eq!(
        workspace::snapshot(&s).unwrap()["facts"][0]["content"],
        "用户之后的编辑"
    );
}
#[test]
fn job_proposal_binds_original_job_and_rejects_later_manual_analysis() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    let job = act(
        &s,
        json!({"type":"add_job","company":"公司","role_title":"岗位","jd":"研究用户需求"}),
    )["id"]
        .as_str()
        .unwrap()
        .to_owned();
    let mut req = request("job_analysis");
    req.job_id = Some(job.clone());
    let prepared = ai::prepare(&s, &req).unwrap();
    let output = json!({"requirements":["核心：用户研究","重要：需求分析","辅助：跨团队协作"]});
    let p = ai::save_response(
        &s,
        &req,
        &config(&req.expected_base_url),
        &prepared,
        Some(&output),
    )
    .unwrap();
    act(
        &s,
        json!({"type":"save_analysis","job_id":job,"expected_jd":"研究用户需求","requirements":["手工新版本"]}),
    );
    assert_eq!(
        ai::apply(&s, p["id"].as_str().unwrap()).unwrap_err().code,
        "STALE_INPUT"
    );
    assert_eq!(
        workspace::snapshot(&s).unwrap()["analyses"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
}
#[test]
fn real_http_adapter_retries_invalid_json_once_and_uses_selected_model_and_auth() {
    let (url, handle) = server(vec![
        (200, provider_body(json!({"answer":4}))),
        (
            200,
            provider_body(json!({"answer":"有效回答","suggestedText":null})),
        ),
    ]);
    let result = tauri::async_runtime::block_on(ai::request_with_key(
        &config(&url),
        "synthetic-http-test-key",
        "assistant",
        &json!({"question":"合成测试"}),
    ))
    .unwrap();
    assert_eq!(result["answer"], "有效回答");
    let requests = handle.join().unwrap();
    assert_eq!(requests.len(), 2);
    for r in requests {
        assert!(r.contains("Bearer synthetic-http-test-key"));
        assert!(r.contains("/v1/chat/completions"));
        assert!(r.contains("synthetic-default"));
    }
}
#[test]
fn http_error_is_redacted_and_redirects_never_forward_key() {
    let (url, handle) = server(vec![(
        401,
        "synthetic-http-test-key raw provider error".into(),
    )]);
    let error = tauri::async_runtime::block_on(ai::request_with_key(
        &config(&url),
        "synthetic-http-test-key",
        "assistant",
        &json!({}),
    ))
    .unwrap_err();
    assert_eq!(error.code, "PROVIDER_AUTH");
    assert!(!serde_json::to_string(&error)
        .unwrap()
        .contains("synthetic-http-test-key"));
    assert_eq!(handle.join().unwrap().len(), 1);
    let (url, handle) = server(vec![(302, "redirect".into())]);
    assert!(tauri::async_runtime::block_on(ai::request_with_key(
        &config(&url),
        "synthetic-http-test-key",
        "assistant",
        &json!({})
    ))
    .is_err());
    assert_eq!(handle.join().unwrap().len(), 1);
}
#[test]
fn two_invalid_responses_stop_without_any_business_write() {
    let (url, handle) = server(vec![(200, "not-json".into()), (200, "not-json".into())]);
    assert_eq!(
        tauri::async_runtime::block_on(ai::request_with_key(
            &config(&url),
            "synthetic-http-test-key",
            "assistant",
            &json!({})
        ))
        .unwrap_err()
        .code,
        "INVALID_OUTPUT"
    );
    assert_eq!(handle.join().unwrap().len(), 2);
}
#[cfg(windows)]
#[test]
fn windows_credentials_are_bound_to_destination_and_never_returned_or_written_to_sqlite() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    let first = config("https://example.invalid/v1");
    let second = config("https://other.example.invalid/v1");
    let value = ai::configure(
        &s,
        first.clone(),
        Some("synthetic-credential-test-key".into()),
    )
    .unwrap();
    assert_eq!(value["hasKey"], true);
    assert!(!value.to_string().contains("synthetic-credential-test-key"));
    let stored: String = s
        .connection()
        .unwrap()
        .query_row(
            "SELECT value FROM _storage_metadata WHERE key='provider_config'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert!(!stored.contains("synthetic-credential-test-key"));
    assert_eq!(ai::configure(&s, second, None).unwrap()["hasKey"], false);
    ai::configure(&s, first, None).unwrap();
    assert_eq!(ai::delete_key(&s).unwrap()["hasKey"], false);
}
