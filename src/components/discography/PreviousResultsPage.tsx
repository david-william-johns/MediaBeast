import { useDiscographyStore } from "../../store/discographyStore";
import { basename } from "../../lib/formatters";

export default function PreviousResultsPage() {
  const { previousResults, togglePreviousResult } = useDiscographyStore();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="grid text-xs text-muted px-3 py-1.5 bg-panel border-b border-border shrink-0"
        style={{ gridTemplateColumns: "2rem 1fr 5rem 1fr 1fr 4rem 5rem 1fr" }}
      >
        <span></span>
        <span>Title</span><span>Year</span><span>Artist</span><span>Album</span>
        <span>Length</span><span>Quality</span><span>File</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {previousResults.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            No previous results yet
          </div>
        ) : previousResults.map((r, i) => (
          <div
            key={i}
            onClick={() => togglePreviousResult(i)}
            className={[
              "grid items-center px-3 py-1.5 text-sm cursor-pointer border-b border-border/30 transition-colors",
              i % 2 === 0 ? "bg-surface" : "bg-bg",
              r.checked ? "!bg-accent/20" : "hover:bg-panel",
            ].join(" ")}
            style={{ gridTemplateColumns: "2rem 1fr 5rem 1fr 1fr 4rem 5rem 1fr" }}
          >
            <input
              type="checkbox"
              checked={r.checked}
              onChange={(e) => { e.stopPropagation(); togglePreviousResult(i); }}
              className="accent-accent"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="truncate pr-2" title={r.song}>{r.song}</span>
            <span className="text-muted">{r.year}</span>
            <span className="truncate pr-2" title={r.artist}>{r.artist}</span>
            <span className="truncate pr-2 text-muted" title={r.album}>{r.album}</span>
            <span className="text-muted">{r.runtime}</span>
            <span className="text-muted">{r.quality}</span>
            <span className="truncate text-muted text-xs" title={r.local_path ?? ""}>
              {r.local_path ? basename(r.local_path) : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
