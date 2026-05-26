use pyo3::prelude::*;
use pyo3::types::PyDict;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

// ============================================================
//  Embedowane pliki Python — spakowane wewnątrz binarki ELF
// ============================================================
const CONFIG_MANAGER_PY:  &[u8] = include_bytes!("../config_manager.py");
const GAME_MANAGER_PY:    &[u8] = include_bytes!("../game_manager.py");
const MAIN_PY:            &[u8] = include_bytes!("../main.py");
const MAIN_WINDOW_PY:     &[u8] = include_bytes!("../main_window.py");
const PROTON_MANAGER_PY:  &[u8] = include_bytes!("../proton_manager.py");

// ============================================================
//  Aktywacja venv — odpowiednik: source ~/.hackeros/venv/bin/activate
//  Rust nie może wywołać `source` (to komenda bash), więc
//  ręcznie ustawiamy zmienne środowiskowe tak jak robi to
//  skrypt activate.
// ============================================================
fn activate_venv(venv_path: &Path) -> Result<PathBuf, String> {
    // Sprawdź czy venv istnieje
    let python_bin = venv_path.join("bin").join("python3");
    if !python_bin.exists() {
        // Spróbuj też "python"
        let python_bin2 = venv_path.join("bin").join("python");
        if !python_bin2.exists() {
            return Err(format!(
                "Nie znaleziono Pythona w venv: {}\n\
Upewnij się że venv istnieje:\n\
python3 -m venv ~/.hackeros/venv\n\
pip install PySide6 requests",
venv_path.display()
            ));
        }
        return Ok(python_bin2);
    }

    let venv_str = venv_path
    .to_str()
    .ok_or("Nieprawidłowa ścieżka venv (nie-UTF8)")?;

    // 1. VIRTUAL_ENV — informuje Python że jest w venv
    env::set_var("VIRTUAL_ENV", venv_str);

    // 2. PATH — dodaj bin/ venv na początek PATH
    let venv_bin = venv_path.join("bin");
    let venv_bin_str = venv_bin
    .to_str()
    .ok_or("Nieprawidłowa ścieżka bin w venv")?;

    let current_path = env::var("PATH").unwrap_or_default();
    let new_path = format!("{}:{}", venv_bin_str, current_path);
    env::set_var("PATH", &new_path);

    // 3. Usuń PYTHONHOME jeśli był ustawiony (venv tego wymaga)
    env::remove_var("PYTHONHOME");

    // 4. PYTHONPATH — ustaw site-packages z venv
    //    Znajdź dynamicznie (np. python3.11, python3.12 itp.)
    let site_packages = find_site_packages(venv_path);
    if let Some(sp) = site_packages {
        let sp_str = sp.to_str().unwrap_or("");
        let current_pypath = env::var("PYTHONPATH").unwrap_or_default();
        if current_pypath.is_empty() {
            env::set_var("PYTHONPATH", sp_str);
        } else {
            env::set_var("PYTHONPATH", format!("{}:{}", sp_str, current_pypath));
        }
    }

    // 5. Usuń __PYVENV_LAUNCHER__ (macOS artifact, szkodzi na Linux)
    env::remove_var("__PYVENV_LAUNCHER__");

    Ok(python_bin)
}

/// Znajdź site-packages wewnątrz venv (obsługuje różne wersje Pythona)
fn find_site_packages(venv_path: &Path) -> Option<PathBuf> {
    let lib_path = venv_path.join("lib");
    if !lib_path.exists() {
        return None;
    }
    // Przejdź przez python3.x katalogi
    if let Ok(entries) = fs::read_dir(&lib_path) {
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            if name_str.starts_with("python") {
                let sp = entry.path().join("site-packages");
                if sp.exists() {
                    return Some(sp);
                }
            }
        }
    }
    None
}

/// Pobierz nazwę aktualnego użytkownika (do budowania ścieżki venv)
fn get_username() -> String {
    // Najpierw sprawdź SUDO_USER (jeśli uruchomiono przez sudo)
    if let Ok(sudo_user) = env::var("SUDO_USER") {
        if !sudo_user.is_empty() && sudo_user != "root" {
            return sudo_user;
        }
    }
    // Potem USER
    if let Ok(user) = env::var("USER") {
        if !user.is_empty() {
            return user;
        }
    }
    // Potem LOGNAME
    if let Ok(logname) = env::var("LOGNAME") {
        if !logname.is_empty() {
            return logname;
        }
    }
    // Fallback — odczytaj z /proc/self/loginuid lub whoami
    if let Ok(output) = std::process::Command::new("whoami").output() {
        let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !name.is_empty() {
            return name;
        }
    }
    // Ostateczny fallback
    "user".to_string()
}

