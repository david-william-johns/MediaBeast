use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock, Semaphore};

/// Handles for an active download job so we can cancel it cleanly
pub struct DownloadHandles {
    pub abort: tokio::task::AbortHandle,
    /// Channel to send a kill signal to the child process holder
    pub cancel_tx: tokio::sync::oneshot::Sender<()>,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct DataPaths {
    pub raw_audio: PathBuf,
    pub raw_video: PathBuf,
    pub ripped_video: PathBuf,
    pub music_library: PathBuf,
    pub thumbnails: PathBuf,
    pub waveform_cache: PathBuf,
    pub processed: PathBuf,
    pub app_data: PathBuf,
}

impl DataPaths {
    pub fn default_for(app_data: PathBuf) -> Self {
        let output = app_data.join("Output");
        let music_library = output.join("Music_Library");
        DataPaths {
            raw_audio: output.join("Raw_Audio"),
            raw_video: output.join("Raw_Video"),
            ripped_video: output.join("Ripped_Video"),
            thumbnails: music_library.join("thumbnails"),
            waveform_cache: output.join("waveform_cache"),
            processed: output.join("Processed"),
            music_library,
            app_data,
        }
    }

    pub fn ensure_dirs(&self) -> std::io::Result<()> {
        for dir in [
            &self.raw_audio,
            &self.raw_video,
            &self.ripped_video,
            &self.thumbnails,
            &self.waveform_cache,
            &self.processed,
        ] {
            std::fs::create_dir_all(dir)?;
        }
        Ok(())
    }
}

pub struct AppState {
    /// Limits concurrent downloads to 3
    pub download_semaphore: Arc<Semaphore>,
    /// Active download jobs keyed by job_id
    pub download_tasks: Arc<Mutex<HashMap<String, DownloadHandles>>>,
    /// Resolved output directory paths
    pub data_paths: Arc<RwLock<DataPaths>>,
    /// Shared HTTP client (connection pooling)
    pub http_client: reqwest::Client,
}

impl AppState {
    pub fn new(app_data: PathBuf) -> Self {
        let paths = DataPaths::default_for(app_data);
        let _ = paths.ensure_dirs();

        AppState {
            download_semaphore: Arc::new(Semaphore::new(3)),
            download_tasks: Arc::new(Mutex::new(HashMap::new())),
            data_paths: Arc::new(RwLock::new(paths)),
            http_client: reqwest::Client::builder()
                .user_agent("MediaBeast/1.0 (github.com/david-william-johns/MediaBeast)")
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .expect("Failed to build HTTP client"),
        }
    }
}
