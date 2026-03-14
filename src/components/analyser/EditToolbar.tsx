const TOOLS = ["Cut", "Copy", "Paste", "Silence", "Fade In", "Fade Out", "Normalize", "Reverse"];

export default function EditToolbar() {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-surface border-b border-border shrink-0">
      {TOOLS.map((tool) => (
        <button
          key={tool}
          title={`${tool} (coming soon)`}
          onClick={() => {}}
          className="px-2.5 py-1 text-xs text-muted border border-border rounded hover:bg-panel hover:text-text transition-colors"
        >
          {tool}
        </button>
      ))}
    </div>
  );
}
