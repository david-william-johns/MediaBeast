use std::path::{Path, PathBuf};
use crate::state::DataPaths;

const PATHS_FILE: &str = "data_paths.json";

pub fn load_paths(app_data: &Path) -> DataPaths {
    let config_file = app_data.join(PATHS_FILE);
    if config_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_file) {
            if let Ok(paths) = serde_json::from_str::<DataPaths>(&content) {
                return paths;
            }
        }
    }
    DataPaths::default_for(app_data.to_path_buf())
}

pub fn save_paths(app_data: &Path, paths: &DataPaths) -> crate::error::Result<()> {
    let config_file = app_data.join(PATHS_FILE);
    let json = serde_json::to_string_pretty(paths)?;
    std::fs::write(config_file, json)?;
    Ok(())
}

/// Try to find and migrate data from the old Python app location
pub fn migrate_legacy_data(app_data: &Path) {
    let marker = app_data.join(".migrated");
    if marker.exists() {
        return;
    }

    let legacy_candidates = [
        PathBuf::from(r"D:\ClaudeCode_Projects\P04_ArtistDiscography\Output"),
    ];

    for legacy in &legacy_candidates {
        if !legacy.exists() {
            continue;
        }
        let dest_output = app_data.join("Output");
        let _ = std::fs::create_dir_all(&dest_output);

        for file in ["search_history.json", "previous_results.json"] {
            let src = legacy.join(file);
            let dst = dest_output.join(file);
            if src.exists() && !dst.exists() {
                let _ = std::fs::copy(&src, &dst);
            }
        }

        // EQ profiles in root of old project
        let eq_src = PathBuf::from(r"D:\ClaudeCode_Projects\P04_ArtistDiscography\Output\eq_profiles.json");
        let eq_dst = dest_output.join("eq_profiles.json");
        if eq_src.exists() && !eq_dst.exists() {
            let _ = std::fs::copy(&eq_src, &eq_dst);
        }

        break;
    }

    let _ = std::fs::write(marker, "1");
}
