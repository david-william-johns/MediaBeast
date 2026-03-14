import { useRef, useState } from "react";
import { useDiscographyStore } from "../../store/discographyStore";
import { useUiStore } from "../../store/uiStore";
import { searchArtist, searchSongTitle, fetchYoutubeUrl } from "../../lib/tauriCommands";
import type { Track } from "../../types";
function uuid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export default function SearchBar() {
  const {
    mode, setMode, query, setQuery, setSearching, setFetchingUrls,
    setTracks, history,
  } = useDiscographyStore();
  const { setStatus, setSettingsOpen, setFolderManagerOpen } = useUiStore();
  const [showHistory, setShowHistory] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);

  const historyList = mode === "discography" ? history.discography : history.song_title;

  async function runSearch() {
    if (!query.trim()) return;
    abortRef.current = false;
    setIsRunning(true);
    setSearching(true);
    setTracks([]);
    setStatus("Searching...", "info");

    try {
      const records = mode === "discography"
        ? await searchArtist(query.trim())
        : await searchSongTitle(query.trim());

      if (abortRef.current) return;

      const tracks: Track[] = records.map((r) => ({
        ...r,
        youtubeUrl: null,
        videoId: null,
        runtime: r.duration_ms ? `${Math.floor(r.duration_ms / 60000)}:${String(Math.floor((r.duration_ms % 60000) / 1000)).padStart(2, "0")}` : "",
        qualities: [],
        selectedQuality: "720p",
        downloadStatus: "idle",
        downloadProgress: 0,
        downloadPhase: "",
        localPath: null,
        thumbnailUrl: null,
        selected: false,
      }));

      setTracks(tracks);
      setSearching(false);
      setStatus(`Found ${tracks.length} tracks. Fetching YouTube URLs...`, "info");
      setFetchingUrls(true);

      // Fetch YouTube URLs in parallel batches of 3
      const batchSize = 3;
      for (let i = 0; i < tracks.length; i += batchSize) {
        if (abortRef.current) break;
        const batch = tracks.slice(i, i + batchSize);
        await Promise.all(batch.map(async (t) => {
          try {
            const result = await fetchYoutubeUrl(t.id, t.title, t.artist);
            useDiscographyStore.getState().updateTrack(t.id, {
              youtubeUrl: result.url,
              videoId: result.video_id,
              runtime: result.runtime || t.runtime,
              qualities: result.qualities,
              selectedQuality: result.qualities[0] ?? "720p",
              thumbnailUrl: result.thumbnail_url,
            });
          } catch {}
        }));
      }

      setFetchingUrls(false);
      setStatus(`Ready — ${tracks.length} tracks loaded`, "success");
    } catch (e: any) {
      setStatus(`Error: ${e}`, "error");
      setSearching(false);
      setFetchingUrls(false);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface border-b border-border shrink-0">
      {/* Settings */}
      <button
        onClick={() => setSettingsOpen(true)}
        title="Settings"
        className="text-muted hover:text-text px-2"
      >⚙</button>

      {/* Mode toggle */}
      <div className="flex gap-1 text-xs">
        {(["discography", "song_title"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-2 py-1 rounded transition-colors ${mode === m ? "bg-accent text-white" : "text-muted hover:text-text border border-border"}`}
          >
            {m === "discography" ? "Artist" : "Song Title"}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowHistory(true)}
          onBlur={() => setTimeout(() => setShowHistory(false), 150)}
          onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
          placeholder={mode === "discography" ? "Enter artist name…" : "Enter song title…"}
          className="w-full bg-panel border border-border rounded px-3 py-1.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent"
        />
        {showHistory && historyList.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-panel border border-border rounded shadow-lg z-50 mt-0.5 max-h-48 overflow-y-auto">
            {historyList.slice(0, 8).map((item) => (
              <div
                key={item}
                onMouseDown={() => { setQuery(item); setShowHistory(false); }}
                className="px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-white"
              >
                {item}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run / Abort */}
      <button
        onClick={isRunning ? () => { abortRef.current = true; setIsRunning(false); } : runSearch}
        className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
          isRunning
            ? "bg-danger hover:bg-danger-hover text-white"
            : "bg-accent hover:bg-accent-hover text-white"
        }`}
      >
        {isRunning ? "Abort" : "Search"}
      </button>

      {/* Folder manager */}
      <button
        onClick={() => setFolderManagerOpen(true)}
        title="Manage folders"
        className="text-muted hover:text-text px-2"
      >📂</button>
    </div>
  );
}
