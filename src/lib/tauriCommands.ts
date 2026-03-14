import { invoke } from "@tauri-apps/api/core";
import type {
  TrackRecord, YoutubeResult, SearchHistory,
  PreviousResult, WaveformData, DataPaths, FolderInfo, EqProfile,
} from "../types";

// Discography
export const searchArtist = (query: string) =>
  invoke<TrackRecord[]>("search_artist", { query });

export const searchSongTitle = (query: string) =>
  invoke<TrackRecord[]>("search_song_title", { query });

export const fetchYoutubeUrl = (trackId: string, trackTitle: string, artist: string) =>
  invoke<YoutubeResult>("fetch_youtube_url", { trackId, trackTitle, artist });

export const startDownload = (
  jobId: string, url: string, quality: string,
  trackTitle: string, artistName: string,
) => invoke<void>("start_download", { jobId, url, quality, trackTitle, artistName });

export const cancelDownload = (jobId: string) =>
  invoke<void>("cancel_download", { jobId });

export const getSearchHistory = () =>
  invoke<SearchHistory>("get_search_history");

export const getPreviousResults = () =>
  invoke<PreviousResult[]>("get_previous_results");

export const savePreviousResults = (results: PreviousResult[]) =>
  invoke<void>("save_previous_results", { results });

export const exportUrls = (urls: string[]) =>
  invoke<string>("export_urls", { urls });

// Player
export const getEqProfiles = () =>
  invoke<Record<string, number[]>>("get_eq_profiles");

export const saveEqProfile = (name: string, gains: number[]) =>
  invoke<void>("save_eq_profile", { name, gains });

export const deleteEqProfile = (name: string) =>
  invoke<void>("delete_eq_profile", { name });

export const getEqPresets = () =>
  invoke<{ name: string; gains: number[] }[]>("get_eq_presets");

export const fetchThumbnail = (videoId: string, thumbnailUrl: string) =>
  invoke<string>("fetch_thumbnail", { videoId, thumbnailUrl });

export const getThumbnailPath = (videoId: string) =>
  invoke<string | null>("get_thumbnail_path", { videoId });

// Analyser
export const decodeWaveform = (filePath: string) =>
  invoke<WaveformData>("decode_waveform", { filePath });

export const clearWaveformCache = () =>
  invoke<void>("clear_waveform_cache");

// File system
export const getFolderInfo = () =>
  invoke<FolderInfo[]>("get_folder_info");

export const deleteFolderContents = (folderKey: string) =>
  invoke<void>("delete_folder_contents", { folderKey });

export const getDataPaths = () =>
  invoke<DataPaths>("get_data_paths");

export const saveDataPaths = (newPaths: DataPaths) =>
  invoke<void>("save_data_paths", { newPaths });

export const listAudioFiles = () =>
  invoke<string[]>("list_audio_files");
