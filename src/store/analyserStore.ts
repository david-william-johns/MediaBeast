import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { PlaylistTrack, WaveformData } from "../types";

interface Region {
  start: number;
  end: number;
}

interface AnalyserStore {
  playlist: PlaylistTrack[];
  currentIndex: number;
  waveformData: WaveformData | null;
  isLoading: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  zoom: number;
  verticalZoom: number;
  region: Region | null;
  loopEnabled: boolean;

  setPlaylist: (tracks: PlaylistTrack[]) => void;
  setCurrentIndex: (i: number) => void;
  setWaveformData: (data: WaveformData | null) => void;
  setLoading: (v: boolean) => void;
  setIsPlaying: (v: boolean) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setZoom: (z: number) => void;
  setVerticalZoom: (v: number) => void;
  setRegion: (r: Region | null) => void;
  toggleLoop: () => void;
}

export const useAnalyserStore = create<AnalyserStore>()(
  immer((set) => ({
    playlist: [],
    currentIndex: 0,
    waveformData: null,
    isLoading: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    zoom: 50,
    verticalZoom: 1.0,
    region: null,
    loopEnabled: false,

    setPlaylist: (tracks) => set((s) => { s.playlist = tracks; }),
    setCurrentIndex: (i) => set((s) => { s.currentIndex = i; }),
    setWaveformData: (data) => set((s) => { s.waveformData = data; }),
    setLoading: (v) => set((s) => { s.isLoading = v; }),
    setIsPlaying: (v) => set((s) => { s.isPlaying = v; }),
    setCurrentTime: (t) => set((s) => { s.currentTime = t; }),
    setDuration: (d) => set((s) => { s.duration = d; }),
    setZoom: (z) => set((s) => { s.zoom = Math.max(10, Math.min(1000, z)); }),
    setVerticalZoom: (v) => set((s) => { s.verticalZoom = Math.max(0.1, Math.min(10, v)); }),
    setRegion: (r) => set((s) => { s.region = r; }),
    toggleLoop: () => set((s) => { s.loopEnabled = !s.loopEnabled; }),
  }))
);
