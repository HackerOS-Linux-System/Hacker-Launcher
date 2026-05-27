import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Settings, Paths, Toast } from "../types";

interface Props {
  addToast: (msg: string, kind?: Toast["kind"]) => void;
}

export default function SettingsTab({ addToast }: Props) {
  const [settings, setSettings] = useState<Settings>({
    fullscreen: false,
    default_runner: "Proton",
    auto_update: "Enabled",
    enable_esync: true,
    enable_fsync: true,
    enable_dxvk_async: false,
    theme: "Dark (Default)",
  });
  const [paths, setPaths] = useState<Paths>({ prefixes_dir: "", protons_dir: "", logs_dir: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoke<Settings>("get_settings").then(setSettings).catch(() => {});
    invoke<Paths>("get_paths").then(setPaths).catch(() => {});
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await invoke("save_settings", { settings });
      addToast("Settings saved!", "success");
    } catch (e) {
      addToast(`Failed to save: ${e}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ overflow: "auto", flex: 1 }}>
      <div className="section-label" style={{ marginBottom: 20 }}>
        Settings
      </div>

      <div className="settings-grid">

        {/* ── Appearance ─────────────────────────── */}
        <div className="settings-section">Appearance</div>

        <span className="settings-label">Theme</span>
        <select
          value={settings.theme}
          onChange={(e) => update("theme", e.target.value)}
        >
          <option>Dark (Default)</option>
          <option>Light</option>
        </select>

        <span className="settings-label">Fullscreen Mode</span>
        <select
          value={settings.fullscreen ? "Enabled" : "Disabled"}
          onChange={(e) => update("fullscreen", e.target.value === "Enabled")}
        >
          <option>Enabled</option>
          <option>Disabled</option>
        </select>

        {/* ── Game Defaults ───────────────────────── */}
        <div className="settings-section">Game Defaults</div>

        <span className="settings-label">Default Runner</span>
        <select
          value={settings.default_runner}
          onChange={(e) => update("default_runner", e.target.value)}
        >
          {["Native", "Wine", "Proton", "Flatpak", "Steam"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        <span className="settings-label">Auto-check Updates</span>
        <select
          value={settings.auto_update}
          onChange={(e) => update("auto_update", e.target.value)}
        >
          <option>Enabled</option>
          <option>Disabled</option>
        </select>

        {/* ── Wine / Proton Globals ───────────────── */}
        <div className="settings-section">Wine / Proton (Global)</div>

        <span className="settings-label" style={{ gridColumn: "1 / -1" }}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={settings.enable_esync}
              onChange={(e) => update("enable_esync", e.target.checked)}
            />
            Enable Esync globally
          </label>
        </span>

        <span className="settings-label" style={{ gridColumn: "1 / -1" }}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={settings.enable_fsync}
              onChange={(e) => update("enable_fsync", e.target.checked)}
            />
            Enable Fsync globally
          </label>
        </span>

        <span className="settings-label" style={{ gridColumn: "1 / -1" }}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={settings.enable_dxvk_async}
              onChange={(e) => update("enable_dxvk_async", e.target.checked)}
            />
            Enable DXVK Async globally
          </label>
        </span>

        {/* ── Paths ───────────────────────────────── */}
        <div className="settings-section">Paths</div>

        <span className="settings-label">Prefixes</span>
        <span className="settings-path">{paths.prefixes_dir || "—"}</span>

        <span className="settings-label">Protons</span>
        <span className="settings-path">{paths.protons_dir || "—"}</span>

        <span className="settings-label">Logs</span>
        <span className="settings-path">{paths.logs_dir || "—"}</span>

      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" /> Saving…</> : "💾 Save Settings"}
        </button>
      </div>
    </div>
  );
}
