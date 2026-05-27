use crate::config_manager::Settings;
use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Stdio;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub name: String,
    pub exe: String,
    pub runner: String,
    #[serde(default)]
    pub prefix: String,
    #[serde(default)]
    pub launch_options: String,
    #[serde(default)]
    pub fps_limit: Option<u32>,
    #[serde(default)]
    pub enable_dxvk: bool,
    #[serde(default)]
    pub enable_esync: bool,
    #[serde(default)]
    pub enable_fsync: bool,
    #[serde(default)]
    pub enable_dxvk_async: bool,
    #[serde(default)]
    pub app_id: String,
}

pub struct GameManager {
    games_file: PathBuf,
    prefixes_dir: PathBuf,
    logs_dir: PathBuf,
    protons_dir: PathBuf,
    settings: Settings,
}

impl GameManager {
    pub fn new(
        games_file: PathBuf,
        prefixes_dir: PathBuf,
        logs_dir: PathBuf,
        protons_dir: PathBuf,
        settings: Settings,
    ) -> Self {
        Self {
            games_file,
            prefixes_dir,
            logs_dir,
            protons_dir,
            settings,
        }
    }

    pub fn load_games(&self) -> Result<Vec<Game>> {
        if !self.games_file.exists() {
            return Ok(vec![]);
        }
        let content = fs::read_to_string(&self.games_file)?;
        let games: Vec<Game> = serde_json::from_str(&content).unwrap_or_default();
        Ok(games)
    }

    fn save_games(&self, games: &[Game]) -> Result<()> {
        let content = serde_json::to_string_pretty(games)?;
        fs::write(&self.games_file, content)?;
        Ok(())
    }

    pub fn add_game(&self, game: Game) -> Result<()> {
        let mut games = self.load_games()?;
        games.push(game);
        self.save_games(&games)
    }

    pub fn remove_game(&self, name: &str) -> Result<()> {
        let mut games = self.load_games()?;
        games.retain(|g| g.name != name);
        self.save_games(&games)
    }

    pub fn update_game(&self, updated: Game) -> Result<()> {
        let mut games = self.load_games()?;
        for g in games.iter_mut() {
            if g.name == updated.name {
                *g = updated.clone();
                break;
            }
        }
        self.save_games(&games)
    }

