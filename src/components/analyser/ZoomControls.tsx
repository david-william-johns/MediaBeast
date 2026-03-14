import { useAnalyserStore } from "../../store/analyserStore";

export default function ZoomControls() {
  const { zoom, setZoom } = useAnalyserStore();

  return (
    <div className="flex items-center gap-1 ml-2">
      <span className="text-xs text-muted">Zoom</span>
      <button onClick={() => setZoom(zoom * 0.5)} className="px-2 py-0.5 text-xs border border-border rounded hover:bg-panel text-muted hover:text-text">−</button>
      <button onClick={() => setZoom(50)} className="px-2 py-0.5 text-xs border border-border rounded hover:bg-panel text-muted hover:text-text">=</button>
      <button onClick={() => setZoom(zoom * 2)} className="px-2 py-0.5 text-xs border border-border rounded hover:bg-panel text-muted hover:text-text">+</button>
      <input
        type="range" min={10} max={1000} step={5}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        className="w-20 accent-accent"
        title={`Zoom: ${zoom}px/s`}
      />
    </div>
  );
}
