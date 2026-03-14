import { useEffect, useState } from "react";
import { useUiStore } from "../../store/uiStore";
import { getFolderInfo, deleteFolderContents } from "../../lib/tauriCommands";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { FolderInfo } from "../../types";

const FOLDER_KEYS: Record<string, string> = {
  "Raw Videos": "raw_video",
  "Ripped Audio (MP3s)": "raw_audio",
  "Music Library": "music_library",
  "Processed Exports": "processed",
};

export default function FolderManagerDialog() {
  const { setFolderManagerOpen } = useUiStore();
  const [folders, setFolders] = useState<FolderInfo[]>([]);

  useEffect(() => { getFolderInfo().then(setFolders); }, []);

  async function handleDelete(label: string) {
    const key = FOLDER_KEYS[label] ?? label;
    if (!confirm(`Delete all files in "${label}"?`)) return;
    await deleteFolderContents(key);
    getFolderInfo().then(setFolders);
  }

  async function handleOpen(path: string) {
    await openUrl(`file://${path}`).catch(() => {});
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-panel border border-border rounded-lg w-[480px] p-6">
        <h2 className="text-base font-semibold mb-4">Folder Manager</h2>
        <div className="flex flex-col gap-2">
          {folders.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-3 p-2 rounded hover:bg-panel/50 cursor-pointer group"
              onClick={() => handleOpen(f.path)}
            >
              <span className="text-sm flex-1">{f.label}</span>
              <span className="text-xs text-muted">{f.file_count} files</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(f.label); }}
                className="text-danger opacity-0 group-hover:opacity-100 px-2 text-sm transition-opacity hover:text-red-300"
              >✕</button>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={() => setFolderManagerOpen(false)} className="px-4 py-1.5 text-sm text-muted hover:text-text">Close</button>
        </div>
      </div>
    </div>
  );
}
