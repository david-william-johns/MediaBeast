use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use crate::error::Result;

pub type EqProfile = Vec<f32>; // 10 gain values in dB

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EqProfiles(pub HashMap<String, EqProfile>);

pub const PRESETS: &[(&str, [f32; 10])] = &[
    ("Flat",      [0.0, 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0]),
    ("Rock",      [4.0, 3.0,  0.0, -1.0, -2.0,  0.0,  2.0,  4.0,  4.0,  4.0]),
    ("Pop",       [-2.0, 0.0, 2.0,  4.0,  4.0,  2.0,  0.0, -2.0, -2.0, -2.0]),
    ("Jazz",      [3.0, 2.0,  0.0,  2.0,  0.0,  0.0,  0.0,  2.0,  3.0,  3.0]),
    ("Classical", [4.0, 3.0,  0.0,  0.0,  0.0,  0.0,  0.0,  3.0,  4.0,  4.0]),
];

fn profiles_path(app_data: &Path) -> std::path::PathBuf {
    app_data.join("Output").join("eq_profiles.json")
}

pub fn load(app_data: &Path) -> EqProfiles {
    let path = profiles_path(app_data);
    if path.exists() {
        if let Ok(text) = std::fs::read_to_string(&path) {
            if let Ok(p) = serde_json::from_str(&text) {
                return p;
            }
        }
    }
    EqProfiles::default()
}

pub fn save(app_data: &Path, profiles: &EqProfiles) -> Result<()> {
    let path = profiles_path(app_data);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&path, serde_json::to_string_pretty(profiles)?)?;
    Ok(())
}
