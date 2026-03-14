import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useDiscographyStore } from "../store/discographyStore";
import { useUiStore } from "../store/uiStore";

interface ProgressPayload { job_id: string; percent: number; phase: string; }
interface CompletePayload { job_id: string; local_path: string; }
interface ErrorPayload { job_id: string; message: string; }
interface CancelledPayload { job_id: string; }

export function useDownloadEvents() {
  const updateTrack = useDiscographyStore((s) => s.updateTrack);
  const setStatus = useUiStore((s) => s.setStatus);

  useEffect(() => {
    const unlisteners = Promise.all([
      listen<ProgressPayload>("download:progress", (e) => {
        updateTrack(e.payload.job_id, {
          downloadProgress: e.payload.percent,
          downloadPhase: e.payload.phase,
          downloadStatus: e.payload.phase === "converting" ? "converting" : "downloading",
        });
      }),
      listen<CompletePayload>("download:complete", (e) => {
        updateTrack(e.payload.job_id, {
          downloadStatus: "done",
          downloadProgress: 100,
          localPath: e.payload.local_path,
        });
        setStatus("Download complete", "success");
      }),
      listen<ErrorPayload>("download:error", (e) => {
        updateTrack(e.payload.job_id, { downloadStatus: "error", downloadProgress: 0 });
        setStatus(`Download error: ${e.payload.message}`, "error");
      }),
      listen<CancelledPayload>("download:cancelled", (e) => {
        updateTrack(e.payload.job_id, { downloadStatus: "cancelled", downloadProgress: 0 });
      }),
    ]);

    return () => { unlisteners.then((fns) => fns.forEach((f) => f())); };
  }, []);
}
