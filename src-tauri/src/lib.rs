pub mod storage;

use storage::{Storage, StorageInfo};
use tauri::Manager;

#[tauri::command]
fn get_storage_info(storage: tauri::State<'_, Storage>) -> StorageInfo {
    storage.info()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let root = app.path().app_local_data_dir()?.join("workspace");
            let storage = Storage::initialize(root).map_err(|error| error.to_string())?;
            app.manage(storage);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_storage_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
