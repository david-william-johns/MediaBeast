use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;
use crate::error::{AppError, Result};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YoutubeResult {
    pub url: String,
    pub video_id: String,
    pub title: String,
    pub runtime: String,
    pub qualities: Vec<String>,
    pub thumbnail_url: String,
}

fn parse_duration(secs: u64) -> String {
    format!("{}:{:02}", secs / 60, secs % 60)
}

fn score_title(title: &str) -> i32 {
    let t = title.to_lowercase();
    if t.contains("official music video") { 3 }
    else if t.contains("official video") { 2 }
    else if t.contains("official") { 1 }
    else { 0 }
}

fn sidecar_path(app: &AppHandle, name: &str) -> std::path::PathBuf {
    app.path().resource_dir()
        .unwrap_or_default()
        .join(format!("{}.exe", name))
}

/// Search YouTube for a track and return the best match with quality info.
pub async fn search_youtube(
    app: &AppHandle,
    track_title: &str,
    artist: &str,
) -> Result<YoutubeResult> {
    let query = format!("ytsearch5:{} {} Official Music Video", track_title, artist);
    let ffmpeg = sidecar_path(app, "ffmpeg");

    let shell = app.shell();
    let output = shell
        .sidecar("yt-dlp")
        .map_err(|e| AppError::YouTube(e.to_string()))?
        .args([
            "--dump-json",
            "--no-playlist",
            "--ffmpeg-location", ffmpeg.to_str().unwrap_or("ffmpeg"),
            "--flat-playlist",
            &query,
        ])
        .output()
        .await
        .map_err(|e| AppError::YouTube(e.to_string()))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::YouTube(stderr.to_string()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    #[derive(Deserialize)]
    struct Entry {
        id: String,
        title: String,
        #[serde(default)]
        duration: Option<u64>,
        #[serde(default)]
        formats: Option<Vec<Format>>,
    }

    #[derive(Deserialize)]
    struct Format {
        #[serde(default)]
        height: Option<u64>,
        #[serde(default)]
        vcodec: Option<String>,
    }

    let mut best: Option<(i32, Entry)> = None;
    for line in stdout.lines() {
        if let Ok(entry) = serde_json::from_str::<Entry>(line) {
            let score = score_title(&entry.title);
            if best.as_ref().map_or(true, |(s, _)| score > *s) {
                best = Some((score, entry));
            }
        }
    }

    let (_, entry) = best.ok_or_else(|| AppError::YouTube("No results found".into()))?;

    // Fetch format info for quality detection
    let video_url = format!("https://www.youtube.com/watch?v={}", entry.id);
    let qualities = fetch_qualities(app, &video_url).await.unwrap_or_default();

    let thumbnail_url = format!("https://img.youtube.com/vi/{}/mqdefault.jpg", entry.id);
    let runtime = entry.duration.map(parse_duration).unwrap_or_default();

    Ok(YoutubeResult {
        url: video_url,
        video_id: entry.id,
        title: entry.title,
        runtime,
        qualities,
        thumbnail_url,
    })
}

async fn fetch_qualities(app: &AppHandle, url: &str) -> Result<Vec<String>> {
    let shell = app.shell();
    let output = shell
        .sidecar("yt-dlp")
        .map_err(|e| AppError::YouTube(e.to_string()))?
        .args(["--list-formats", "--no-playlist", url])
        .output()
        .await
        .map_err(|e| AppError::YouTube(e.to_string()))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let re = regex::Regex::new(r"(\d{3,4})p").unwrap();
    let mut seen = std::collections::BTreeSet::new();

    for cap in re.captures_iter(&stdout) {
        seen.insert(cap[1].parse::<u32>().unwrap_or(0));
    }

    let mut qualities: Vec<String> = seen.into_iter().rev()
        .map(|h| format!("{}p", h))
        .collect();

    if qualities.is_empty() {
        qualities.push("720p".into());
    }

    Ok(qualities)
}

/// Download a video from YouTube at a specific quality, returning the output file path.
/// Streams progress events via the on_progress callback.
pub async fn download_video(
    app: &AppHandle,
    url: &str,
    output_dir: &std::path::Path,
    height: u32,
    on_progress: impl Fn(f32, &str) + Send + 'static,
    cancel_rx: tokio::sync::oneshot::Receiver<()>,
) -> Result<std::path::PathBuf> {
    let ffmpeg = sidecar_path(app, "ffmpeg");
    let format = format!(
        "bestvideo[height={}]+bestaudio/bestvideo[height<={}]+bestaudio/best",
        height, height
    );
    let out_template = output_dir.join("%(title)s.%(ext)s").to_string_lossy().to_string();

    let shell = app.shell();
    let (mut rx, child) = shell
        .sidecar("yt-dlp")
        .map_err(|e| AppError::YouTube(e.to_string()))?
        .args([
            "--newline",
            "--no-playlist",
            "--ffmpeg-location", ffmpeg.to_str().unwrap_or("ffmpeg"),
            "-f", &format,
            "-o", &out_template,
            "--print", "after_move:filepath",
            url,
        ])
        .spawn()
        .map_err(|e| AppError::YouTube(e.to_string()))?;

    // Parse progress and wait for completion
    let re = regex::Regex::new(r"\[download\]\s+([\d.]+)%").unwrap();
    let mut output_path: Option<String> = None;

    let cancel_fut = cancel_rx;
    tokio::pin!(cancel_fut);

    loop {
        tokio::select! {
            event = rx.recv() => {
                match event {
                    Some(tauri_plugin_shell::process::CommandEvent::Stdout(line)) => {
                        let text = String::from_utf8_lossy(&line);
                        if let Some(cap) = re.captures(&text) {
                            let pct: f32 = cap[1].parse().unwrap_or(0.0);
                            on_progress(pct, "downloading");
                        } else if text.trim().ends_with(".mp4") || text.trim().ends_with(".webm") || text.trim().ends_with(".mkv") {
                            output_path = Some(text.trim().to_string());
                        }
                    }
                    Some(tauri_plugin_shell::process::CommandEvent::Stderr(line)) => {
                        let _ = line; // ignore stderr
                    }
                    Some(tauri_plugin_shell::process::CommandEvent::Terminated(status)) => {
                        if !status.code.map(|c| c == 0).unwrap_or(false) {
                            return Err(AppError::YouTube("yt-dlp exited with error".into()));
                        }
                        break;
                    }
                    None => break,
                    _ => {}
                }
            }
            _ = &mut cancel_fut => {
                let _ = child.kill();
                return Err(AppError::Cancelled);
            }
        }
    }

    // If --print didn't give us the path, find the newest file in output_dir
    let path = if let Some(p) = output_path {
        std::path::PathBuf::from(p)
    } else {
        find_newest_media(output_dir)?
    };

    Ok(path)
}

fn find_newest_media(dir: &std::path::Path) -> Result<std::path::PathBuf> {
    let exts = ["mp4", "webm", "mkv"];
    let mut newest: Option<(std::time::SystemTime, std::path::PathBuf)> = None;

    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().map_or(false, |e| exts.contains(&e.to_str().unwrap_or(""))) {
            if let Ok(meta) = entry.metadata() {
                let mtime = meta.modified().unwrap_or(std::time::UNIX_EPOCH);
                if newest.as_ref().map_or(true, |(t, _)| mtime > *t) {
                    newest = Some((mtime, path));
                }
            }
        }
    }

    newest.map(|(_, p)| p)
        .ok_or_else(|| AppError::NotFound("Downloaded file not found".into()))
}
