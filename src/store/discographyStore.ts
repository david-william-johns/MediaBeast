import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Track, PreviousResult, SearchHistory } from "../types";
import { formatDuration } from "../lib/formatters";
import { qualityToHeight } from "../lib/constants";

interface DiscographyStore {
  mode: "discography" | "song_title";
  query: string;
  isSearching: boolean;
  isFetchingUrls: boolean;
  tracks: Track[];
  previousResults: PreviousResult[];
  showPreviousResults: boolean;
  history: SearchHistory;

  setMode: (mode: "discography" | "song_title") => void;
  setQuery: (q: string) => void;
  setSearching: (v: boolean) => void;
  setFetchingUrls: (v: boolean) => void;
  setTracks: (tracks: Track[]) => void;
  updateTrack: (id: string, patch: Partial<Track>) => void;
  toggleSelected: (id: string) => void;
  selectAll: (value: boolean) => void;
  clearTicked: () => void;
  clearUnticked: () => void;
  clearAll: () => void;
  setPreviousResults: (results: PreviousResult[]) => void;
  togglePreviousResult: (index: number) => void;
  setShowPreviousResults: (v: boolean) => void;
  setHistory: (h: SearchHistory) => void;
}

export const useDiscographyStore = create<DiscographyStore>()(
  immer((set) => ({
    mode: "discography",
    query: "",
    isSearching: false,
    isFetchingUrls: false,
    tracks: [],
    previousResults: [],
    showPreviousResults: false,
    history: { discography: [], song_title: [] },

    setMode: (mode) => set((s) => { s.mode = mode; }),
    setQuery: (q) => set((s) => { s.query = q; }),
    setSearching: (v) => set((s) => { s.isSearching = v; }),
    setFetchingUrls: (v) => set((s) => { s.isFetchingUrls = v; }),

    setTracks: (tracks) => set((s) => { s.tracks = tracks; }),

    updateTrack: (id, patch) => set((s) => {
      const t = s.tracks.find((t) => t.id === id);
      if (t) Object.assign(t, patch);
    }),

    toggleSelected: (id) => set((s) => {
      const t = s.tracks.find((t) => t.id === id);
      if (t && t.youtubeUrl) t.selected = !t.selected;
    }),

    selectAll: (value) => set((s) => {
      s.tracks.forEach((t) => { if (t.youtubeUrl) t.selected = value; });
    }),

    clearTicked: () => set((s) => { s.tracks = s.tracks.filter((t) => !t.selected); }),
    clearUnticked: () => set((s) => { s.tracks = s.tracks.filter((t) => t.selected); }),
    clearAll: () => set((s) => { s.tracks = []; }),

    setPreviousResults: (results) => set((s) => { s.previousResults = results; }),
    togglePreviousResult: (index) => set((s) => {
      if (s.previousResults[index]) {
        s.previousResults[index].checked = !s.previousResults[index].checked;
      }
    }),

    setShowPreviousResults: (v) => set((s) => { s.showPreviousResults = v; }),
    setHistory: (h) => set((s) => { s.history = h; }),
  }))
);
