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
fn read_final_pdf(
    storage: tauri::State<'_, Storage>,
    file_id: String,
) -> workspace::AppResult<Vec<u8>> {
    workspace::read_pdf(&storage, &file_id)
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
            read_final_pdf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
