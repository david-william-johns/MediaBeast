use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use crate::error::{AppError, Result};
use crate::state::AppState;

#[derive(Clone, Serialize, Deserialize)]
pub struct DownloadProgressEvent {
    pub job_id: String,
    pub percent: f32,
    pub phase: String, // "downloading" | "converting"
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DownloadCompleteEvent {
    pub job_id: String,
    pub local_path: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DownloadErrorEvent {
    pub job_id: String,
    pub message: String,
}

fn height_from_quality(quality: &str) -> u32 {
    quality.trim_end_matches('p').parse().unwrap_or(720)
}

/// Run ffmpeg to extract MP3 audio from a video file.
async fn extract_audio(
    app: &AppHandle,
    input: &std::path::Path,
    output: &std::path::Path,
    ffmpeg_path: &std::path::Path,
    on_progress: impl Fn(f32) + Send + 'static,
) -> Result<()> {
    // First get duration via ffprobe
    let shell = app.shell();
    let probe_out = shell
        .sidecar("ffprobe")
        .map_err(|e| AppError::FFmpeg(e.to_string()))?
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            input.to_str().unwrap_or(""),
        ])
        .output()
        .await
        .map_err(|e| AppError::FFmpeg(e.to_string()))?;

    let total_secs: f64 = {
        let json: serde_json::Value = serde_json::from_slice(&probe_out.stdout).unwrap_or_default();
        json["format"]["duration"].as_str()
            .and_then(|s| s.parse().ok())
            .unwrap_or(1.0)
    };

    let (mut rx, _child) = shell
        .sidecar("ffmpeg")
        .map_err(|e| AppError::FFmpeg(e.to_string()))?
        .args([
            "-i", input.to_str().unwrap_or(""),
            "-vn",
            "-codec:a", "libmp3lame",
            "-q:a", "0",
            "-progress", "pipe:1",
            "-nostats",
            "-y",
            output.to_str().unwrap_or(""),
        ])
        .spawn()
        .map_err(|e| AppError::FFmpeg(e.to_string()))?;

    let re = regex::Regex::new(r"out_time_ms=(\d+)").unwrap();

    while let Some(event) = rx.recv().await {
        use tauri_plugin_shell::process::CommandEvent;
        match event {
            CommandEvent::Stdout(line) => {
                let text = String::from_utf8_lossy(&line);
                if let Some(cap) = re.captures(&text) {
                    let ms: f64 = cap[1].parse().unwrap_or(0.0);
                    let pct = ((ms / 1_000_000.0) / total_secs * 100.0).min(100.0) as f32;
                    on_progress(pct);
                }
            }
            CommandEvent::Terminated(s) => {
                if !s.code.map(|c| c == 0).unwrap_or(false) {
                    return Err(AppError::FFmpeg("ffmpeg exited with error".into()));
                }
                break;
            }
            _ => {}
        }
    }

    Ok(())
}

/// Spawn a download job. Returns immediately; progress streamed via Tauri events.
pub fn spawn_download(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    job_id: String,
    url: String,
    quality: String,
    track_title: String,
    artist_name: String,
) {
    let semaphore = state.download_semaphore.clone();
    let tasks = state.download_tasks.clone();
    let data_paths = state.data_paths.clone();
    let app2 = app.clone();
    let job_id2 = job_id.clone();

    let (cancel_tx, cancel_rx) = tokio::sync::oneshot::channel::<()>();

    let handle = tokio::spawn(async move {
        let _permit = semaphore.acquire().await.unwrap();

        let paths = data_paths.read().await.clone();
        let height = height_from_quality(&quality);

        // Emit progress
        let emit_progress = {
            let app = app2.clone();
            let jid = job_id2.clone();
            move |pct: f32, phase: &str| {
                let _ = app.emit("download:progress", DownloadProgressEvent {
                    job_id: jid.clone(),
                    percent: pct,
                    phase: phase.to_string(),
                });
            }
        };

        let result = crate::discography::ytdlp::download_video(
            &app2,
            &url,
            &paths.raw_video,
            height,
            {
                let ep = emit_progress.clone();
                move |pct, phase| ep(pct, phase)
            },
            cancel_rx,
        ).await;

        match result {
            Err(AppError::Cancelled) => {
                let _ = app2.emit("download:cancelled", serde_json::json!({ "job_id": job_id2 }));
                return;
            }
            Err(e) => {
                let _ = app2.emit("download:error", DownloadErrorEvent {
                    job_id: job_id2.clone(),
                    message: e.to_string(),
                });
                return;
            }
            Ok(video_path) => {
                // Rip audio
                emit_progress(0.0, "converting");

                // Build output MP3 path
                let safe_name: String = format!("{} - {}", artist_name, track_title)
                    .chars()
                    .map(|c| if r#"\/:*?"<>|"#.contains(c) { '_' } else { c })
                    .collect();
                let mp3_path = paths.raw_audio.join(format!("{}.mp3", safe_name));
                let ffmpeg_path = app2.path().resource_dir()
                    .unwrap_or_default()
                    .join("ffmpeg.exe");

                let app3 = app2.clone();
                let jid3 = job_id2.clone();
                let ep2 = emit_progress.clone();
                let rip_result = extract_audio(
                    &app2,
                    &video_path,
                    &mp3_path,
                    &ffmpeg_path,
                    move |pct| ep2(pct, "converting"),
                ).await;

                match rip_result {
                    Ok(()) => {
                        // Move video to Ripped_Video
                        let dest = paths.ripped_video.join(video_path.file_name().unwrap_or_default());
                        let _ = std::fs::rename(&video_path, &dest);

                        let _ = app3.emit("download:complete", DownloadCompleteEvent {
                            job_id: jid3,
                            local_path: mp3_path.to_string_lossy().to_string(),
                        });
                    }
                    Err(e) => {
                        let _ = app3.emit("download:error", DownloadErrorEvent {
                            job_id: jid3,
                            message: e.to_string(),
                        });
                    }
                }
            }
        }

        // Remove from active tasks
        tasks.lock().await.remove(&job_id2);
    });

    let abort_handle = handle.abort_handle();

    // Store handles (fire-and-forget insertion)
    let tasks2 = state.download_tasks.clone();
    let jid = job_id.clone();
    tokio::spawn(async move {
        tasks2.lock().await.insert(jid, crate::state::DownloadHandles {
            abort: abort_handle,
            cancel_tx,
        });
    });
}
