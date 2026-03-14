import { useState } from "react";
import SearchBar from "./SearchBar";
import ResultsTable from "./ResultsTable";
import PreviousResultsPage from "./PreviousResultsPage";
import ActionBar from "./ActionBar";
import SettingsDialog from "./SettingsDialog";
import FolderManagerDialog from "./FolderManagerDialog";
import { useDiscographyStore } from "../../store/discographyStore";
import { useUiStore } from "../../store/uiStore";

export default function DiscographyPanel() {
  const { showPreviousResults, setShowPreviousResults } = useDiscographyStore();
  const { folderManagerOpen, settingsOpen } = useUiStore();

  return (
    <div className="flex flex-col w-full h-full bg-bg">
      <SearchBar />

      {/* Page selector */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border-b border-border shrink-0">
        <button
          onClick={() => setShowPreviousResults(false)}
          className={`px-3 py-1 text-xs rounded transition-colors ${!showPreviousResults ? "bg-accent text-white" : "text-muted hover:text-text"}`}
        >
          Current Results
        </button>
        <button
          onClick={() => setShowPreviousResults(true)}
          className={`px-3 py-1 text-xs rounded transition-colors ${showPreviousResults ? "bg-accent text-white" : "text-muted hover:text-text"}`}
        >
          Previous Results
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {showPreviousResults ? <PreviousResultsPage /> : <ResultsTable />}
      </div>

      <ActionBar />

      {settingsOpen && <SettingsDialog />}
      {folderManagerOpen && <FolderManagerDialog />}
    </div>
  );
}
