pub mod ai;
mod reactive_resume;
pub mod storage;
pub mod workspace;

use storage::{Storage, StorageInfo};
use tauri::Manager;

#[tauri::command]
fn get_storage_info(storage: tauri::State<'_, Storage>) -> StorageInfo {
    storage.info()
}

#[tauri::command]
fn workspace_snapshot(
    storage: tauri::State<'_, Storage>,
) -> workspace::AppResult<serde_json::Value> {
    workspace::snapshot(&storage)
}

#[tauri::command]
fn workspace_action(
    storage: tauri::State<'_, Storage>,
    action: workspace::Action,
) -> workspace::AppResult<serde_json::Value> {
    workspace::execute(&storage, action)
}

#[tauri::command]
fn attach_final_pdf(
    storage: tauri::State<'_, Storage>,
    resume_id: String,
    name: String,
    bytes: Vec<u8>,
) -> workspace::AppResult<serde_json::Value> {
    workspace::attach_pdf(&storage, &resume_id, &name, &bytes)
}

#[tauri::command]
fn attach_asset_evidence(
    storage: tauri::State<'_, Storage>,
    contribution_id: String,
    name: String,
    bytes: Vec<u8>,
) -> workspace::AppResult<serde_json::Value> {
    workspace::attach_evidence(&storage, &contribution_id, &name, &bytes)
}

#[tauri::command]
fn read_asset_evidence(
    storage: tauri::State<'_, Storage>,
    file_id: String,
) -> workspace::AppResult<Vec<u8>> {
    workspace::read_evidence(&storage, &file_id)
}

#[tauri::command]
fn open_asset_evidence_folder(
    storage: tauri::State<'_, Storage>,
    contribution_id: String,
) -> workspace::AppResult<()> {
    let path = workspace::evidence_inbox(&storage, &contribution_id)?;
    std::process::Command::new("explorer.exe")
        .arg(path)
        .spawn()
        .map_err(|_| workspace::fail("OPEN_FAILED", "无法打开材料目录。"))?;
    Ok(())
}

#[tauri::command]
async fn refresh_asset_evidence(
    storage: tauri::State<'_, Storage>,
    contribution_id: String,
) -> workspace::AppResult<serde_json::Value> {
    let storage = storage.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        workspace::refresh_evidence(&storage, &contribution_id)
    })
    .await
    .map_err(|_| workspace::fail("SCAN_FAILED", "刷新材料时发生错误。"))?
}

#[tauri::command]
async fn refresh_existing_asset_evidence(
    storage: tauri::State<'_, Storage>,
) -> workspace::AppResult<serde_json::Value> {
    let storage = storage.inner().clone();
    tauri::async_runtime::spawn_blocking(move || workspace::refresh_existing_evidence(&storage))
        .await
        .map_err(|_| workspace::fail("SCAN_FAILED", "启动时无法刷新材料。"))?
}

#[tauri::command]
fn read_final_pdf(
    storage: tauri::State<'_, Storage>,
    file_id: String,
) -> workspace::AppResult<Vec<u8>> {
    workspace::read_pdf(&storage, &file_id)
}

#[tauri::command]
fn ai_status(storage: tauri::State<'_, Storage>) -> workspace::AppResult<serde_json::Value> {
    ai::status(&storage)
}

#[tauri::command]
fn configure_ai(
    storage: tauri::State<'_, Storage>,
    config: ai::ProviderConfig,
    api_key: Option<String>,
) -> workspace::AppResult<serde_json::Value> {
    ai::configure(&storage, config, api_key)
}

#[tauri::command]
fn delete_ai_key(storage: tauri::State<'_, Storage>) -> workspace::AppResult<serde_json::Value> {
    ai::delete_key(&storage)
}

#[tauri::command]
async fn generate_ai(
    storage: tauri::State<'_, Storage>,
    request: ai::AiRequest,
) -> workspace::AppResult<serde_json::Value> {
    ai::generate(&storage, request).await
}

#[tauri::command]
fn apply_ai_proposal(
    storage: tauri::State<'_, Storage>,
    run_id: String,
) -> workspace::AppResult<serde_json::Value> {
    ai::apply(&storage, &run_id)
}

#[tauri::command]
fn dismiss_ai_proposal(
    storage: tauri::State<'_, Storage>,
    run_id: String,
) -> workspace::AppResult<()> {
    ai::dismiss(&storage, &run_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let root = match std::env::var_os("CAREER_COPILOT_WORKSPACE") {
                Some(path) => {
                    let path = std::path::PathBuf::from(path);
                    if !path.is_absolute() {
                        return Err("CAREER_COPILOT_WORKSPACE must be absolute".into());
                    }
                    path
                }
                None => app.path().app_local_data_dir()?.join("workspace"),
            };
            let storage = Storage::initialize(root).map_err(|error| error.to_string())?;
            app.manage(storage);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_storage_info,
            workspace_snapshot,
            workspace_action,
            attach_final_pdf,
            attach_asset_evidence,
            read_asset_evidence,
            open_asset_evidence_folder,
            refresh_asset_evidence,
            refresh_existing_asset_evidence,
            read_final_pdf,
            ai_status,
            configure_ai,
            delete_ai_key,
            generate_ai,
            apply_ai_proposal,
            dismiss_ai_proposal,
            reactive_resume::rr_status,
            reactive_resume::rr_configure,
            reactive_resume::rr_remove_key,
            reactive_resume::rr_test_connection,
            reactive_resume::rr_open,
            reactive_resume::rr_archive
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
