use pyo3::prelude::*;
use pyo3::types::PyModule;
use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "source-code/"]
struct PythonAssets;

fn main() -> PyResult<()> {
    pyo3::prepare_freethreaded_python();
    Python::with_gil(|py| -> PyResult<()> {
        let sys = py.import_bound("sys")?;
        let modules = sys.getattr("modules")?;

        let config_manager_asset = PythonAssets::get("config_manager.py").unwrap();
        let config_manager_code = std::str::from_utf8(config_manager_asset.data.as_ref()).unwrap();
        let config_manager = PyModule::from_code_bound(py, config_manager_code, "config_manager.py", "config_manager")?;
        modules.set_item("config_manager", config_manager)?;

        let proton_manager_asset = PythonAssets::get("proton_manager.py").unwrap();
        let proton_manager_code = std::str::from_utf8(proton_manager_asset.data.as_ref()).unwrap();
        let proton_manager = PyModule::from_code_bound(py, proton_manager_code, "proton_manager.py", "proton_manager")?;
        modules.set_item("proton_manager", proton_manager)?;

        let game_manager_asset = PythonAssets::get("game_manager.py").unwrap();
        let game_manager_code = std::str::from_utf8(game_manager_asset.data.as_ref()).unwrap();
        let game_manager = PyModule::from_code_bound(py, game_manager_code, "game_manager.py", "game_manager")?;
        modules.set_item("game_manager", game_manager)?;

        let main_window_asset = PythonAssets::get("main_window.py").unwrap();
        let main_window_code = std::str::from_utf8(main_window_asset.data.as_ref()).unwrap();
        let main_window = PyModule::from_code_bound(py, main_window_code, "main_window.py", "main_window")?;
        modules.set_item("main_window", main_window)?;

        let main_asset = PythonAssets::get("main.py").unwrap();
        let main_code = std::str::from_utf8(main_asset.data.as_ref()).unwrap();
        py.run_bound(main_code, None, None)?;
        Ok(())
    })
}
