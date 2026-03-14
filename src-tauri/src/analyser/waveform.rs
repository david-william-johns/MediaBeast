use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use crate::error::{AppError, Result};

const PEAKS_PER_SECOND: usize = 200; // Downsample rate for waveform display

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WaveformData {
    /// Downsampled peak pairs [min, max] per pixel column for left channel
    pub peaks_l: Vec<[f32; 2]>,
    /// Downsampled peak pairs [min, max] per pixel column for right channel
    pub peaks_r: Vec<[f32; 2]>,
    pub sample_rate: u32,
    pub duration_secs: f64,
    pub channels: u16,
}

fn cache_path(cache_dir: &Path, audio_path: &Path) -> PathBuf {
    let mut hasher = Sha256::new();
    hasher.update(audio_path.to_string_lossy().as_bytes());
    let hash = hex::encode(hasher.finalize());
    cache_dir.join(format!("{}.json", &hash[..16]))
}

pub fn load_cached(cache_dir: &Path, audio_path: &Path) -> Option<WaveformData> {
    let path = cache_path(cache_dir, audio_path);
    if path.exists() {
        if let Ok(text) = std::fs::read_to_string(&path) {
            if let Ok(data) = serde_json::from_str(&text) {
                return Some(data);
            }
        }
    }
    None
}

fn save_cache(cache_dir: &Path, audio_path: &Path, data: &WaveformData) {
    let _ = std::fs::create_dir_all(cache_dir);
    let path = cache_path(cache_dir, audio_path);
    if let Ok(json) = serde_json::to_string(data) {
        let _ = std::fs::write(path, json);
    }
}

pub fn decode(audio_path: &Path, cache_dir: &Path) -> Result<WaveformData> {
    // Check cache first
    if let Some(cached) = load_cached(cache_dir, audio_path) {
        return Ok(cached);
    }

    let file = std::fs::File::open(audio_path)
        .map_err(|e| AppError::WaveformDecode(e.to_string()))?;

    let mss = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = audio_path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let probed = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
        .map_err(|e| AppError::WaveformDecode(e.to_string()))?;

    let mut format = probed.format;
    let track = format.default_track()
        .ok_or_else(|| AppError::WaveformDecode("No audio track found".into()))?;

    let track_id = track.id;
    let sample_rate = track.codec_params.sample_rate.unwrap_or(44100);
    let channels = track.codec_params.channels.map(|c| c.count() as u16).unwrap_or(2);

    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| AppError::WaveformDecode(e.to_string()))?;

    let samples_per_pixel = (sample_rate as usize) / PEAKS_PER_SECOND;

    let mut all_l: Vec<f32> = Vec::new();
    let mut all_r: Vec<f32> = Vec::new();

    loop {
        let packet = match format.next_packet() {
            Ok(p) => p,
            Err(_) => break,
        };

        if packet.track_id() != track_id { continue; }

        let decoded = match decoder.decode(&packet) {
            Ok(d) => d,
            Err(_) => continue,
        };

        let spec = *decoded.spec();
        let n_frames = decoded.frames();
        let mut sample_buf = SampleBuffer::<f32>::new(n_frames as u64, spec);
        sample_buf.copy_interleaved_ref(decoded);
        let samples = sample_buf.samples();

        let ch = spec.channels.count();
        if ch == 0 { continue; }

        for frame in 0..n_frames {
            all_l.push(samples[frame * ch]);
            all_r.push(if ch > 1 { samples[frame * ch + 1] } else { samples[frame * ch] });
        }
    }

    let duration_secs = all_l.len() as f64 / sample_rate as f64;

    fn compute_peaks(samples: &[f32], samples_per_pixel: usize) -> Vec<[f32; 2]> {
        if samples_per_pixel == 0 { return vec![]; }
        samples.chunks(samples_per_pixel).map(|chunk| {
            let min = chunk.iter().cloned().fold(f32::INFINITY, f32::min);
            let max = chunk.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
            [min, max]
        }).collect()
    }

    let data = WaveformData {
        peaks_l: compute_peaks(&all_l, samples_per_pixel),
        peaks_r: compute_peaks(&all_r, samples_per_pixel),
        sample_rate,
        duration_secs,
        channels,
    };

    save_cache(cache_dir, audio_path, &data);
    Ok(data)
}
