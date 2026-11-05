use crate::{
    storage::Storage,
    workspace::{self, fail, AppResult},
};
use reqwest::{multipart, Client, Response, Url};
use rusqlite::{params, OptionalExtension};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::time::Duration;
use tauri::State;

const ORIGIN_KEY: &str = "reactive_resume_origin";
const PDF_LIMIT: usize = 15 * 1024 * 1024;

fn origin(value: &str) -> AppResult<String> {
    let invalid = || {
        fail(
            "INVALID_CONFIG",
            "请输入 Reactive Resume 的站点地址。远程使用 HTTPS，本机可使用 HTTP。",
        )
    };
    let url = Url::parse(value.trim()).map_err(|_| invalid())?;
    let local = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
    if !(url.scheme() == "https" || url.scheme() == "http" && local)
        || url.host_str().is_none()
        || url.path() != "/"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(invalid());
    }
    Ok(url.origin().ascii_serialization())
}

fn metadata(storage: &Storage, key: &str) -> AppResult<Option<String>> {
    Ok(storage
        .connection()?
        .query_row(
            "SELECT value FROM _storage_metadata WHERE key=?1",
            [key],
            |row| row.get(0),
        )
        .optional()?)
}

#[cfg(windows)]
fn credential(storage: &Storage, origin: &str) -> AppResult<keyring::Entry> {
    let account = format!(
        "{}-{:x}",
        storage.info().workspace_id,
        Sha256::digest(origin)
    );
    keyring::Entry::new("com.careercopilot.reactive-resume", &account)
        .map_err(|_| fail("CREDENTIAL_UNAVAILABLE", "无法访问 Windows 凭据管理器。"))
}

fn secret(storage: &Storage, origin: &str) -> AppResult<String> {
    #[cfg(windows)]
    {
        credential(storage, origin)?.get_password().map_err(|_| {
            fail(
                "MISSING_KEY",
                "请在设置中保存该站点的 Reactive Resume API Key。",
            )
        })
    }
    #[cfg(not(windows))]
    {
        let _ = (storage, origin);
        Err(fail(
            "CREDENTIAL_UNAVAILABLE",
            "此连接需要 Windows 凭据管理器。",
        ))
    }
}

#[tauri::command]
pub fn rr_status(storage: State<'_, Storage>) -> AppResult<Value> {
    let configured = metadata(&storage, ORIGIN_KEY)?;
    let has_key = configured
        .as_deref()
        .is_some_and(|site| secret(&storage, site).is_ok());
    Ok(json!({"origin": configured, "hasKey": has_key}))
}

#[tauri::command]
pub fn rr_configure(storage: State<'_, Storage>, site: String, api_key: String) -> AppResult<()> {
    let site = origin(&site)?;
    let key = api_key.trim();
    if !key.is_empty() {
        if key.len() > 512 || !key.bytes().all(|b| b.is_ascii_graphic()) {
            return Err(fail("INVALID_CONFIG", "API Key 格式无效。"));
        }
        #[cfg(windows)]
        credential(&storage, &site)?
            .set_password(key)
            .map_err(|_| fail("CREDENTIAL_UNAVAILABLE", "无法保存 Reactive Resume 密钥。"))?;
        #[cfg(not(windows))]
        return Err(fail(
            "CREDENTIAL_UNAVAILABLE",
            "此连接需要 Windows 凭据管理器。",
        ));
    }
    storage.connection()?.execute(
        "INSERT INTO _storage_metadata(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![ORIGIN_KEY, site],
    )?;
    Ok(())
}

#[tauri::command]
pub fn rr_remove_key(storage: State<'_, Storage>, expected_origin: String) -> AppResult<()> {
    let site = selected_site(&storage, &expected_origin)?;
    #[cfg(windows)]
    match credential(&storage, &site)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(_) => Err(fail(
            "CREDENTIAL_UNAVAILABLE",
            "无法删除 Reactive Resume 密钥。",
        )),
    }
    #[cfg(not(windows))]
    {
        let _ = site;
        Err(fail(
            "CREDENTIAL_UNAVAILABLE",
            "此连接需要 Windows 凭据管理器。",
        ))
    }
}

fn selected_site(storage: &Storage, expected: &str) -> AppResult<String> {
    let site = metadata(storage, ORIGIN_KEY)?
        .ok_or_else(|| fail("NOT_CONFIGURED", "请先配置 Reactive Resume。"))?;
    if site != expected {
        return Err(fail(
            "STALE_CONFIG",
            "Reactive Resume 地址已变更，请重新打开此页面。",
        ));
    }
    origin(&site)
}

fn link_key(site: &str, resume_id: &str) -> String {
    format!(
        "reactive_resume_link:{:x}:{resume_id}",
        Sha256::digest(site)
    )
}

fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 100
        && id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
}

fn ready_plan(storage: &Storage, id: &str) -> AppResult<Value> {
    let plan: String = storage.connection()?.query_row(
        "SELECT content_plan_json FROM resume_content_versions WHERE id=?1 AND status='CONTENT_READY'", [id], |r| r.get(0),
    ).optional()?.ok_or_else(|| fail("NOT_READY", "请先确认此简历内容版本。"))?;
    Ok(serde_json::from_str(&plan)?)
}

