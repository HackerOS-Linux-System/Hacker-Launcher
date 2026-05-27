import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import { Game, Toast } from "../types";
import AddGameModal from "./AddGameModal";
import ConfigureGameModal from "./ConfigureGameModal";

interface Props {
  addToast: (msg: string, kind?: Toast["kind"]) => void;
}

export default function GamesTab({ addToast }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [selected, setSelected] = useState<number>(-1);
  const [showAdd, setShowAdd] = useState(false);
  const [showConfigure, setShowConfigure] = useState(false);
  const [launching, setLaunching] = useState(false);

  const loadGames = useCallback(async () => {
    try {
      const g = await invoke<Game[]>("get_games");
      setGames(g);
    } catch (e) {
      addToast(`Failed to load games: ${e}`, "error");
    }
  }, [addToast]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const handleLaunch = async () => {
    if (selected < 0) return addToast("No game selected", "error");
    const game = games[selected];
    const gamescope = game.launch_options.includes("--gamescope");
    setLaunching(true);
    try {
      await invoke("launch_game", { game, gamescope });
      addToast(`Launched: ${game.name}`, "success");
    } catch (e) {
      addToast(`Failed to launch ${game.name}: ${e}`, "error");
    } finally {
      setLaunching(false);
      await loadGames();
    }
  };

  const handleRemove = async () => {
    if (selected < 0) return addToast("No game selected", "error");
    const game = games[selected];
    if (!confirm(`Remove "${game.name}"?`)) return;
    try {
      await invoke("remove_game", { name: game.name });
      setSelected(-1);
      addToast(`Removed: ${game.name}`, "success");
      await loadGames();
    } catch (e) {
      addToast(`Failed to remove: ${e}`, "error");
    }
  };

  return (
    <>
      <div className="section-label">Installed Games</div>

      <div className="table-wrap">
        {games.length === 0 ? (
          <div className="empty-state">
            <span>🎮</span>
            <span>No games added yet</span>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Game Name</th>
                <th>Runner</th>
                <th>Launch Options</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g, i) => (
                <tr
                  key={g.name}
                  className={selected === i ? "selected" : ""}
                  onClick={() => setSelected(i)}
                  onDoubleClick={handleLaunch}
                >
                  <td>{g.name}</td>
                  <td>
                    <span className="badge badge-purple">{g.runner}</span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {g.launch_options || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="btn-row">
        <button onClick={() => setShowAdd(true)}>＋ Add Game</button>
        <button onClick={handleLaunch} disabled={selected < 0 || launching}>
          {launching ? <><span className="spinner" /> Launching…</> : "▶ Launch Game"}
        </button>
        <button
          className="btn-danger"
          onClick={handleRemove}
          disabled={selected < 0}
        >
          ✕ Remove Game
        </button>
        <button
          onClick={() => {
            if (selected < 0) return addToast("No game selected", "error");
            setShowConfigure(true);
          }}
          disabled={selected < 0}
        >
          ⚙ Configure Game
        </button>
      </div>

      {showAdd && (
        <AddGameModal
          onClose={() => setShowAdd(false)}
          onAdded={async () => {
            setShowAdd(false);
            await loadGames();
            addToast("Game added successfully!", "success");
          }}
          addToast={addToast}
        />
      )}

      {showConfigure && selected >= 0 && (
        <ConfigureGameModal
          game={games[selected]}
          onClose={() => setShowConfigure(false)}
          onSaved={async () => {
            setShowConfigure(false);
            await loadGames();
            addToast("Game configuration updated!", "success");
          }}
          addToast={addToast}
        />
      )}
    </>
  );
}