/// Wypakuj pliki .py do katalogu tymczasowego i zwróć ścieżkę
fn extract_python_files(target_dir: &Path) -> Result<(), String> {
    let files: &[(&str, &[u8])] = &[
        ("config_manager.py",  CONFIG_MANAGER_PY),
        ("game_manager.py",    GAME_MANAGER_PY),
        ("main.py",            MAIN_PY),
        ("main_window.py",     MAIN_WINDOW_PY),
        ("proton_manager.py",  PROTON_MANAGER_PY),
    ];

    fs::create_dir_all(target_dir)
    .map_err(|e| format!("Nie można utworzyć katalogu tymczasowego: {}", e))?;

    for (filename, content) in files {
        let dest = target_dir.join(filename);
        fs::write(&dest, content)
        .map_err(|e| format!("Błąd zapisu {}: {}", filename, e))?;
    }

    Ok(())
}

fn main() {
    // --------------------------------------------------------
    // 1. Określ ścieżkę do venv na podstawie nazwy użytkownika
    // --------------------------------------------------------
    let username = get_username();
    let venv_path = PathBuf::from(format!("/home/{}/.hackeros/venv", username));

    println!("[Hacker Launcher] Użytkownik: {}", username);
    println!("[Hacker Launcher] Venv: {}", venv_path.display());

    // --------------------------------------------------------
    // 2. Aktywuj venv (ustaw zmienne środowiskowe)
    // --------------------------------------------------------
    match activate_venv(&venv_path) {
        Ok(python_bin) => {
            println!("[Hacker Launcher] Python: {}", python_bin.display());
        }
        Err(e) => {
            eprintln!("[Hacker Launcher] BŁĄD aktywacji venv:\n{}", e);
            std::process::exit(1);
        }
    }

    // --------------------------------------------------------
    // 3. Wypakuj pliki .py do ~/.hackeros/hacker-launcher/
    //    (stały katalog — nie /tmp — żeby PySide6 mogło działać
    //     i nie rozpakowywać za każdym razem)
    // --------------------------------------------------------
    let app_dir = PathBuf::from(format!(
        "/home/{}/.hackeros/Hacker-Launcher/tmp/",
        username
    ));

    if let Err(e) = extract_python_files(&app_dir) {
        eprintln!("[Hacker Launcher] BŁĄD wypakowania plików:\n{}", e);
        std::process::exit(1);
    }

    println!("[Hacker Launcher] Pliki wypakowane do: {}", app_dir.display());

    // --------------------------------------------------------
    // 4. Uruchom main.py przez PyO3
    // --------------------------------------------------------
    let result = Python::with_gil(|py| -> PyResult<()> {
        // Dodaj katalog aplikacji do sys.path
        let sys = py.import_bound("sys")?;
        let path = sys.getattr("path")?;
        path.call_method1(
            "insert",
            (0, app_dir.to_str().unwrap_or("")),
        )?;

        // Ustaw sys.argv (przekaż oryginalne argumenty)
        let argv: Vec<String> = env::args().collect();
        let py_argv: Vec<&str> = argv.iter().map(String::as_str).collect();
        sys.setattr("argv", py_argv.to_object(py))?;

        // Ustaw __file__ i __name__ żeby main.py działał poprawnie
        let globals = PyDict::new_bound(py);
        globals.set_item("__name__", "__main__")?;
        globals.set_item(
            "__file__",
            app_dir.join("main.py").to_str().unwrap_or("main.py"),
        )?;

        // Wczytaj i wykonaj main.py
        let main_py_content = std::str::from_utf8(MAIN_PY)
        .map_err(|e| {
            pyo3::exceptions::PyUnicodeDecodeError::new_err(format!(
                "Błąd dekodowania main.py: {}",
                e
            ))
        })?;

        py.run_bound(main_py_content, Some(&globals), None)?;

        Ok(())
    });

    match result {
        Ok(_) => {}
        Err(e) => {
            eprintln!("[Hacker Launcher] Błąd Pythona:\n{}", e);
            std::process::exit(1);
        }
    }
}
