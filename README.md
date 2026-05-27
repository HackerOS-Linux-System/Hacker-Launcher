# Hacker Launcher

A game launcher for running Windows games on Linux with Proton, Wine, Steam, Flatpak, and Native runners.

Rebuilt from Python (PySide6) to **Rust + Tauri + TypeScript + React**.

## Requirements

### Runtime dependencies
- `wine` — for Wine runner
- `gamescope` — optional, for Gamescope integration
- `steam` or `flatpak` — for Steam runner
- Proton versions are downloaded and managed by the launcher itself

### Build dependencies

```bash
# Rust (stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node.js >= 18
# (use your distro's package manager or nvm)

# Tauri system dependencies (Ubuntu/Debian)
sudo apt install libwebkit2gtk-4.0-dev build-essential curl wget \
  libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Tauri system dependencies (Fedora/RHEL)
sudo dnf install webkit2gtk3-devel openssl-devel curl wget \
  libappindicator-gtk3-devel librsvg2-devel

# Tauri system dependencies (Arch)
sudo pacman -S webkit2gtk base-devel curl wget openssl libappindicator-gtk3 librsvg
```

## Build & Run

```bash
# Install JS dependencies
npm install

# Development (hot reload)
npm run tauri dev

# Production build
npm run tauri build
# Binary will be in: src-tauri/target/release/hacker-launcher
```

## Data locations

All data is stored in `~/.hackeros/Hacker-Launcher/`:

| Directory | Purpose |
|-----------|---------|
| `Config/games.json` | Saved game list |
| `Config/settings.json` | Launcher settings |
| `Protons/` | Installed Proton versions |
| `Prefixes/` | Wine/Proton prefixes |
| `Logs/` | Per-game launch logs |

## Features

- ✅ Add games with Native / Wine / Proton / Flatpak / Steam runners
- ✅ Install Proton GE, Official stable/experimental, or custom tar.gz/folder
- ✅ Per-game DXVK, Esync, Fsync, DXVK-Async overrides
- ✅ Global Esync / Fsync / DXVK-Async settings
- ✅ Gamescope integration (adaptive-sync, resolution, FPS cap, bigpicture)
- ✅ Automatic Wine prefix creation
- ✅ Download progress bar for Proton installation
- ✅ Game launch logging
- ✅ Glassmorphism dark UI theme
