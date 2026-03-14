import { useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAnalyserStore } from "../../store/analyserStore";
import { useWaveSurfer } from "../../hooks/useWaveSurfer";
import { decodeWaveform, listAudioFiles } from "../../lib/tauriCommands";
import { formatSeconds } from "../../lib/formatters";
import { basename } from "../../lib/formatters";
import ZoomControls from "./ZoomControls";
import EditToolbar from "./EditToolbar";
import type { PlaylistTrack } from "../../types";

export default function AnalyserPanel() {
  const containerRef = useRef<HTMLDivElement>(null!);
  const { wsRef } = useWaveSurfer(containerRef);

  const {
    playlist, currentIndex, isPlaying, currentTime, duration,
    region, loopEnabled, zoom, verticalZoom,
    setCurrentIndex, setIsPlaying, setZoom, toggleLoop,
    setPlaylist, setLoading, setWaveformData,
  } = useAnalyserStore();

  const track = playlist[currentIndex] ?? null;

  // Standalone mode
  useEffect(() => {
    if (playlist.length === 0) {
      listAudioFiles().then((files) => {
        setPlaylist(files.map((fp) => ({
          title: basename(fp).replace(/\.mp3$/i, ""),
          artist: "", album: "", year: "", runtime: "",
          filePath: fp, thumbnailUrl: null, videoId: null,
        })));
      });
    }
  }, []);

  // Load track into WaveSurfer when index changes
  useEffect(() => {
    if (!track || !wsRef.current) return;
    const ws = wsRef.current;
    const url = convertFileSrc(track.filePath);
    setLoading(true);
    ws.load(url).then(() => setLoading(false)).catch(() => setLoading(false));
    // Pre-compute waveform peaks in background
    decodeWaveform(track.filePath).then(setWaveformData).catch(() => {});
  }, [currentIndex, playlist]);

  function togglePlay() {
    const ws = wsRef.current;
    if (!ws) return;
    if (isPlaying) { ws.pause(); setIsPlaying(false); }
    else { ws.play(); setIsPlaying(true); }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    wsRef.current?.seekTo(Number(e.target.value) / (duration || 1));
  }

  function skip(delta: number) {
    const ws = wsRef.current;
    if (!ws) return;
    const cur = ws.getCurrentTime();
    const dur = ws.getDuration();
    ws.seekTo(Math.max(0, Math.min(1, (cur + delta) / dur)));
  }

  return (
    <div className="flex flex-col h-full bg-bg overflow-hidden">
      {/* Info bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 bg-surface border-b border-border text-xs shrink-0">
        <span className="font-medium">{track?.title ?? "No track"}</span>
        {track?.artist && <span className="text-muted">{track.artist}</span>}
        {track?.album && <span className="text-muted">{track.album}</span>}
        {track?.year && <span className="text-muted">{track.year}</span>}
      </div>

      {/* Edit toolbar */}
      <EditToolbar />

      {/* Waveform */}
      <div className="flex-1 overflow-hidden px-2 py-1">
        <div ref={containerRef} className="wavesurfer-wrapper h-full" />
      </div>

      {/* Status bar */}
      <div className="px-3 py-1 text-xs text-muted bg-surface border-t border-border shrink-0 flex gap-4">
        <span>{formatSeconds(currentTime)} / {formatSeconds(duration)}</span>
        {region && <span>Selection: {formatSeconds(region.start)} — {formatSeconds(region.end)}</span>}
      </div>

      {/* Transport */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface border-t border-border shrink-0 flex-wrap">
        {/* Playlist nav */}
        <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} className="text-muted hover:text-text">⏮</button>
        <button onClick={() => skip(-10)} className="text-muted hover:text-text text-sm">⏪</button>
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center"
        >{isPlaying ? "⏸" : "▶"}</button>
        <button onClick={() => { wsRef.current?.stop(); setIsPlaying(false); }} className="text-muted hover:text-text">⏹</button>
        <button onClick={() => skip(10)} className="text-muted hover:text-text text-sm">⏩</button>
        <button onClick={() => setCurrentIndex(Math.min(playlist.length - 1, currentIndex + 1))} className="text-muted hover:text-text">⏭</button>

        <button
          onClick={toggleLoop}
          className={`text-sm px-2 py-0.5 rounded border transition-colors ${loopEnabled ? "border-accent text-accent" : "border-border text-muted"}`}
        >🔁</button>

        {/* Seek bar */}
        <input
          type="range" min={0} max={duration || 1} step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 accent-accent min-w-[100px]"
        />

        <ZoomControls />
      </div>
    </div>
  );
}
