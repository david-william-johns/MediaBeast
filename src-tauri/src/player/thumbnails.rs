use std::path::{Path, PathBuf};
use crate::error::{AppError, Result};

fn thumb_path(thumbnails_dir: &Path, video_id: &str) -> PathBuf {
    thumbnails_dir.join(format!("{}.jpg", video_id))
}

/// Fetch a YouTube thumbnail and cache it locally. Returns the local path.
pub async fn fetch_and_cache(
    client: &reqwest::Client,
    thumbnails_dir: &Path,
    video_id: &str,
    thumbnail_url: &str,
) -> Result<PathBuf> {
    let path = thumb_path(thumbnails_dir, video_id);
    if path.exists() {
        return Ok(path);
    }

    std::fs::create_dir_all(thumbnails_dir)?;

    let bytes = client
        .get(thumbnail_url)
        .send()
        .await
        .map_err(|e| AppError::Http(e.to_string()))?
        .bytes()
        .await
        .map_err(|e| AppError::Http(e.to_string()))?;

    std::fs::write(&path, &bytes)?;
    Ok(path)
}

/// Return cached thumbnail path if it exists, else None.
pub fn get_cached(thumbnails_dir: &Path, video_id: &str) -> Option<PathBuf> {
    let path = thumb_path(thumbnails_dir, video_id);
    if path.exists() { Some(path) } else { None }
}
