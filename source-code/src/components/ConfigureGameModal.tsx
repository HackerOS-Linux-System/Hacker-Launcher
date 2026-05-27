import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Game, Toast } from "../types";

interface Props {
  game: Game;
  onClose: () => void;
  onSaved: () => void;
  addToast: (msg: string, kind?: Toast["kind"]) => void;
}

export default function ConfigureGameModal({ game, onClose, onSaved, addToast }: Props) {
  const [name, setName] = useState(game.name);
  const [runner, setRunner] = useState(
    game.runner.includes("Proton") ? "Proton" : game.runner
  );
  const [protonVersion, setProtonVersion] = useState(
    game.runner.includes("Proton") ? game.runner : ""
  );
  const [protonVersions, setProtonVersions] = useState<string[]>([]);
  const [fpsLimit, setFpsLimit] = useState(
    game.fps_limit != null ? String(game.fps_limit) : ""
  );
  const [launchOptions, setLaunchOptions] = useState(game.launch_options);
  const [prefix, setPrefix] = useState(game.prefix);
  const [enableDxvk, setEnableDxvk] = useState(game.enable_dxvk);
  const [enableEsync, setEnableEsync] = useState(game.enable_esync);
  const [enableFsync, setEnableFsync] = useState(game.enable_fsync);
  const [enableDxvkAsync, setEnableDxvkAsync] = useState(game.enable_dxvk_async);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoke<Array<{ version: string }>>("get_installed_protons")
      .then((p) => {
        const versions = p.map((x) => x.version);
        setProtonVersions(versions);
        if (!protonVersion && versions.length > 0) setProtonVersion(versions[0]);
      })
      .catch(() => {});
  }, []);

  const isWineOrProton = runner === "Wine" || runner === "Proton";

  const handleSave = async () => {
    if (!name.trim()) return addToast("Name is required", "error");
    const finalRunner = runner === "Proton" ? protonVersion : runner;
    const updated: Game = {
      ...game,
      name: name.trim(),
      runner: finalRunner,
      fps_limit: fpsLimit ? parseInt(fpsLimit) : null,
      launch_options: launchOptions,
      prefix,
      enable_dxvk: enableDxvk,
      enable_esync: enableEsync,
      enable_fsync: enableFsync,
      enable_dxvk_async: enableDxvkAsync,
    };
    setSaving(true);
    try {
      await invoke("update_game", { game: updated });
      onSaved();
    } catch (e) {
      addToast(`Failed to save: ${e}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Configure: {game.name}</h2>

        <div className="form-grid">
          <label className="form-label">Game Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="form-label">Runner</label>
          <select value={runner} onChange={(e) => setRunner(e.target.value)}>
            {["Native", "Wine", "Proton", "Flatpak", "Steam"].map((r) => (
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

          <label className="form-label">Launch Options</label>
          <input
            type="text"
            value={launchOptions}
            onChange={(e) => setLaunchOptions(e.target.value)}
            placeholder="--fullscreen --gamescope ..."
          />

          <label className="form-label">FPS Limit</label>
          <input
            type="number"
            value={fpsLimit}
            onChange={(e) => setFpsLimit(e.target.value)}
            placeholder="e.g. 60"
          />

          {isWineOrProton && (
            <>
              <label className="form-label">Prefix Path</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="Leave empty for default"
              />

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
            </>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" /> Saving…</> : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
