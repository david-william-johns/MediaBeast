import { useEffect, useState } from "react";
import { usePlayerStore } from "../../store/playerStore";
import { usePlayerAudio } from "../../hooks/usePlayerAudio";
import { audioEngine } from "../../lib/audioEngine";
import { getEqProfiles, listAudioFiles } from "../../lib/tauriCommands";
import { convertFileSrc } from "@tauri-apps/api/core";
import { basename, formatSeconds } from "../../lib/formatters";
import Equalizer from "./Equalizer";
import type { PlaylistTrack } from "../../types";

export default function PlayerPanel() {
  usePlayerAudio();

  const {
    playlist, currentIndex, isPlaying, currentTime, duration, volume,
    setCurrentIndex, setIsPlaying, setVolume, setCustomProfiles,
  } = usePlayerStore();

  const [showEq, setShowEq] = useState(false);
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);

  const track = playlist[currentIndex] ?? null;

  // Load standalone mode if no playlist provided
  useEffect(() => {
    if (playlist.length === 0) {
      listAudioFiles().then((files) => {
        const tracks: PlaylistTrack[] = files.map((fp) => ({
          title: basename(fp).replace(/\.mp3$/i, ""),
          artist: "", album: "", year: "", runtime: "",
          filePath: fp, thumbnailUrl: null, videoId: null,
        }));
        usePlayerStore.getState().setPlaylist(tracks);
      });
    }
    getEqProfiles().then((p) => setCustomProfiles(p));
  }, []);

  // Load thumbnail
  useEffect(() => {
    if (track?.thumbnailUrl) {
      setThumbnailSrc(track.thumbnailUrl);
    } else {
      setThumbnailSrc(null);
    }
  }, [track]);

  function togglePlay() {
    if (isPlaying) { audioEngine.pause(); setIsPlaying(false); }
    else { audioEngine.play(audioEngine.currentTime); setIsPlaying(true); }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    audioEngine.seek(Number(e.target.value));
  }

  return (
    <div className="flex w-full h-full bg-bg overflow-hidden">
      {/* Playlist sidebar */}
      <div className="w-64 shrink-0 flex flex-col border-r border-border bg-surface overflow-hidden">
        <div className="px-3 py-2 text-xs text-muted border-b border-border">Playlist ({playlist.length})</div>
        <div className="flex-1 overflow-y-auto">
          {playlist.map((t, i) => (
            <div
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={[
                "px-3 py-2 text-sm cursor-pointer border-b border-border/20 truncate transition-colors",
                i === currentIndex ? "bg-accent text-white" : "hover:bg-panel text-text",
              ].join(" ")}
              title={`${t.artist ? t.artist + " — " : ""}${t.title}`}
            >
              {i === currentIndex && isPlaying ? "▶ " : ""}
              {t.title}
              {t.artist && <span className={`text-xs ml-1 ${i === currentIndex ? "text-blue-200" : "text-muted"}`}>— {t.artist}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Main player */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        {/* Album art */}
        <div className="w-48 h-48 bg-panel rounded-lg flex items-center justify-center overflow-hidden border border-border">
          {thumbnailSrc
            ? <img src={thumbnailSrc} alt="Album art" className="w-full h-full object-cover" />
            : <span className="text-6xl text-muted">♪</span>}
        </div>

        {/* Track info */}
        <div className="text-center">
          <div className="text-base font-semibold truncate max-w-xs">{track?.title ?? "No track"}</div>
          <div className="text-sm text-muted">{track?.artist ?? ""}{track?.album ? ` — ${track.album}` : ""}</div>
        </div>

        {/* Seek bar */}
        <div className="w-full max-w-md flex items-center gap-2">
          <span className="text-xs text-muted w-10 text-right">{formatSeconds(currentTime)}</span>
          <input
            type="range" min={0} max={duration || 1} step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-accent"
          />
          <span className="text-xs text-muted w-10">{formatSeconds(duration)}</span>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            className="text-xl text-muted hover:text-text"
          >⏮</button>
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-accent hover:bg-accent-hover text-white text-xl flex items-center justify-center"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button
            onClick={() => setCurrentIndex(Math.min(playlist.length - 1, currentIndex + 1))}
            className="text-xl text-muted hover:text-text"
          >⏭</button>
        </div>

        {/* Volume + EQ toggle */}
        <div className="flex items-center gap-4 w-full max-w-md">
          <span className="text-xs text-muted">Vol</span>
          <input
            type="range" min={0} max={1} step={0.01}
            value={volume}
            onChange={(e) => { const v = Number(e.target.value); setVolume(v); audioEngine.setVolume(v); }}
            className="flex-1 accent-accent"
          />
          <button
            onClick={() => setShowEq(!showEq)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${showEq ? "border-accent text-accent" : "border-border text-muted hover:text-text"}`}
          >EQ</button>
        </div>

        {showEq && <Equalizer />}
      </div>
    </div>
  );
}
