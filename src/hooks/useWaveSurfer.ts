import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAnalyserStore } from "../store/analyserStore";

export function useWaveSurfer(containerRef: React.RefObject<HTMLDivElement>) {
  const wsRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null);

  const { zoom, setCurrentTime, setDuration, setRegion, setIsPlaying } = useAnalyserStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const regions = RegionsPlugin.create();
    const timeline = TimelinePlugin.create({ height: 22 });

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#4a9eff",
      progressColor: "#1a5a8f",
      cursorColor: "#ef4444",
      cursorWidth: 2,
      height: 120,
      normalize: true,
      interact: true,
      minPxPerSec: zoom,
      splitChannels: [
        { waveColor: "#4a9eff", progressColor: "#1a5a8f", height: 80 },
        { waveColor: "#7ec8a0", progressColor: "#2d6a4f", height: 80 },
      ],
      plugins: [regions, timeline],
    });

    ws.on("timeupdate", (t) => setCurrentTime(t));
    ws.on("ready", (dur) => setDuration(dur));
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => {
      const store = useAnalyserStore.getState();
      if (store.loopEnabled) {
        ws.seekTo(0);
        ws.play();
      } else {
        const next = store.currentIndex + 1;
        if (next < store.playlist.length) {
          store.setCurrentIndex(next);
        } else {
          setIsPlaying(false);
        }
      }
    });

    // Drag selection
    regions.enableDragSelection({ color: "rgba(74, 222, 128, 0.15)" });
    regions.on("region-updated", (r: any) => setRegion({ start: r.start, end: r.end }));
    regions.on("region-created", (r: any) => setRegion({ start: r.start, end: r.end }));

    wsRef.current = ws;
    regionsRef.current = regions;

    return () => { ws.destroy(); };
  }, []);

  // Sync zoom — only call after audio is loaded (WaveSurfer throws otherwise)
  useEffect(() => {
    if (wsRef.current?.getDuration()) {
      wsRef.current.zoom(zoom);
    }
  }, [zoom]);

  return { wsRef, regionsRef };
}