fn export_json(plan: &Value) -> Value {
    let text = |key| plan[key].as_str().unwrap_or_default();
    let mut work: Vec<Value> = Vec::new();
    if let Some(items) = plan["items"].as_array() {
        for item in items {
            let index = work.iter().position(|group| {
                group["name"] == item["organization"]
                    && group["position"] == item["role"]
                    && group["summary"] == item["title"]
            });
            let entry = match index {
                Some(index) => &mut work[index],
                None => {
                    work.push(json!({"name": item["organization"], "position": item["role"], "summary": item["title"], "highlights": []}));
                    work.last_mut().expect("inserted group")
                }
            };
            entry["highlights"]
                .as_array_mut()
                .expect("highlights array")
                .push(item["text"].clone());
        }
    }
    let summary = [
        ("联系方式", text("contact")),
        ("教育背景", text("education")),
    ]
    .into_iter()
    .filter(|(_, value)| !value.is_empty())
    .map(|(label, value)| format!("{label}：\n{value}"))
    .collect::<Vec<_>>()
    .join("\n\n");
    json!({"basics":{"name":text("name"),"summary":summary},"work":work})
}

fn client() -> AppResult<Client> {
    Client::builder()
        .retry(reqwest::retry::never())
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|_| fail("CONNECTION", "无法初始化 Reactive Resume 连接。"))
}

async fn read_limited(mut response: Response, limit: usize) -> AppResult<Vec<u8>> {
    let mut result = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| fail("CONNECTION", "读取 Reactive Resume 响应失败。"))?
    {
        if chunk.len() > limit - result.len() {
            return Err(fail(
                "INVALID_RESPONSE",
                "Reactive Resume 响应超过大小限制。",
            ));
        }
        result.extend_from_slice(&chunk);
    }
    Ok(result)
}

async fn ensure_link(storage: &Storage, site: &str, resume_id: &str) -> AppResult<String> {
    let plan = ready_plan(storage, resume_id)?;
    let key = link_key(site, resume_id);
    if let Some(id) = metadata(storage, &key)? {
        return if valid_id(&id) {
            Ok(id)
        } else {
            Err(uncertain())
        };
    }
    let token = secret(storage, site)?;
    let client = client()?;
    let file = multipart::Part::text(export_json(&plan).to_string())
        .file_name(format!("career-copilot-{resume_id}.json"))
        .mime_str("application/json")
        .map_err(|_| fail("INVALID_INPUT", "无法生成导入文件。"))?;
    let form = multipart::Form::new()
        .text("format", "JSON_RESUME")
        .text("locale", "zh-CN")
        .part("file", file);
    let reserved = storage.connection()?.execute(
        "INSERT INTO _storage_metadata(key,value) VALUES(?1,'!pending') ON CONFLICT(key) DO NOTHING", [&key],
    )?;
    if reserved == 0 {
        return Err(uncertain());
    }
    let response = client
        .post(format!("{site}/api/openapi/resumes/file-imports"))
        .header("x-api-key", token)
        .multipart(form)
        .send()
        .await
        .map_err(|_| uncertain())?;
    if matches!(
        response.status().as_u16(),
        400 | 401 | 403 | 404 | 413 | 415 | 422 | 429
    ) {
        storage.connection()?.execute(
            "DELETE FROM _storage_metadata WHERE key=?1 AND value='!pending'",
            [&key],
        )?;
        return Err(fail(
            "IMPORT_REJECTED",
            "Reactive Resume 拒绝导入。请检查地址、API Key 写权限或稍后重试。",
        ));
    }
    if !response.status().is_success() {
        return Err(uncertain());
    }
    let bytes = read_limited(response, 4096)
        .await
        .map_err(|_| uncertain())?;
    let id: String = serde_json::from_slice(&bytes).map_err(|_| uncertain())?;
    if !valid_id(&id) {
        return Err(uncertain());
    }
    storage.connection()?.execute(
        "UPDATE _storage_metadata SET value=?2 WHERE key=?1",
        params![key, id],
    )?;
    Ok(id)
}

fn uncertain() -> workspace::AppError {
    fail("IMPORT_UNCERTAIN", "此版本的远端创建结果未确认。请在 Reactive Resume 检查是否已有副本，必要时使用文件导出和 PDF 上传。")
}

#[tauri::command]
pub async fn rr_open(
    storage: State<'_, Storage>,
    resume_id: String,
    expected_origin: String,
) -> AppResult<()> {
    let site = selected_site(&storage, &expected_origin)?;
    let id = ensure_link(&storage, &site, &resume_id).await?;
    #[cfg(windows)]
    {
        std::process::Command::new("explorer.exe")
            .arg(format!("{site}/builder/{id}"))
            .spawn()
            .map_err(|_| fail("OPEN_FAILED", "排版副本已关联，浏览器启动失败，请再试。"))?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = id;
        Err(fail("OPEN_FAILED", "此连接需要 Windows。"))
    }
}

#[tauri::command]
pub async fn rr_archive(
    storage: State<'_, Storage>,
    resume_id: String,
    expected_origin: String,
) -> AppResult<Value> {
    let site = selected_site(&storage, &expected_origin)?;
    ready_plan(&storage, &resume_id)?;
    let id = metadata(&storage, &link_key(&site, &resume_id))?
        .filter(|id| valid_id(id))
        .ok_or_else(|| fail("NOT_LINKED", "请先在 Reactive Resume 中创建排版副本。"))?;
    let response = client()?
        .get(format!("{site}/api/openapi/resumes/{id}/exports/pdf"))
        .header("x-api-key", secret(&storage, &site)?)
        .send()
        .await
        .map_err(|_| fail("CONNECTION", "无法取回 PDF，请检查站点连接。"))?;
    if !response.status().is_success() {
        return Err(fail(
            "EXPORT_FAILED",
            "无法取回 PDF。请检查排版副本和 API Key 读取权限。",
        ));
    }
    let bytes = read_limited(response, PDF_LIMIT).await?;
    workspace::attach_pdf(&storage, &resume_id, "reactive-resume.pdf", &bytes)
}
