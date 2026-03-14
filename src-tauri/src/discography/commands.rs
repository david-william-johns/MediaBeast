use tauri::{AppHandle, State};
use crate::error::{AppError, Result};
use crate::state::AppState;
use super::{
    musicbrainz::{MusicBrainzClient, TrackRecord},
    ytdlp::{search_youtube, YoutubeResult},
    history::{self, SearchHistory},
    previous_results::{self, PreviousResult},
    download::spawn_download,
};

#[tauri::command]
pub async fn search_artist(
    query: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<Vec<TrackRecord>> {
    let client = MusicBrainzClient::new(state.http_client.clone());
    let (mbid, canonical) = client.find_artist(&query).await?;

    // Save history
    let paths = state.data_paths.read().await;
    let mut history = history::load(&paths.app_data);
    history::add_entry(&mut history, "discography", &query);
    let _ = history::save(&paths.app_data, &history);
    drop(paths);

    client.fetch_discography(&mbid, &canonical).await
}

#[tauri::command]
pub async fn search_song_title(
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<TrackRecord>> {
    let client = MusicBrainzClient::new(state.http_client.clone());

    let paths = state.data_paths.read().await;
    let mut history = history::load(&paths.app_data);
    history::add_entry(&mut history, "song_title", &query);
    let _ = history::save(&paths.app_data, &history);
    drop(paths);

    client.search_by_title(&query).await
}

#[tauri::command]
pub async fn fetch_youtube_url(
    track_id: String,
    track_title: String,
    artist: String,
    app: AppHandle,
) -> Result<YoutubeResult> {
    search_youtube(&app, &track_title, &artist).await
}

#[tauri::command]
pub async fn start_download(
    job_id: String,
    url: String,
    quality: String,
    track_title: String,
    artist_name: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<()> {
    spawn_download(app, state, job_id, url, quality, track_title, artist_name);
    Ok(())
}

#[tauri::command]
pub async fn cancel_download(
    job_id: String,
    state: State<'_, AppState>,
) -> Result<()> {
    let mut tasks = state.download_tasks.lock().await;
    if let Some(handles) = tasks.remove(&job_id) {
        let _ = handles.cancel_tx.send(());
        handles.abort.abort();
    }
    Ok(())
}

#[tauri::command]
pub async fn get_search_history(state: State<'_, AppState>) -> Result<SearchHistory> {
    let paths = state.data_paths.read().await;
    Ok(history::load(&paths.app_data))
}

#[tauri::command]
pub async fn get_previous_results(state: State<'_, AppState>) -> Result<Vec<PreviousResult>> {
    let paths = state.data_paths.read().await;
    Ok(previous_results::load(&paths.app_data))
}

#[tauri::command]
pub async fn save_previous_results(
    results: Vec<PreviousResult>,
    state: State<'_, AppState>,
) -> Result<()> {
    let paths = state.data_paths.read().await;
    previous_results::save(&paths.app_data, &results)
}

#[tauri::command]
pub async fn export_urls(
    urls: Vec<String>,
    state: State<'_, AppState>,
) -> Result<String> {
    let paths = state.data_paths.read().await;
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let filename = format!("urls_{}.txt", timestamp);
    let out_path = paths.processed.join(&filename);
    std::fs::create_dir_all(&paths.processed)?;
    std::fs::write(&out_path, urls.join("\n"))?;
    Ok(out_path.to_string_lossy().to_string())
}
