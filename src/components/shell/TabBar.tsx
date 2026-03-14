import { useUiStore } from "../../store/uiStore";
import type { TabId } from "../../types";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "discography", label: "Discography", icon: "♫" },
  { id: "player",      label: "Player",      icon: "▶" },
  { id: "analyser",    label: "Wave Analyser", icon: "∿" },
];

export default function TabBar() {
  const { activeTab, setActiveTab } = useUiStore();

  return (
    <div className="flex items-center bg-surface border-b border-border shrink-0 px-2 h-10">
      <span className="text-accent font-bold text-lg mr-4 px-2">MediaBeast</span>
      <div className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "px-4 py-1.5 text-sm font-medium rounded transition-colors",
              activeTab === tab.id
                ? "bg-accent text-white"
                : "text-muted hover:text-text hover:bg-panel",
            ].join(" ")}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
