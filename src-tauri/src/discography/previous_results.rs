use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::error::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviousResult {
    pub song: String,
    pub artist: String,
    pub album: String,
    pub year: String,
    pub runtime: String,
    pub quality: String,
    pub url: String,
    pub checked: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local_path: Option<String>,
}

fn path(app_data: &Path) -> std::path::PathBuf {
    app_data.join("Output").join("previous_results.json")
}

pub fn load(app_data: &Path) -> Vec<PreviousResult> {
    let p = path(app_data);
    if p.exists() {
        if let Ok(text) = std::fs::read_to_string(&p) {
            if let Ok(v) = serde_json::from_str(&text) {
                return v;
            }
        }
    }
    vec![]
}

pub fn save(app_data: &Path, results: &[PreviousResult]) -> Result<()> {
    let p = path(app_data);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&p, serde_json::to_string_pretty(results)?)?;
    Ok(())
}
