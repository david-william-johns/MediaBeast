mod error;
mod state;
mod config;
mod discography;
mod player;
mod analyser;
mod fs;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data = app.path().app_data_dir()
                .expect("Could not resolve app data directory");
            std::fs::create_dir_all(&app_data).ok();
            config::migrate_legacy_data(&app_data);
            let paths = config::load_paths(&app_data);
            paths.ensure_dirs().ok();
            app.manage(AppState::new(app_data));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Discography
            discography::commands::search_artist,
            discography::commands::search_song_title,
            discography::commands::fetch_youtube_url,
            discography::commands::start_download,
            discography::commands::cancel_download,
            discography::commands::get_search_history,
            discography::commands::get_previous_results,
            discography::commands::save_previous_results,
            discography::commands::export_urls,
            // Player
            player::commands::get_eq_profiles,
            player::commands::save_eq_profile,
            player::commands::delete_eq_profile,
            player::commands::get_eq_presets,
            player::commands::fetch_thumbnail,
            player::commands::get_thumbnail_path,
            // Analyser
            analyser::commands::decode_waveform,
            analyser::commands::clear_waveform_cache,
            // File system
            fs::commands::get_folder_info,
            fs::commands::delete_folder_contents,
            fs::commands::get_data_paths,
            fs::commands::save_data_paths,
            fs::commands::list_audio_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MediaBeast");
}
