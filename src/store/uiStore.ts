import { create } from "zustand";
import type { TabId, DataPaths } from "../types";

interface UiStore {
  activeTab: TabId;
  folderManagerOpen: boolean;
  settingsOpen: boolean;
  status: string;
  statusType: "info" | "success" | "error";
  dataPaths: DataPaths | null;

  setActiveTab: (tab: TabId) => void;
  setFolderManagerOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setStatus: (msg: string, type?: "info" | "success" | "error") => void;
  setDataPaths: (paths: DataPaths) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  activeTab: "discography",
  folderManagerOpen: false,
  settingsOpen: false,
  status: "Ready",
  statusType: "info",
  dataPaths: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setFolderManagerOpen: (open) => set({ folderManagerOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setStatus: (msg, type = "info") => set({ status: msg, statusType: type }),
  setDataPaths: (paths) => set({ dataPaths: paths }),
}));
