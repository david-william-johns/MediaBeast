import { useEffect } from "react";
import { useUiStore } from "./store/uiStore";
import { useDiscographyStore } from "./store/discographyStore";
import { useDownloadEvents } from "./hooks/useDownloadEvents";
import TabBar from "./components/shell/TabBar";
import StatusBar from "./components/shell/StatusBar";
import DiscographyPanel from "./components/discography/DiscographyPanel";
import PlayerPanel from "./components/player/PlayerPanel";
import AnalyserPanel from "./components/analyser/AnalyserPanel";
import { getDataPaths, getPreviousResults, getSearchHistory } from "./lib/tauriCommands";

export default function App() {
  const activeTab = useUiStore((s) => s.activeTab);
  const { setDataPaths } = useUiStore();
  const { setPreviousResults, setHistory } = useDiscographyStore();

  useDownloadEvents();

  useEffect(() => {
    // Load persistent state on startup
    getDataPaths().then(setDataPaths).catch(console.error);
    getPreviousResults().then(setPreviousResults).catch(console.error);
    getSearchHistory().then(setHistory).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-bg text-text overflow-hidden">
      <TabBar />

      {/* Panels are CSS-hidden (never unmounted) to preserve AudioContext and WaveSurfer */}
      <div className={`flex-1 overflow-hidden ${activeTab === "discography" ? "flex" : "hidden"}`}>
        <DiscographyPanel />
      </div>
      <div className={`flex-1 overflow-hidden ${activeTab === "player" ? "flex" : "hidden"}`}>
        <PlayerPanel />
      </div>
      <div className={`flex-1 overflow-hidden ${activeTab === "analyser" ? "flex" : "hidden"}`}>
        <AnalyserPanel />
      </div>

      <StatusBar />
    </div>
  );
}
