import subprocess
import os
import shutil
import logging
from config_manager import ConfigManager

class GameManager:
    def __init__(self, proton_manager):
        self.proton_manager = proton_manager
        self.config_manager = ConfigManager()

    def add_game(self, game):
        games = self.config_manager.load_games()
        games.append(game)
        self.config_manager.save_games(games)
        logging.info(f"Added game: {game['name']}")

    def remove_game(self, name):
        games = self.config_manager.load_games()
        games = [g for g in games if g['name'] != name]
        self.config_manager.save_games(games)
        logging.info(f"Removed game: {name}")

    def launch_game(self, game, gamescope=False):
        runner = game['runner']
        exe = game['exe']
        if not os.path.exists(exe) and runner != 'Steam':
            raise Exception(f"Executable does not exist: {exe}")
        launch_options = game.get('launch_options', '').split()
        env = os.environ.copy()
        prefix = game.get('prefix', '')
        if runner in ['Wine', 'Proton']:
            if not prefix:
                raise Exception("Prefix not set for Wine/Proton runner")
            # Ensure prefix is writable by the current user
            try:
                os.makedirs(prefix, exist_ok=True)
                # Fix ownership if running as root (optional, for robustness)
                if os.geteuid() == 0:  # Running as root
                    user_id = os.getuid()
                    group_id = os.getgid()
                    subprocess.run(['chown', '-R', f'{user_id}:{group_id}', prefix], check=True)
            except Exception as e:
                raise Exception(f"Failed to set up prefix {prefix}: {e}")
            env['WINEPREFIX'] = prefix
            if game.get('enable_dxvk', False):
                env['WINEDLLOVERRIDES'] = 'd3d11=n,b;dxgi=n,b'
            # Per-game overrides if set, else global
            env['WINEESYNC'] = '1' if game.get('enable_esync', self.config_manager.load_settings()['enable_esync']) else '0'
            env['WINEFSYNC'] = '1' if game.get('enable_fsync', self.config_manager.load_settings()['enable_fsync']) else '0'
            env['DXVK_ASYNC'] = '1' if game.get('enable_dxvk_async', self.config_manager.load_settings()['enable_dxvk_async']) else '0'
        cmd = []
        if gamescope:
            if not shutil.which('gamescope'):
                raise Exception("Gamescope is not installed. Please install it via your package manager (e.g., apt, dnf, pacman).")
            cmd = ['gamescope']
            # Expanded Gamescope options without duplication
            options_to_remove = []
            if '--adaptive-sync' in launch_options:
                cmd.append('--adaptive-sync')
                options_to_remove.append('--adaptive-sync')
            if '--force-grab-cursor' in launch_options:
                cmd.append('--force-grab-cursor')
                options_to_remove.append('--force-grab-cursor')
            width_idx = next((i for i, opt in enumerate(launch_options) if opt.startswith('--width=')), None)
            if width_idx is not None:
                cmd.append('-W')
                cmd.append(launch_options[width_idx].split('=')[1])
                options_to_remove.append(launch_options[width_idx])
            height_idx = next((i for i, opt in enumerate(launch_options) if opt.startswith('--height=')), None)
            if height_idx is not None:
                cmd.append('-H')
                cmd.append(launch_options[height_idx].split('=')[1])
                options_to_remove.append(launch_options[height_idx])
            if '--fullscreen' in launch_options:
                cmd.append('-f')
                options_to_remove.append('--fullscreen')
            if '--bigpicture' in launch_options:
                cmd.extend(['-e', '-f'])
                options_to_remove.append('--bigpicture')
            for opt in options_to_remove:
                if opt in launch_options:
                    launch_options.remove(opt)
            cmd.append('--')
        try:
            if runner == 'Native':
                cmd.extend([exe] + launch_options)
            elif runner == 'Wine':
                cmd.extend(['wine', exe] + launch_options)
            elif runner == 'Flatpak':
                if not shutil.which('flatpak'):
                    raise Exception("Flatpak not installed.")
                cmd.extend(['flatpak', 'run', exe] + launch_options)
            elif runner == 'Snap':
                if not shutil.which('snap'):
                    raise Exception("Snap not installed.")
                cmd.extend(['snap', 'run', exe] + launch_options)
            elif runner == 'Steam':
                app_id = game.get('app_id', '')
                if not app_id:
                    raise Exception("Steam App ID not set.")
                cmd.extend(['steam', '-applaunch', app_id] + launch_options)
            else:  # Proton
                proton_path = self.proton_manager.get_proton_path(runner)
                if not os.path.exists(proton_path):
                    raise Exception(f"Proton binary not found for {runner}")
                env['STEAM_COMPAT_DATA_PATH'] = prefix
                # Set STEAM_COMPAT_CLIENT_INSTALL_PATH
                steam_dir = os.path.expanduser('~/.steam/steam')
                if not os.path.exists(steam_dir):
                    steam_dir = os.path.expanduser('~/.local/share/Steam')
                if not os.path.exists(steam_dir):
                    # Try Flatpak Steam
                    steam_dir = os.path.expanduser('~/.var/app/com.valvesoftware.Steam/data/Steam')
                if not os.path.exists(steam_dir):
                    raise Exception("Steam installation not found. Please ensure Steam is installed.")
                env['STEAM_COMPAT_CLIENT_INSTALL_PATH'] = steam_dir
                cmd.extend([proton_path, 'run', exe] + launch_options)
                # Additional Proton fallbacks
                if 'GE-Proton' in runner:
                    try:
                        subprocess.Popen(cmd, env=env)
                        return
                    except:
                        cmd = [proton_path, 'waitforexitandrun', exe] + launch_options
            log_file = os.path.join(self.config_manager.logs_dir, f"{game['name'].replace(' ', '_')}.log")
            with open(log_file, 'w') as f:
                process = subprocess.Popen(cmd, env=env, stdout=f, stderr=f)
            logging.info(f"Launched game: {game['name']} with cmd: {' '.join(cmd)}")
        except Exception as e:
            logging.error(f"Failed to launch {game['name']}: {e}")
            raise