    pub fn launch_game(&self, mut game: Game, gamescope: bool) -> Result<()> {
        use std::collections::HashMap;

        // Validation
        if game.runner != "Steam" && !std::path::Path::new(&game.exe).exists() {
            bail!("Executable does not exist: {}", game.exe);
        }
        if game.runner == "Steam" && game.app_id.is_empty() {
            bail!("Steam App ID not set");
        }

        let mut env: HashMap<String, String> = std::env::vars().collect();
        let launch_options: Vec<String> = game
            .launch_options
            .split_whitespace()
            .map(|s| s.to_string())
            .collect();

        let is_wine_or_proton =
            game.runner == "Wine" || game.runner.contains("Proton");

        if is_wine_or_proton {
            // Set up prefix
            if game.prefix.is_empty() {
                let default_prefix = self
                    .prefixes_dir
                    .join(game.name.replace(' ', "_"));
                game.prefix = default_prefix.to_string_lossy().to_string();
                // Persist the prefix update
                let _ = self.update_game(game.clone());
            }
            fs::create_dir_all(&game.prefix)?;

            env.insert("WINEPREFIX".to_string(), game.prefix.clone());
            if game.enable_dxvk {
                env.insert(
                    "WINEDLLOVERRIDES".to_string(),
                    "d3d11=n,b;dxgi=n,b".to_string(),
                );
            }
            let esync = if game.enable_esync || self.settings.enable_esync { "1" } else { "0" };
            let fsync = if game.enable_fsync || self.settings.enable_fsync { "1" } else { "0" };
            let dxvk_async = if game.enable_dxvk_async || self.settings.enable_dxvk_async { "1" } else { "0" };
            env.insert("WINEESYNC".to_string(), esync.to_string());
            env.insert("WINEFSYNC".to_string(), fsync.to_string());
            env.insert("DXVK_ASYNC".to_string(), dxvk_async.to_string());
        }

        // Build command
        let mut cmd_parts: Vec<String> = vec![];
        let mut remaining_options = launch_options.clone();

        if gamescope {
            if which::which("gamescope").is_err() {
                bail!("Gamescope is not installed. Please install it via your package manager.");
            }
            cmd_parts.push("gamescope".to_string());
            let mut to_remove: Vec<String> = vec![];

            if remaining_options.contains(&"--adaptive-sync".to_string()) {
                cmd_parts.push("--adaptive-sync".to_string());
                to_remove.push("--adaptive-sync".to_string());
            }
            if remaining_options.contains(&"--force-grab-cursor".to_string()) {
                cmd_parts.push("--force-grab-cursor".to_string());
                to_remove.push("--force-grab-cursor".to_string());
            }
            if let Some(w) = remaining_options.iter().find(|o| o.starts_with("--width=")) {
                let val = w.split('=').nth(1).unwrap_or("1920");
                cmd_parts.push("-W".to_string());
                cmd_parts.push(val.to_string());
                to_remove.push(w.clone());
            }
            if let Some(h) = remaining_options.iter().find(|o| o.starts_with("--height=")) {
                let val = h.split('=').nth(1).unwrap_or("1080");
                cmd_parts.push("-H".to_string());
                cmd_parts.push(val.to_string());
                to_remove.push(h.clone());
            }
            if remaining_options.contains(&"--fullscreen".to_string()) {
                cmd_parts.push("-f".to_string());
                to_remove.push("--fullscreen".to_string());
            }
            if remaining_options.contains(&"--bigpicture".to_string()) {
                cmd_parts.extend(["-e".to_string(), "-f".to_string()]);
                to_remove.push("--bigpicture".to_string());
            }
            if let Some(fps) = game.fps_limit {
                cmd_parts.push("-r".to_string());
                cmd_parts.push(fps.to_string());
            }
            remaining_options.retain(|o| !to_remove.contains(o));
            cmd_parts.push("--".to_string());
        }

        // Runner-specific command
        match game.runner.as_str() {
            "Native" => {
                cmd_parts.push(game.exe.clone());
                cmd_parts.extend(remaining_options);
            }
            "Wine" => {
                if which::which("wine").is_err() {
                    bail!("Wine not installed. Please install it (e.g., dnf install wine).");
                }
                cmd_parts.push("wine".to_string());
                cmd_parts.push(game.exe.clone());
                cmd_parts.extend(remaining_options);
            }
            "Flatpak" => {
                if which::which("flatpak").is_err() {
                    bail!("Flatpak not installed.");
                }
                cmd_parts.extend(["flatpak".to_string(), "run".to_string()]);
                cmd_parts.push(game.exe.clone());
                cmd_parts.extend(remaining_options);
            }
            "Steam" => {
                if which::which("flatpak").is_ok() && which::which("steam").is_err() {
                    cmd_parts.extend([
                        "flatpak".to_string(),
                        "run".to_string(),
                        "com.valvesoftware.Steam".to_string(),
                        "-applaunch".to_string(),
                        game.app_id.clone(),
                    ]);
                } else if which::which("steam").is_ok() {
                    cmd_parts.extend([
                        "steam".to_string(),
                        "-applaunch".to_string(),
                        game.app_id.clone(),
                    ]);
                } else {
                    bail!("Steam or Flatpak not installed.");
                }
                cmd_parts.extend(remaining_options);
            }
            runner if runner.contains("Proton") => {
                // Find proton binary
                let proton_dir = self.protons_dir.join(runner);
                let proton_bin = find_proton_binary(&proton_dir)
                    .with_context(|| format!("Proton binary not found for {}", runner))?;

                let steam_dir = dirs::home_dir()
                    .unwrap_or_default()
                    .join(".local/share/Steam");
                fs::create_dir_all(steam_dir.join("steamapps/compatdata")).ok();

                env.insert(
                    "STEAM_COMPAT_CLIENT_INSTALL_PATH".to_string(),
                    steam_dir.to_string_lossy().to_string(),
                );
                env.insert("STEAM_COMPAT_DATA_PATH".to_string(), game.prefix.clone());
                env.insert(
                    "STEAM_RUNTIME".to_string(),
                    steam_dir
                        .join("ubuntu12_32/steam-runtime")
                        .to_string_lossy()
                        .to_string(),
                );
                let ld = format!(
                    "{}:{}:{}",
                    steam_dir.join("ubuntu12_32").to_string_lossy(),
                    steam_dir.join("ubuntu12_64").to_string_lossy(),
                    env.get("LD_LIBRARY_PATH").cloned().unwrap_or_default()
                );
                env.insert("LD_LIBRARY_PATH".to_string(), ld);

                cmd_parts.push(proton_bin.to_string_lossy().to_string());
                cmd_parts.push("waitforexitandrun".to_string());
                cmd_parts.push(game.exe.clone());
                cmd_parts.extend(remaining_options);
            }
            unknown => bail!("Unknown runner: {}", unknown),
        }

        // Execute
        let log_file_path = self
            .logs_dir
            .join(format!("{}.log", game.name.replace(' ', "_")));
        let log_file = fs::File::create(&log_file_path)?;
        let stderr_log = log_file.try_clone()?;

        let mut command = std::process::Command::new(&cmd_parts[0]);
        command
            .args(&cmd_parts[1..])
            .stdout(Stdio::from(log_file))
            .stderr(Stdio::from(stderr_log));

        for (k, v) in &env {
            command.env(k, v);
        }

        command.spawn().with_context(|| {
            format!("Failed to launch game: {} with cmd: {:?}", game.name, cmd_parts)
        })?;

        Ok(())
    }
}

fn find_proton_binary(base: &PathBuf) -> Option<PathBuf> {
    for entry in walkdir::WalkDir::new(base).max_depth(5) {
        if let Ok(e) = entry {
            if e.file_name() == "proton" && e.file_type().is_file() {
                return Some(e.path().to_path_buf());
            }
        }
    }
    None
}
