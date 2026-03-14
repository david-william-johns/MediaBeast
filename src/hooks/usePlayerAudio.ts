import { useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { audioEngine } from "../lib/audioEngine";
import { usePlayerStore } from "../store/playerStore";

export function usePlayerAudio() {
  const {
    playlist, currentIndex, volume, eqGains,
    setIsPlaying, setCurrentTime, setDuration, setCurrentIndex,
  } = usePlayerStore();

  const lastIndexRef = useRef<number>(-1);

  // Wire audioEngine callbacks once
  useEffect(() => {
    audioEngine.onTimeUpdateCallback((t) => setCurrentTime(t));
    audioEngine.onEndedCallback(() => {
      const store = usePlayerStore.getState();
      const next = store.currentIndex + 1;
      if (next < store.playlist.length) {
        store.setCurrentIndex(next);
      } else {
        setIsPlaying(false);
      }
    });
    audioEngine.resumeOnInteraction();
  }, []);

  // Load new track when index or playlist changes
  useEffect(() => {
    const track = playlist[currentIndex];
    if (!track || currentIndex === lastIndexRef.current) return;
    lastIndexRef.current = currentIndex;

    const url = convertFileSrc(track.filePath);
    audioEngine.crossfadeTo(url, (duration) => {
      setDuration(duration);
      setIsPlaying(true);
    });
  }, [currentIndex, playlist]);

  // Volume changes
  useEffect(() => { audioEngine.setVolume(volume); }, [volume]);

  // EQ changes
  useEffect(() => { audioEngine.setAllEqBands(eqGains); }, [eqGains]);
}
