use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::error::Result;

const MAX_HISTORY: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SearchHistory {
    pub discography: Vec<String>,
    pub song_title: Vec<String>,
}

fn history_path(app_data: &Path) -> std::path::PathBuf {
    app_data.join("Output").join("search_history.json")
}

pub fn load(app_data: &Path) -> SearchHistory {
    let path = history_path(app_data);
    if path.exists() {
        if let Ok(text) = std::fs::read_to_string(&path) {
            if let Ok(h) = serde_json::from_str(&text) {
                return h;
            }
        }
    }
    SearchHistory::default()
}

pub fn save(app_data: &Path, history: &SearchHistory) -> Result<()> {
    let path = history_path(app_data);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&path, serde_json::to_string_pretty(history)?)?;
    Ok(())
}

pub fn add_entry(history: &mut SearchHistory, mode: &str, query: &str) {
    let list = if mode == "song_title" { &mut history.song_title } else { &mut history.discography };
    list.retain(|s| s != query);
    list.insert(0, query.to_string());
    list.truncate(MAX_HISTORY);
}
