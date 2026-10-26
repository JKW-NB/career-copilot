use career_copilot_lib::{
    storage::Storage,
    workspace::{self, Action},
};
use serde_json::{json, Value};
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};
static NEXT: AtomicU64 = AtomicU64::new(0);

#[test]
fn upgrades_v1_workspace_with_identity_and_backup_intact() {
    let dir = Dir::new();
    fs::create_dir_all(&dir.0).unwrap();
    let db = rusqlite::Connection::open(dir.0.join("app.db")).unwrap();
    db.execute_batch(include_str!("../migrations/0001_storage.sql"))
        .unwrap();
    db.pragma_update(None, "user_version", 1).unwrap();
    let identity: String = db
        .query_row(
            "SELECT value FROM _storage_metadata WHERE key='workspace_id'",
            [],
            |row| row.get(0),
        )
        .unwrap();
    drop(db);
    let storage = Storage::initialize(&dir.0).unwrap();
    assert_eq!(storage.info().workspace_id, identity);
    assert_eq!(storage.info().schema_version, 2);
    assert!(workspace::snapshot(&storage).unwrap()["assets"]
        .as_array()
        .unwrap()
        .is_empty());
    let backup = fs::read_dir(&storage.paths().temp)
        .unwrap()
        .map(|e| e.unwrap().path())
        .find(|p| p.extension().is_some_and(|e| e == "backup"))
        .unwrap();
    let backup = rusqlite::Connection::open(backup).unwrap();
    let version: u32 = backup
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .unwrap();
    assert_eq!(version, 1);
}
struct Dir(PathBuf);
impl Dir {
    fn new() -> Self {
        Self(std::env::temp_dir().join(format!(
            "career-workspace-{}-{}",
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
fn act(s: &Storage, value: Value) -> workspace::AppResult<Value> {
    workspace::execute(s, serde_json::from_value::<Action>(value).unwrap())
}
fn asset(s: &Storage) -> String {
    act(s,json!({"type":"add_asset","organization":"测试机构","role":"参与者","title":"调研项目","summary":"整理访谈材料"})).unwrap()["id"].as_str().unwrap().into()
}
fn fact(s: &Storage, a: &str, content: &str) -> (String, String) {
    let value = act(
        s,
        json!({"type":"add_fact","contribution_id":a,"content":content,"ownership":"CONTRIBUTOR"}),
    )
    .unwrap();
    (
        value["id"].as_str().unwrap().into(),
        value["revisionId"].as_str().unwrap().into(),
    )
}
fn confirm(s: &Storage, f: &str, r: &str) -> String {
    act(s,json!({"type":"review_fact","fact_id":f,"expected_revision_id":r,"confirmed":true,"risk_acknowledged":true})).unwrap()["revisionId"].as_str().unwrap().into()
}
fn job(s: &Storage) -> (String, String) {
    let j = act(
        s,
        json!({"type":"add_job","company":"测试公司","role_title":"产品实习","jd":"负责用户调研"}),
    )
    .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    let a=act(s,json!({"type":"save_analysis","job_id":j,"expected_jd":"负责用户调研","requirements":["核心：用户调研"]})).unwrap()["id"].as_str().unwrap().to_owned();
    (j, a)
}
fn portfolio(s: &Storage, j: &str, a: &str, r: &str) -> String {
    act(
        s,
        json!({"type":"confirm_portfolio","job_id":j,"analysis_id":a,"revision_ids":[r]}),
    )
    .unwrap()["id"]
        .as_str()
        .unwrap()
        .into()
}
fn resume(s: &Storage, p: &str) -> String {
    act(s,json!({"type":"compile_resume","portfolio_id":p,"name":"测试用户","contact":"test@example.invalid","education":"示例大学"})).unwrap()["id"].as_str().unwrap().into()
}
fn ready(s: &Storage) -> (String, String, String) {
    let a = asset(s);
    let (f, r) = fact(s, &a, "整理访谈并形成问题清单");
    let r = confirm(s, &f, &r);
    let (j, analysis) = job(s);
    let p = portfolio(s, &j, &analysis, &r);
    let content = resume(s, &p);
    act(s, json!({"type":"mark_ready","resume_id":content})).unwrap();
    (content, f, r)
}

#[test]
fn draft_requires_explicit_ready_confirmation_and_revalidates_current_facts() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    let a = asset(&s);
    let (f, r) = fact(&s, &a, "整理访谈");
    let r = confirm(&s, &f, &r);
    let (j, analysis) = job(&s);
    let p = portfolio(&s, &j, &analysis, &r);
    let content = resume(&s, &p);
    assert_eq!(
        workspace::snapshot(&s).unwrap()["resumes"][0]["status"],
        "DRAFT"
    );
    assert_eq!(
        workspace::attach_pdf(&s, &content, "draft.pdf", b"%PDF-1.4\n%%EOF")
            .unwrap_err()
            .code,
        "NOT_FOUND"
    );
    act(
        &s,
        json!({"type":"retract_fact","fact_id":f,"expected_revision_id":r}),
    )
    .unwrap();
    assert_eq!(
        act(&s, json!({"type":"mark_ready","resume_id":content}))
            .unwrap_err()
            .code,
        "FACT_REVIEW_REQUIRED"
    );
    assert_eq!(
        workspace::snapshot(&s).unwrap()["resumes"][0]["status"],
        "DRAFT"
    );
}
#[test]
fn empty_workspace_never_contains_demo_and_reopens_with_real_history() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    assert_eq!(workspace::snapshot(&s).unwrap()["assets"], json!([]));
    let a = asset(&s);
    let (f, r) = fact(&s, &a, "整理访谈");
    let confirmed = confirm(&s, &f, &r);
    let identity = s.info().workspace_id;
    drop(s);
    let s = Storage::initialize(&dir.0).unwrap();
    assert_eq!(s.info().workspace_id, identity);
    let snapshot = workspace::snapshot(&s).unwrap();
    assert_eq!(snapshot["assets"][0]["title"], "调研项目");
    assert_eq!(snapshot["facts"][0]["revisionId"], confirmed);
    let count: i64 = s
        .connection()
        .unwrap()
        .query_row("SELECT count(*) FROM fact_revisions", [], |r| r.get(0))
        .unwrap();
    assert_eq!(count, 2);
}
#[test]
fn forged_frontend_validation_and_invalid_inputs_are_rejected() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    assert!(serde_json::from_value::<Action>(json!({"type":"add_fact","contribution_id":"missing","content":"x","ownership":"CONTRIBUTOR","validated":true})).is_err());
    assert_eq!(
        act(
            &s,
            json!({"type":"add_asset","organization":" ","title":" ","role":"","summary":"x"})
        )
        .unwrap_err()
        .code,
        "INVALID_INPUT"
    );
    assert_eq!(
        act(
            &s,
            json!({"type":"add_fact","contribution_id":"missing","content":"x","ownership":"LEAD"})
        )
        .unwrap_err()
        .code,
        "NOT_FOUND"
    );
    assert!(workspace::snapshot(&s).unwrap()["assets"]
        .as_array()
        .unwrap()
        .is_empty());
}
#[test]
fn high_risk_needs_explicit_review_and_stale_review_cannot_commit() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    let a = asset(&s);
    let (f, r) = fact(&s, &a, "独立提升 20%");
    let error=act(&s,json!({"type":"review_fact","fact_id":f,"expected_revision_id":r,"confirmed":true,"risk_acknowledged":false})).unwrap_err();
    assert_eq!(error.code, "RISK_REVIEW_REQUIRED");
    let new = confirm(&s, &f, &r);
    assert_eq!(act(&s,json!({"type":"review_fact","fact_id":f,"expected_revision_id":r,"confirmed":true,"risk_acknowledged":true})).unwrap_err().code,"STALE_INPUT");
    assert_ne!(r, new);
}
#[test]
fn uncertain_duplicate_cross_job_and_retracted_facts_cannot_enter_portfolio() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    let a = asset(&s);
    let (f, r) = fact(&s, &a, "整理访谈");
    let (j, analysis) = job(&s);
    assert_eq!(
        act(
            &s,
            json!({"type":"confirm_portfolio","job_id":j,"analysis_id":analysis,"revision_ids":[r]})
        )
        .unwrap_err()
        .code,
        "FACT_REVIEW_REQUIRED"
    );
    let r = confirm(&s, &f, &r);
    let (j2, _) = job(&s);
    assert_eq!(act(&s,json!({"type":"confirm_portfolio","job_id":j2,"analysis_id":analysis,"revision_ids":[r]})).unwrap_err().code,"SCOPE_MISMATCH");
    assert_eq!(act(&s,json!({"type":"confirm_portfolio","job_id":j,"analysis_id":analysis,"revision_ids":[r,r]})).unwrap_err().code,"INVALID_INPUT");
    act(
        &s,
        json!({"type":"retract_fact","fact_id":f,"expected_revision_id":r}),
    )
    .unwrap();
    assert_eq!(
        act(
            &s,
            json!({"type":"confirm_portfolio","job_id":j,"analysis_id":analysis,"revision_ids":[r]})
        )
        .unwrap_err()
        .code,
        "FACT_REVIEW_REQUIRED"
    );
    assert!(workspace::snapshot(&s).unwrap()["portfolios"]
        .as_array()
        .unwrap()
        .is_empty());
}
#[test]
fn revising_fact_preserves_ready_snapshot_but_blocks_new_compilation() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    let (content, f, r) = ready(&s);
    let before = workspace::snapshot(&s).unwrap()["resumes"].clone();
    act(&s,json!({"type":"revise_fact","fact_id":f,"expected_revision_id":r,"content":"新的表述","ownership":"CONTRIBUTOR"})).unwrap();
    let snapshot = workspace::snapshot(&s).unwrap();
    assert_eq!(snapshot["resumes"], before);
    let p = snapshot["resumes"][0]["portfolioId"].as_str().unwrap();
    assert_eq!(act(&s,json!({"type":"compile_resume","portfolio_id":p,"name":"用户","contact":"邮箱","education":""})).unwrap_err().code,"FACT_REVIEW_REQUIRED");
    let db = s.connection().unwrap();
    assert!(db
        .execute(
            "UPDATE resume_content_versions SET content_plan_json='{}' WHERE id=?1",
            [content]
        )
        .is_err());
    assert!(db
        .execute("UPDATE fact_revisions SET content='changed'", [])
        .is_err());
}
#[test]
fn real_pdf_binding_hash_and_permanent_application_lock() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    let (content, _, _) = ready(&s);
    assert_eq!(
        workspace::attach_pdf(&s, &content, "bad.pdf", b"invalid")
            .unwrap_err()
            .code,
        "INVALID_FILE"
    );
    let pdf = b"%PDF-1.4\nexample-for-contract-test\n%%EOF";
    let file = workspace::attach_pdf(&s, &content, "final.pdf", pdf).unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    assert_eq!(workspace::read_pdf(&s, &file).unwrap(), pdf);
    let app = act(
        &s,
        json!({"type":"record_application","file_id":file,"channel":"手工测试","note":""}),
    )
    .unwrap()["id"]
        .as_str()
        .unwrap()
        .to_owned();
    act(&s,json!({"type":"update_application","application_id":app,"status":"VOIDED","note":"撤销记录"})).unwrap();
    let db = s.connection().unwrap();
    assert!(db
        .execute("DELETE FROM final_resume_files WHERE id=?1", [&file])
        .is_err());
    assert!(db
        .execute(
            "UPDATE final_resume_files SET sha256='fake' WHERE id=?1",
            [&file]
        )
        .is_err());
    assert!(db
        .execute("UPDATE applications SET job_id='other' WHERE id=?1", [app])
        .is_err());
    assert_eq!(workspace::snapshot(&s).unwrap()["files"][0]["used"], 1);
    let path: String = db
        .query_row(
            "SELECT stored_path FROM final_resume_files WHERE id=?1",
            [&file],
            |r| r.get(0),
        )
        .unwrap();
    fs::write(
        s.paths().final_resumes.join(path),
        b"changed outside the app",
    )
    .unwrap();
    assert_eq!(
        act(
            &s,
            json!({"type":"record_application","file_id":file,"channel":"官网","note":""})
        )
        .unwrap_err()
        .code,
        "FILE_CHANGED"
    );
}
#[test]
fn archived_assets_are_unavailable_for_new_content() {
    let dir = Dir::new();
    let s = Storage::initialize(&dir.0).unwrap();
    let a = asset(&s);
    let (f, r) = fact(&s, &a, "整理访谈");
    let r = confirm(&s, &f, &r);
    let (j, analysis) = job(&s);
    let p = portfolio(&s, &j, &analysis, &r);
    let original = resume(&s, &p);
    act(&s, json!({"type":"archive_asset","contribution_id":a})).unwrap();
    assert_eq!(act(&s,json!({"type":"compile_resume","portfolio_id":p,"name":"用户","contact":"邮箱","education":""})).unwrap_err().code,"FACT_REVIEW_REQUIRED");
    assert_eq!(
        workspace::snapshot(&s).unwrap()["resumes"][0]["id"],
        original
    );
}
