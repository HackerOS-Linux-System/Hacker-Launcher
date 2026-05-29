mod config_manager;
mod game_manager;
mod proton_manager;

use config_manager::ConfigManager;
use game_manager::GameManager;
use proton_manager::ProtonManager;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub config: Mutex<ConfigManager>,
    pub proton: Mutex<ProtonManager>,
    pub game: Mutex<GameManager>,
}

// ─────────────────────────────────────────────
//  Config / Settings commands
// ─────────────────────────────────────────────

#[tauri::command]
fn get_settings(state: State<AppState>) -> Result<config_manager::Settings, String> {
    let cfg = state.config.lock().map_err(|e| e.to_string())?;
    Ok(cfg.settings.clone())
}

#[tauri::command]
fn save_settings(
    state: State<AppState>,
    settings: config_manager::Settings,
) -> Result<(), String> {
    let mut cfg = state.config.lock().map_err(|e| e.to_string())?;
    cfg.save_settings(&settings).map_err(|e| e.to_string())?;
    cfg.settings = settings;
    Ok(())
}

#[tauri::command]
fn get_paths(state: State<AppState>) -> Result<config_manager::Paths, String> {
    let cfg = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config_manager::Paths {
        prefixes_dir: cfg.prefixes_dir.to_string_lossy().to_string(),
       protons_dir: cfg.protons_dir.to_string_lossy().to_string(),
       logs_dir: cfg.logs_dir.to_string_lossy().to_string(),
    })
}

// ─────────────────────────────────────────────
//  Game commands
// ─────────────────────────────────────────────

#[tauri::command]
fn get_games(state: State<AppState>) -> Result<Vec<game_manager::Game>, String> {
    let gm = state.game.lock().map_err(|e| e.to_string())?;
    gm.load_games().map_err(|e| e.to_string())
}

#[tauri::command]
fn add_game(state: State<AppState>, game: game_manager::Game) -> Result<(), String> {
    let gm = state.game.lock().map_err(|e| e.to_string())?;
    gm.add_game(game).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_game(state: State<AppState>, name: String) -> Result<(), String> {
    let gm = state.game.lock().map_err(|e| e.to_string())?;
    gm.remove_game(&name).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_game(state: State<AppState>, game: game_manager::Game) -> Result<(), String> {
    let gm = state.game.lock().map_err(|e| e.to_string())?;
    gm.update_game(game).map_err(|e| e.to_string())
}

#[tauri::command]
fn launch_game(
    state: State<AppState>,
    game: game_manager::Game,
    gamescope: bool,
) -> Result<(), String> {
    let gm = state.game.lock().map_err(|e| e.to_string())?;
    gm.launch_game(game, gamescope).map_err(|e| e.to_string())
}

// ─────────────────────────────────────────────
//  Proton commands
// ─────────────────────────────────────────────

#[tauri::command]
fn get_installed_protons(
    state: State<AppState>,
) -> Result<Vec<proton_manager::ProtonEntry>, String> {
    let pm = state.proton.lock().map_err(|e| e.to_string())?;
    pm.get_installed_protons().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_available_ge() -> Result<Vec<String>, String> {
    proton_manager::ProtonManager::fetch_available_ge()
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_available_official(stable: bool) -> Result<Vec<String>, String> {
    proton_manager::ProtonManager::fetch_available_official(stable)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn install_proton(
    state: State<'_, AppState>,
    version: String,
    proton_type: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let protons_dir = {
        let pm = state.proton.lock().map_err(|e| e.to_string())?;
        pm.protons_dir.clone()
    };
    proton_manager::ProtonManager::install_proton_async(
        protons_dir,
        version,
        proton_type,
        app_handle,
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn install_custom_tar(
    state: State<'_, AppState>,
    tar_path: String,
    version: String,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let protons_dir = {
        let pm = state.proton.lock().map_err(|e| e.to_string())?;
        pm.protons_dir.clone()
    };
    proton_manager::ProtonManager::install_custom_tar_async(
        protons_dir,
        tar_path,
        version,
        app_handle,
    )
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn install_custom_folder(
    state: State<AppState>,
    src_folder: String,
    version: String,
) -> Result<(), String> {
    let pm = state.proton.lock().map_err(|e| e.to_string())?;
    pm.install_custom_folder(&src_folder, &version)
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_proton(state: State<AppState>, version: String) -> Result<(), String> {
    let pm = state.proton.lock().map_err(|e| e.to_string())?;
    pm.remove_proton(&version).map_err(|e| e.to_string())
}

#[tauri::command]
async fn check_proton_update(
    _state: State<'_, AppState>,
    version: String,
    proton_type: String,
) -> Result<Option<(String, String)>, String> {
    proton_manager::ProtonManager::check_update_async(version, proton_type)
    .await
    .map_err(|e| e.to_string())
}

// ─────────────────────────────────────────────
//  Entry point
// ─────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let config = ConfigManager::new().expect("Failed to initialize ConfigManager");
    let proton = ProtonManager::new(config.protons_dir.clone());
    let game = GameManager::new(
        config.games_file.clone(),
                                config.prefixes_dir.clone(),
                                config.logs_dir.clone(),
                                config.protons_dir.clone(),
                                config.settings.clone(),
    );

    tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_dialog::init())
    .manage(AppState {
        config: Mutex::new(config),
            proton: Mutex::new(proton),
            game: Mutex::new(game),
    })
    .invoke_handler(tauri::generate_handler![
        get_settings,
        save_settings,
        get_paths,
        get_games,
        add_game,
        remove_game,
        update_game,
        launch_game,
        get_installed_protons,
        get_available_ge,
        get_available_official,
        install_proton,
        install_custom_tar,
        install_custom_folder,
        remove_proton,
        check_proton_update,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
