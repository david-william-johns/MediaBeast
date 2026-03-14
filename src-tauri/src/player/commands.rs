use tauri::{AppHandle, State};
use crate::error::Result;
use crate::state::AppState;
use super::eq_profiles::{self, EqProfiles, PRESETS};
use super::thumbnails;

#[tauri::command]
pub async fn get_eq_profiles(state: State<'_, AppState>) -> Result<EqProfiles> {
    let paths = state.data_paths.read().await;
    Ok(eq_profiles::load(&paths.app_data))
}

#[tauri::command]
pub async fn save_eq_profile(
    name: String,
    gains: Vec<f32>,
    state: State<'_, AppState>,
) -> Result<()> {
    let paths = state.data_paths.read().await;
    let mut profiles = eq_profiles::load(&paths.app_data);
    profiles.0.insert(name, gains);
    eq_profiles::save(&paths.app_data, &profiles)
}

#[tauri::command]
pub async fn delete_eq_profile(
    name: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let paths = state.data_paths.read().await;
    let mut profiles = eq_profiles::load(&paths.app_data);
    profiles.0.remove(&name);
    eq_profiles::save(&paths.app_data, &profiles)
}

#[tauri::command]
pub fn get_eq_presets() -> Vec<serde_json::Value> {
    PRESETS.iter().map(|(name, gains)| {
        serde_json::json!({ "name": name, "gains": gains })
    }).collect()
}

#[tauri::command]
pub async fn fetch_thumbnail(
    video_id: String,
    thumbnail_url: String,
    state: State<'_, AppState>,
) -> Result<String> {
    let paths = state.data_paths.read().await;
    let path = thumbnails::fetch_and_cache(
        &state.http_client,
        &paths.thumbnails,
        &video_id,
        &thumbnail_url,
    ).await?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_thumbnail_path(
    video_id: String,
    state: State<'_, AppState>,
) -> Result<Option<String>> {
    let paths = state.data_paths.read().await;
    Ok(thumbnails::get_cached(&paths.thumbnails, &video_id)
        .map(|p| p.to_string_lossy().to_string()))
}
