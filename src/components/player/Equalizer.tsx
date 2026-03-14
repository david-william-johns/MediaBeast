import { useState } from "react";
import { usePlayerStore } from "../../store/playerStore";
import { audioEngine } from "../../lib/audioEngine";
import { saveEqProfile, deleteEqProfile } from "../../lib/tauriCommands";
import { EQ_BAND_LABELS, BUILT_IN_PRESETS, MAX_EQ_GAIN, MIN_EQ_GAIN } from "../../lib/constants";

export default function Equalizer() {
  const { eqGains, activePreset, customProfiles, setEqBand, setCustomProfiles, applyPreset } = usePlayerStore();
  const [newProfileName, setNewProfileName] = useState("");

  function handleBand(index: number, value: number) {
    setEqBand(index, value);
    audioEngine.setEqBand(index, value);
  }

  async function saveProfile() {
    if (!newProfileName.trim()) return;
    await saveEqProfile(newProfileName.trim(), [...eqGains]);
    setCustomProfiles({ ...customProfiles, [newProfileName.trim()]: [...eqGains] });
    setNewProfileName("");
  }

  async function deleteProfile(name: string) {
    await deleteEqProfile(name);
    const updated = { ...customProfiles };
    delete updated[name];
    setCustomProfiles(updated);
  }

  const allPresets = [
    ...BUILT_IN_PRESETS.map((p) => p.name),
    ...Object.keys(customProfiles),
  ];

  return (
    <div className="w-full max-w-md bg-panel border border-border rounded-lg p-4">
      {/* Preset selector */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {allPresets.map((name) => (
          <button
            key={name}
            onClick={() => { applyPreset(name); audioEngine.setAllEqBands(usePlayerStore.getState().eqGains); }}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              activePreset === name ? "bg-accent text-white" : "border border-border text-muted hover:text-text"
            }`}
          >
            {name}
            {!BUILT_IN_PRESETS.find((p) => p.name === name) && (
              <span
                onClick={(e) => { e.stopPropagation(); deleteProfile(name); }}
                className="ml-1 text-danger hover:text-red-300"
              > ✕</span>
            )}
          </button>
        ))}
      </div>

      {/* Band sliders */}
      <div className="flex gap-1 items-end justify-between">
        {EQ_BAND_LABELS.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted">{Math.round(eqGains[i])}</span>
            <input
              type="range"
              min={MIN_EQ_GAIN} max={MAX_EQ_GAIN} step={0.5}
              value={eqGains[i]}
              onChange={(e) => handleBand(i, Number(e.target.value))}
              {...{ orient: "vertical" } as React.InputHTMLAttributes<HTMLInputElement>}
              style={{ height: 80, writingMode: "vertical-lr", direction: "rtl" }}
              className="accent-accent"
            />
            <span className="text-xs text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* Save custom profile */}
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          placeholder="Profile name…"
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveProfile(); }}
          className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs text-text placeholder-muted focus:outline-none focus:border-accent"
        />
        <button
          onClick={saveProfile}
          disabled={!newProfileName.trim()}
          className="px-3 py-1 text-xs bg-accent hover:bg-accent-hover text-white rounded disabled:opacity-40"
        >Save</button>
      </div>
    </div>
  );
}
