import { useDiscographyStore } from "../../store/discographyStore";
import { qualityColor } from "../../lib/constants";
import { startDownload, cancelDownload } from "../../lib/tauriCommands";
import type { Track } from "../../types";

const STATUS_COLORS: Record<string, string> = {
  done: "text-green-400",
  error: "text-red-400",
  cancelled: "text-yellow-500",
  downloading: "text-cyan",
  converting: "text-blue-400",
};

function QualityBadge({ track }: { track: Track }) {
  const { updateTrack } = useDiscographyStore();
  if (!track.qualities.length) return <span className="text-muted text-xs">—</span>;

  return (
    <select
      value={track.selectedQuality}
      onChange={(e) => updateTrack(track.id, { selectedQuality: e.target.value })}
      style={{ background: qualityColor(track.selectedQuality) }}
      className="text-xs text-white border-0 rounded px-1 py-0.5 cursor-pointer focus:outline-none"
    >
      {track.qualities.map((q) => (
        <option key={q} value={q} style={{ background: qualityColor(q) }}>{q}</option>
      ))}
    </select>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-panel rounded-full h-1.5">
      <div
        className="bg-accent h-1.5 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function ResultsTable() {
  const { tracks, toggleSelected, selectAll } = useDiscographyStore();
  const allSelected = tracks.filter((t) => t.youtubeUrl).every((t) => t.selected);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="grid text-xs text-muted px-3 py-1.5 bg-panel border-b border-border shrink-0"
        style={{ gridTemplateColumns: "2rem 1fr 5rem 1fr 1fr 4rem 5rem 8rem 3rem" }}
      >
        <input
          type="checkbox"
          checked={allSelected && tracks.length > 0}
          onChange={(e) => selectAll(e.target.checked)}
          className="accent-accent"
        />
        <span>Title</span>
        <span>Year</span>
        <span>Artist</span>
        <span>Album</span>
        <span>Length</span>
        <span>Quality</span>
        <span>Status</span>
        <span></span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            Search for an artist or song title to begin
          </div>
        ) : tracks.map((track, i) => (
          <div
            key={track.id}
            onClick={() => toggleSelected(track.id)}
            className={[
              "grid items-center px-3 py-1.5 text-sm cursor-pointer border-b border-border/30 transition-colors",
              i % 2 === 0 ? "bg-surface" : "bg-bg",
              track.selected ? "!bg-accent/20" : "hover:bg-panel",
            ].join(" ")}
            style={{ gridTemplateColumns: "2rem 1fr 5rem 1fr 1fr 4rem 5rem 8rem 3rem" }}
          >
            <input
              type="checkbox"
              checked={track.selected}
              disabled={!track.youtubeUrl}
              onChange={(e) => { e.stopPropagation(); toggleSelected(track.id); }}
              className="accent-accent"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="truncate pr-2" title={track.title}>{track.title}</span>
            <span className="text-muted">{track.year}</span>
            <span className="truncate pr-2" title={track.artist}>{track.artist}</span>
            <span className="truncate pr-2 text-muted" title={track.album}>{track.album}</span>
            <span className="text-muted">{track.runtime}</span>
            <span onClick={(e) => e.stopPropagation()}>
              <QualityBadge track={track} />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className={`text-xs ${STATUS_COLORS[track.downloadStatus] ?? "text-muted"}`}>
                {track.downloadStatus === "downloading" ? `${Math.round(track.downloadProgress)}%` :
                 track.downloadStatus === "converting" ? `Conv ${Math.round(track.downloadProgress)}%` :
                 track.downloadStatus === "idle" ? (track.youtubeUrl ? "Ready" : "No URL") :
                 track.downloadStatus}
              </span>
              {(track.downloadStatus === "downloading" || track.downloadStatus === "converting") && (
                <ProgressBar pct={track.downloadProgress} />
              )}
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              {(track.downloadStatus === "downloading" || track.downloadStatus === "converting") ? (
                <button
                  onClick={() => cancelDownload(track.id)}
                  className="text-danger hover:text-white text-xs px-1"
                  title="Cancel"
                >✕</button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Selection count */}
      <div className="px-3 py-1 text-xs text-cyan shrink-0 border-t border-border">
        {tracks.filter((t) => t.selected).length} selected
        {tracks.some((t) => t.youtubeUrl) && ` / ${tracks.filter((t) => t.youtubeUrl).length} with URL`}
      </div>
    </div>
  );
}
