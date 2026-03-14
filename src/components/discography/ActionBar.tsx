import { useDiscographyStore } from "../../store/discographyStore";
import { useUiStore } from "../../store/uiStore";
import { usePlayerStore } from "../../store/playerStore";
import { useAnalyserStore } from "../../store/analyserStore";
import {
  startDownload, exportUrls, savePreviousResults, getPreviousResults,
} from "../../lib/tauriCommands";
import type { PlaylistTrack, PreviousResult } from "../../types";

export default function ActionBar() {
  const { tracks, clearTicked, clearUnticked, clearAll, previousResults, showPreviousResults } = useDiscographyStore();
  const { setActiveTab } = useUiStore();
  const setPlayerPlaylist = usePlayerStore((s) => s.setPlaylist);
  const setAnalyserPlaylist = useAnalyserStore((s) => s.setPlaylist);

  const selectedTracks = tracks.filter((t) => t.selected && t.youtubeUrl);
  const readyTracks = selectedTracks.filter((t) => t.localPath || t.downloadStatus === "done");
  const hasDownloadable = selectedTracks.some((t) => t.downloadStatus === "idle" || t.downloadStatus === "cancelled" || t.downloadStatus === "error");

  async function handleDownload() {
    const toDownload = selectedTracks.filter((t) =>
      ["idle", "cancelled", "error"].includes(t.downloadStatus) && t.youtubeUrl
    );
    for (const t of toDownload) {
      await startDownload(t.id, t.youtubeUrl!, t.selectedQuality, t.title, t.artist);
    }
  }

  async function handleExport() {
    const urls = selectedTracks.map((t) => t.youtubeUrl).filter(Boolean) as string[];
    if (!urls.length) return;
    await exportUrls(urls);
  }

  function buildPlaylist(): PlaylistTrack[] {
    return readyTracks.map((t) => ({
      title: t.title,
      artist: t.artist,
      album: t.album,
      year: t.year,
      runtime: t.runtime,
      filePath: t.localPath!,
      thumbnailUrl: t.thumbnailUrl,
      videoId: t.videoId,
    }));
  }

  function launchPlayer() {
    const pl = buildPlaylist();
    if (!pl.length) return;
    setPlayerPlaylist(pl);
    setActiveTab("player");
  }

  function launchAnalyser() {
    const pl = buildPlaylist();
    if (!pl.length) return;
    setAnalyserPlaylist(pl);
    setActiveTab("analyser");
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface border-t border-border shrink-0 flex-wrap">
      <button
        onClick={handleDownload}
        disabled={!hasDownloadable}
        className="px-4 py-1.5 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Download
      </button>
      <button
        onClick={handleExport}
        disabled={!selectedTracks.length}
        className="px-3 py-1.5 text-sm text-text hover:bg-panel rounded border border-border disabled:opacity-40 transition-colors"
      >
        Export URLs
      </button>
      <button
        onClick={launchPlayer}
        disabled={!readyTracks.length}
        title="Open in Player"
        className="px-3 py-1.5 text-sm text-text hover:bg-panel rounded border border-border disabled:opacity-40 transition-colors"
      >
        ▶ Player
      </button>
      <button
        onClick={launchAnalyser}
        disabled={!readyTracks.length}
        title="Open in Wave Analyser"
        className="px-3 py-1.5 text-sm text-text hover:bg-panel rounded border border-border disabled:opacity-40 transition-colors"
      >
        ∿ Analyser
      </button>
      <div className="flex-1" />
      <button onClick={clearTicked} className="px-2 py-1 text-xs text-muted hover:text-text">Clear ✓</button>
      <button onClick={clearUnticked} className="px-2 py-1 text-xs text-muted hover:text-text">Clear ✗</button>
      <button onClick={clearAll} className="px-2 py-1 text-xs text-muted hover:text-danger">Clear All</button>
    </div>
  );
}
