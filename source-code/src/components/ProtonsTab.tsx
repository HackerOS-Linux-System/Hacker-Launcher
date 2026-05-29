import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { ProtonEntry, Toast } from "../types";

interface Props {
  addToast: (msg: string, kind?: Toast["kind"]) => void;
}

interface ProgressEvent {
  stage: string;
  value: number;
  total: number;
}

export default function ProtonsTab({ addToast }: Props) {
  const [protons, setProtons] = useState<ProtonEntry[]>([]);
  const [selected, setSelected] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [protonType, setProtonType] = useState<"GE" | "Official" | "Experimental" | "Custom">("GE");
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [customPath, setCustomPath] = useState("");
  const [customVersionName, setCustomVersionName] = useState("");
  const [customSourceType, setCustomSourceType] = useState<"Tar.gz File" | "Folder">("Tar.gz File");
  const [fetchingVersions, setFetchingVersions] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progressStage, setProgressStage] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  const loadProtons = useCallback(async () => {
    setLoading(true);
    try {
      const p = await invoke<ProtonEntry[]>("get_installed_protons");
      setProtons(p);
    } catch (e) {
      addToast(`Failed to load protons: ${e}`, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadProtons(); }, [loadProtons]);

  useEffect(() => {
    const unlisten = listen<ProgressEvent>("proton_progress", (event) => {
      const { stage, value, total } = event.payload;
      setProgressStage(stage);
      setProgressPct(total > 0 ? Math.round((value / total) * 100) : 0);
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  const fetchVersions = useCallback(async (type: typeof protonType) => {
    if (type === "Custom") { setAvailableVersions([]); return; }
    setFetchingVersions(true);
    try {
      let versions: string[];
      if (type === "GE") versions = await invoke<string[]>("get_available_ge");
      else if (type === "Official") versions = await invoke<string[]>("get_available_official", { stable: true });
      else versions = await invoke<string[]>("get_available_official", { stable: false });
      setAvailableVersions(versions);
      if (versions.length > 0) setSelectedVersion(versions[0]);
      else setSelectedVersion("");
    } catch (e) {
      addToast(`Failed to fetch versions: ${e}`, "error");
      setAvailableVersions([]);
    } finally {
      setFetchingVersions(false);
    }
  }, [addToast]);

  const openInstallDialog = () => {
    setProtonType("GE"); setAvailableVersions([]); setSelectedVersion("");
    setCustomPath(""); setCustomVersionName(""); setCustomSourceType("Tar.gz File");
    setShowInstall(true); fetchVersions("GE");
  };

  const handleTypeChange = (t: typeof protonType) => { setProtonType(t); fetchVersions(t); };

  const browseCustomPath = async () => {
    if (customSourceType === "Tar.gz File") {
      const result = await open({ filters: [{ name: "Tar.gz", extensions: ["gz"] }] });
      if (typeof result === "string") { setCustomPath(result); if (!customVersionName) setCustomVersionName(result.split("/").pop()?.replace(".tar.gz", "") ?? ""); }
    } else {
      const result = await open({ directory: true });
      if (typeof result === "string") { setCustomPath(result); if (!customVersionName) setCustomVersionName(result.split("/").pop() ?? ""); }
    }
  };

  const handleInstall = async () => {
    if (protonType === "Custom") { if (!customVersionName || !customPath) return addToast("Name and path are required", "error"); }
    else if (!selectedVersion) return addToast("Select a version", "error");
    setInstalling(true); setProgressPct(0); setProgressStage("Starting…");
    try {
      if (protonType === "Custom") {
        if (customSourceType === "Tar.gz File") await invoke("install_custom_tar", { tarPath: customPath, version: customVersionName });
        else await invoke("install_custom_folder", { srcFolder: customPath, version: customVersionName });
        addToast(`Custom Proton "${customVersionName}" installed!`, "success");
      } else {
        await invoke("install_proton", { version: selectedVersion, protonType });
        addToast(`Proton ${selectedVersion} installed!`, "success");
      }
      setShowInstall(false); await loadProtons();
    } catch (e) { addToast(`Installation failed: ${e}`, "error"); }
    finally { setInstalling(false); }
  };

  const handleRemove = async () => {
    if (selected < 0) return addToast("No Proton selected", "error");
    const p = protons[selected];
    if (!confirm(`Remove Proton "${p.version}"?`)) return;
    try { await invoke("remove_proton", { version: p.version }); setSelected(-1); addToast(`Removed: ${p.version}`, "success"); await loadProtons(); }
    catch (e) { addToast(`Failed to remove: ${e}`, "error"); }
  };

  const handleUpdate = async () => {
    if (selected < 0) return addToast("No Proton selected", "error");
    const p = protons[selected];
    addToast("Checking for updates…", "info");
    try {
      const result = await invoke<[string, string] | null>("check_proton_update", { version: p.version, protonType: p.type });
      if (!result) return addToast("No update available", "info");
      const [newType, newVersion] = result;
      if (!confirm(`Update to ${newVersion} (${newType})?`)) return;
      setInstalling(true); setProgressPct(0); setProgressStage("Starting update…");
      await invoke("install_proton", { version: newVersion, protonType: newType });
      await invoke("remove_proton", { version: p.version });
      addToast(`Updated to ${newVersion}`, "success"); setSelected(-1); await loadProtons();
    } catch (e) { addToast(`Update failed: ${e}`, "error"); }
    finally { setInstalling(false); }
  };

  return (
    <>
    <div className="section-label">Installed Protons</div>
    <div className="table-wrap">
    {loading ? (
      <div className="empty-state"><span className="spinner" /><span>Loading protons…</span></div>
    ) : protons.length === 0 ? (
      <div className="empty-state"><span>📦</span><span>No Proton versions installed</span></div>
    ) : (
      <table>
      <thead><tr><th>Version</th><th>Type</th><th>Installed Date</th><th>Status</th></tr></thead>
      <tbody>
      {protons.map((p, i) => (
        <tr key={p.version} className={selected === i ? "selected" : ""} onClick={() => setSelected(i)}>
        <td>{p.version}</td>
        <td><span className="badge badge-purple">{p.type}</span></td>
        <td style={{ color: "var(--text-muted)" }}>{p.date}</td>
        <td><span className={`badge ${p.status === "Update Available" ? "badge-yellow" : "badge-green"}`}>{p.status}</span></td>
        </tr>
      ))}
      </tbody>
      </table>
    )}
    </div>
    {installing && (
      <div style={{ flexShrink: 0 }}>
      <div className="progress-wrap"><div className="progress-bar" style={{ width: `${progressPct}%` }} /></div>
      <div className="progress-label">{progressStage} — {progressPct}%</div>
      </div>
    )}
    <div className="btn-row">
    <button onClick={openInstallDialog} disabled={installing}>＋ Install Proton</button>
    <button onClick={handleUpdate} disabled={selected < 0 || installing}>↑ Update Selected</button>
    <button className="btn-danger" onClick={handleRemove} disabled={selected < 0 || installing}>✕ Remove Selected</button>
    <button onClick={loadProtons} disabled={loading}>↺ Refresh</button>
    </div>
    {showInstall && (
      <div className="modal-overlay" onClick={() => setShowInstall(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
      <h2>Install Proton</h2>
      <div className="form-grid">
      <label className="form-label">Proton Type</label>
      <select value={protonType} onChange={(e) => handleTypeChange(e.target.value as typeof protonType)}>
      <option value="GE">GE (GloriousEggroll)</option>
      <option value="Official">Official (Stable)</option>
      <option value="Experimental">Official (Experimental)</option>
      <option value="Custom">Custom</option>
      </select>
      {protonType !== "Custom" ? (
        <>
        <label className="form-label">Version</label>
        {fetchingVersions ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="spinner" /><span style={{ color: "var(--text-muted)" }}>Fetching versions…</span></div>
        ) : (
          <select value={selectedVersion} onChange={(e) => setSelectedVersion(e.target.value)}>
          {availableVersions.length === 0 ? <option>No versions available</option> : availableVersions.map((v) => <option key={v}>{v}</option>)}
          </select>
        )}
        </>
      ) : (
        <>
        <label className="form-label">Source Type</label>
        <select value={customSourceType} onChange={(e) => setCustomSourceType(e.target.value as typeof customSourceType)}>
        <option>Tar.gz File</option><option>Folder</option>
        </select>
        <label className="form-label">Path</label>
        <div className="input-group">
        <input type="text" value={customPath} onChange={(e) => setCustomPath(e.target.value)} placeholder="Select source…" />
        <button onClick={browseCustomPath}>📁</button>
        </div>
        <label className="form-label">Version Name</label>
        <input type="text" value={customVersionName} onChange={(e) => setCustomVersionName(e.target.value)} placeholder="e.g. MyProton-8.0" />
        </>
      )}
      </div>
      {installing && (
        <div>
        <div className="progress-wrap"><div className="progress-bar" style={{ width: `${progressPct}%` }} /></div>
        <div className="progress-label">{progressStage} — {progressPct}%</div>
        </div>
      )}
      <div className="modal-actions">
      <button onClick={() => setShowInstall(false)} disabled={installing} style={{ background: "rgba(255,255,255,0.05)" }}>Cancel</button>
      <button onClick={handleInstall} disabled={installing || fetchingVersions}>
      {installing ? <><span className="spinner" /> Installing…</> : "⬇ Install"}
      </button>
      </div>
      </div>
      </div>
    )}
    </>
  );
}
