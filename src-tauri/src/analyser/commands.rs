use tauri::State;
use crate::error::Result;
use crate::state::AppState;
use super::waveform::{self, WaveformData};

#[tauri::command]
pub async fn decode_waveform(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<WaveformData> {
    let paths = state.data_paths.read().await;
    let cache_dir = paths.waveform_cache.clone();
    drop(paths);

    let audio_path = std::path::PathBuf::from(&file_path);
    tokio::task::spawn_blocking(move || {
        waveform::decode(&audio_path, &cache_dir)
    })
    .await
    .map_err(|e| crate::error::AppError::WaveformDecode(e.to_string()))?
}

#[tauri::command]
pub async fn clear_waveform_cache(state: State<'_, AppState>) -> Result<()> {
    let paths = state.data_paths.read().await;
    let cache_dir = paths.waveform_cache.clone();
    drop(paths);
    for entry in std::fs::read_dir(&cache_dir)? {
        let entry = entry?;
        if entry.path().extension().map_or(false, |e| e == "json") {
            std::fs::remove_file(entry.path())?;
        }
    }
    Ok(())
}
