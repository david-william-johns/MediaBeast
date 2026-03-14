export interface TrackRecord {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  duration_ms: number | null;
}

export interface YoutubeResult {
  url: string;
  video_id: string;
  title: string;
  runtime: string;
  qualities: string[];
  thumbnail_url: string;
}

export type DownloadStatus =
  | "idle"
  | "fetching"
  | "pending"
  | "downloading"
  | "converting"
  | "done"
  | "error"
  | "cancelled";

export interface Track extends TrackRecord {
  youtubeUrl: string | null;
  videoId: string | null;
  runtime: string;
  qualities: string[];
  selectedQuality: string;
  downloadStatus: DownloadStatus;
  downloadProgress: number;
  downloadPhase: string;
  localPath: string | null;
  thumbnailUrl: string | null;
  selected: boolean;
}

export interface PreviousResult {
  song: string;
  artist: string;
  album: string;
  year: string;
  runtime: string;
  quality: string;
  url: string;
  checked: boolean;
  local_path?: string;
}

export interface SearchHistory {
  discography: string[];
  song_title: string[];
}

export interface PlaylistTrack {
  title: string;
  artist: string;
  album: string;
  year: string;
  runtime: string;
  filePath: string;
  thumbnailUrl: string | null;
  videoId: string | null;
}

export interface EqBandConfig {
  frequency: number;
  type: BiquadFilterType;
  Q: number;
}

export interface EqProfile {
  name: string;
  gains: number[];
}

export interface WaveformData {
  peaks_l: [number, number][];
  peaks_r: [number, number][];
  sample_rate: number;
  duration_secs: number;
  channels: number;
}

export interface DataPaths {
  raw_audio: string;
  raw_video: string;
  ripped_video: string;
  music_library: string;
  thumbnails: string;
  waveform_cache: string;
  processed: string;
  app_data: string;
}

export interface FolderInfo {
  label: string;
  path: string;
  file_count: number;
}

export type TabId = "discography" | "player" | "analyser";
