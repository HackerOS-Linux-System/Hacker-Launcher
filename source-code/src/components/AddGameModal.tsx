import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import { Game, Toast } from "../types";

interface Props {
  onClose: () => void;
  onAdded: () => void;
  addToast: (msg: string, kind?: Toast["kind"]) => void;
}

const RUNNERS = ["Native", "Wine", "Proton", "Flatpak", "Steam"];

export default function AddGameModal({ onClose, onAdded, addToast }: Props) {
  const [name, setName] = useState("");
  const [exe, setExe] = useState("");
  const [runner, setRunner] = useState("Proton");
  const [protonVersion, setProtonVersion] = useState("");
  const [protonVersions, setProtonVersions] = useState<string[]>([]);
  const [prefix, setPrefix] = useState("");
  const [launchOptions, setLaunchOptions] = useState("");
  const [fpsLimit, setFpsLimit] = useState("");
  const [enableDxvk, setEnableDxvk] = useState(false);
  const [enableEsync, setEnableEsync] = useState(false);
  const [enableFsync, setEnableFsync] = useState(false);
  const [enableDxvkAsync, setEnableDxvkAsync] = useState(false);
  const [appId, setAppId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoke<Array<{ version: string }>>("get_installed_protons")
      .then((p) => {
        const versions = p.map((x) => x.version);
        setProtonVersions(versions);
        if (versions.length > 0) setProtonVersion(versions[0]);
      })
      .catch(() => {});
  }, []);

  const isWineOrProton = runner === "Wine" || runner === "Proton";

  const browseExe = async () => {
    const result = await open({
      filters: [
        { name: "Executables", extensions: ["exe", "bat"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (typeof result === "string") setExe(result);
  };

  const browsePrefix = async () => {
    const result = await open({ directory: true });
    if (typeof result === "string") setPrefix(result);
  };

  const handleAdd = async () => {
    if (!name.trim()) return addToast("Game name is required", "error");
    if (runner !== "Steam" && !exe.trim())
      return addToast("Executable is required", "error");
    if (runner === "Steam" && !appId.trim())
      return addToast("Steam App ID is required", "error");

    const finalRunner = runner === "Proton" ? protonVersion : runner;
    const game: Game = {
      name: name.trim(),
      exe: exe.trim(),
      runner: finalRunner,
      prefix: prefix.trim(),
      launch_options: launchOptions.trim(),
      fps_limit: fpsLimit ? parseInt(fpsLimit) : null,
      enable_dxvk: enableDxvk,
      enable_esync: enableEsync,
      enable_fsync: enableFsync,
      enable_dxvk_async: enableDxvkAsync,
      app_id: appId.trim(),
    };

    setSaving(true);
    try {
      await invoke("add_game", { game });
      onAdded();
    } catch (e) {
      addToast(`Failed to add game: ${e}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add New Game</h2>

        <div className="form-grid">
          <label className="form-label">Game Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter game name"
          />

          <label className="form-label">Runner</label>
          <select value={runner} onChange={(e) => setRunner(e.target.value)}>
            {RUNNERS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>

          {runner === "Proton" && (
            <>
              <label className="form-label">Proton Version</label>
              <select
                value={protonVersion}
                onChange={(e) => setProtonVersion(e.target.value)}
              >
                {protonVersions.length === 0 ? (
                  <option>No Proton installed</option>
                ) : (
                  protonVersions.map((v) => <option key={v}>{v}</option>)
                )}
              </select>
            </>
          )}

          {runner !== "Steam" && (
            <>
              <label className="form-label">Executable</label>
              <div className="input-group">
                <input
                  type="text"
                  value={exe}
                  onChange={(e) => setExe(e.target.value)}
                  placeholder="Select or enter path"
                />
                <button onClick={browseExe}>📁 Browse</button>
              </div>
            </>
          )}

          {runner === "Steam" && (
            <>
              <label className="form-label">Steam App ID</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="e.g. 570"
              />
            </>
          )}

          {isWineOrProton && (
            <>
              <label className="form-label">Wine Prefix</label>
              <div className="input-group">
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="Leave empty for auto"
                />
                <button onClick={browsePrefix}>📁 Browse</button>
              </div>
            </>
          )}

          <label className="form-label">Launch Options</label>
          <input
            type="text"
            value={launchOptions}
            onChange={(e) => setLaunchOptions(e.target.value)}
            placeholder="--fullscreen --gamescope --width=1920 ..."
          />

          <label className="form-label">FPS Limit</label>
          <input
            type="number"
            value={fpsLimit}
            onChange={(e) => setFpsLimit(e.target.value)}
            placeholder="e.g. 60 (Gamescope only)"
          />

          {isWineOrProton && (
            <div className="full-row" style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={enableDxvk}
                  onChange={(e) => setEnableDxvk(e.target.checked)}
                />
                Enable DXVK / VKD3D
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={enableEsync}
                  onChange={(e) => setEnableEsync(e.target.checked)}
                />
                Enable Esync (Override)
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={enableFsync}
                  onChange={(e) => setEnableFsync(e.target.checked)}
                />
                Enable Fsync (Override)
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={enableDxvkAsync}
                  onChange={(e) => setEnableDxvkAsync(e.target.checked)}
                />
                Enable DXVK Async (Override)
              </label>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)" }}>
            Cancel
          </button>
          <button onClick={handleAdd} disabled={saving}>
            {saving ? <><span className="spinner" /> Adding…</> : "＋ Add Game"}
          </button>
        </div>
      </div>
    </div>
  );
}
