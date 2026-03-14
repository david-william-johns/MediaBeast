use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use crate::error::Result;
use crate::state::{AppState, DataPaths};
use crate::config;

#[derive(Serialize, Deserialize)]
pub struct FolderInfo {
    pub label: String,
    pub path: String,
    pub file_count: usize,
}

fn count_files(dir: &std::path::Path) -> usize {
    std::fs::read_dir(dir)
        .map(|entries| entries.filter_map(|e| e.ok())
            .filter(|e| e.path().is_file())
            .count())
        .unwrap_or(0)
}

#[tauri::command]
pub async fn get_folder_info(state: State<'_, AppState>) -> Result<Vec<FolderInfo>> {
    let paths = state.data_paths.read().await;
    Ok(vec![
        FolderInfo {
            label: "Raw Videos".into(),
            path: paths.raw_video.to_string_lossy().into(),
            file_count: count_files(&paths.raw_video),
        },
        FolderInfo {
            label: "Ripped Audio".into(),
            path: paths.raw_audio.to_string_lossy().into(),
            file_count: count_files(&paths.raw_audio),
        },
        FolderInfo {
            label: "Music Library".into(),
            path: paths.music_library.to_string_lossy().into(),
            file_count: count_files(&paths.music_library),
        },
        FolderInfo {
            label: "Processed Exports".into(),
            path: paths.processed.to_string_lossy().into(),
            file_count: count_files(&paths.processed),
        },
    ])
}

#[tauri::command]
pub async fn delete_folder_contents(
    folder_key: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let paths = state.data_paths.read().await;
    let dir = match folder_key.as_str() {
        "raw_video" => &paths.raw_video,
        "raw_audio" => &paths.raw_audio,
        "music_library" => &paths.music_library,
        "processed" => &paths.processed,
        _ => return Err(crate::error::AppError::NotFound(format!("Unknown folder: {}", folder_key))),
    };
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        if entry.path().is_file() {
            std::fs::remove_file(entry.path())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn get_data_paths(state: State<'_, AppState>) -> Result<DataPaths> {
    Ok(state.data_paths.read().await.clone())
}

#[tauri::command]
pub async fn save_data_paths(
    new_paths: DataPaths,
    state: State<'_, AppState>,
) -> Result<()> {
    let mut paths = state.data_paths.write().await;
    new_paths.ensure_dirs()?;
    let _ = config::save_paths(&paths.app_data, &new_paths);
    *paths = new_paths;
    Ok(())
}

#[tauri::command]
pub async fn list_audio_files(state: State<'_, AppState>) -> Result<Vec<String>> {
    let paths = state.data_paths.read().await;
    let dir = &paths.raw_audio;
    let mut files: Vec<String> = Vec::new();
    if dir.exists() {
        for entry in std::fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "mp3") {
                files.push(path.to_string_lossy().to_string());
            }
        }
    }
    files.sort();
    Ok(files)
}
