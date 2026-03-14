import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { PlaylistTrack } from "../types";
import { BUILT_IN_PRESETS } from "../lib/constants";

interface PlayerStore {
  playlist: PlaylistTrack[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  eqGains: number[];
  activePreset: string;
  customProfiles: Record<string, number[]>;

  setPlaylist: (tracks: PlaylistTrack[]) => void;
  addToPlaylist: (tracks: PlaylistTrack[]) => void;
  setCurrentIndex: (i: number) => void;
  setIsPlaying: (v: boolean) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setVolume: (v: number) => void;
  setEqGains: (gains: number[]) => void;
  setEqBand: (index: number, gain: number) => void;
  setActivePreset: (name: string) => void;
  setCustomProfiles: (profiles: Record<string, number[]>) => void;
  applyPreset: (name: string) => void;
}

export const usePlayerStore = create<PlayerStore>()(
  immer((set) => ({
    playlist: [],
    currentIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    eqGains: new Array(10).fill(0),
    activePreset: "Flat",
    customProfiles: {},

    setPlaylist: (tracks) => set((s) => { s.playlist = tracks; s.currentIndex = 0; }),
    addToPlaylist: (tracks) => set((s) => { s.playlist.push(...tracks); }),
    setCurrentIndex: (i) => set((s) => { s.currentIndex = i; }),
    setIsPlaying: (v) => set((s) => { s.isPlaying = v; }),
    setCurrentTime: (t) => set((s) => { s.currentTime = t; }),
    setDuration: (d) => set((s) => { s.duration = d; }),
    setVolume: (v) => set((s) => { s.volume = v; }),
    setEqGains: (gains) => set((s) => { s.eqGains = gains; }),
    setEqBand: (index, gain) => set((s) => { s.eqGains[index] = gain; }),
    setActivePreset: (name) => set((s) => { s.activePreset = name; }),
    setCustomProfiles: (profiles) => set((s) => { s.customProfiles = profiles; }),
    applyPreset: (name) => set((s) => {
      const preset = BUILT_IN_PRESETS.find((p) => p.name === name);
      if (preset) {
        s.eqGains = [...preset.gains];
        s.activePreset = name;
      } else if (s.customProfiles[name]) {
        s.eqGains = [...s.customProfiles[name]];
        s.activePreset = name;
      }
    }),
  }))
);
