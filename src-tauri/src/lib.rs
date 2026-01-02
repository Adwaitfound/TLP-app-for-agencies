use tauri::command;
use std::fs;

#[command]
async fn download_and_open_dmg(url: String, version: String) -> Result<(), String> {
    // Download DMG file
    let response = reqwest::Client::new()
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    // Get Downloads folder
    let downloads = dirs::download_dir()
        .ok_or_else(|| "Could not find Downloads folder".to_string())?;
    
    let dmg_path = downloads.join(format!("The Lost Project_{}_x64.dmg", version));

    // Write DMG to disk
    let bytes = response.bytes().await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    fs::write(&dmg_path, bytes)
        .map_err(|e| format!("Failed to write DMG file: {}", e))?;

    // Open the DMG file with default application (Finder)
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        Command::new("open")
            .arg(&dmg_path)
            .spawn()
            .map_err(|e| format!("Failed to open DMG: {}", e))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![download_and_open_dmg])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            // Get the main window for debugging
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}