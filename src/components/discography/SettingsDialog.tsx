import { useEffect, useState } from "react";
import { useUiStore } from "../../store/uiStore";
import { getDataPaths, saveDataPaths } from "../../lib/tauriCommands";
import type { DataPaths } from "../../types";
import { open } from "@tauri-apps/plugin-dialog";

export default function SettingsDialog() {
  const { setSettingsOpen, setDataPaths: setStorePaths, dataPaths } = useUiStore();
  const [paths, setPaths] = useState<DataPaths | null>(dataPaths);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getDataPaths().then((p) => { setPaths(p); setStorePaths(p); });
  }, []);

  function update(key: keyof DataPaths, value: string) {
    setPaths((prev) => prev ? { ...prev, [key]: value } : prev);
    setDirty(true);
    setSaved(false);
  }

  async function browse(key: keyof DataPaths) {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") update(key, selected);
  }

  async function save() {
    if (!paths) return;
    await saveDataPaths(paths);
    setStorePaths(paths);
    setDirty(false);
    setSaved(true);
  }

  if (!paths) return null;

  const fields: { key: keyof DataPaths; label: string }[] = [
    { key: "raw_video", label: "Raw Videos" },
    { key: "raw_audio", label: "Ripped Audio (MP3s)" },
    { key: "music_library", label: "Music Library" },
    { key: "processed", label: "Processed Exports" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-panel border border-border rounded-lg w-[600px] p-6">
        <h2 className="text-base font-semibold mb-4">Settings — Output Directories</h2>
        <div className="flex flex-col gap-3">
          {fields.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-40 text-sm text-muted shrink-0">{label}</span>
              <input
                readOnly
                value={(paths as any)[key]}
                className="flex-1 bg-bg border border-border rounded px-2 py-1 text-sm text-text"
              />
              <button
                onClick={() => browse(key)}
                className="px-2 py-1 text-sm bg-panel border border-border rounded hover:bg-accent hover:text-white"
              >📂</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={() => setSettingsOpen(false)} className="px-4 py-1.5 text-sm text-muted hover:text-text">Cancel</button>
          <button
            onClick={save}
            className={`px-4 py-1.5 text-sm text-white rounded transition-colors ${saved ? "bg-success" : dirty ? "bg-danger" : "bg-panel border border-border text-muted"}`}
          >
            {saved ? "Saved ✓" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
