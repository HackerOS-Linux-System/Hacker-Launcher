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
        app_id = game.get('app_id', '')
        prefix = game.get('prefix', '')
        launch_options = game.get('launch_options', '').split()
        fps_limit = game.get('fps_limit', '')
        env = os.environ.copy()

        # Validate inputs
        if runner != 'Steam' and not os.path.exists(exe):
            raise Exception(f"Executable does not exist: {exe}")
        if runner == 'Steam' and not app_id:
            raise Exception("Steam App ID not set")

        # Set up environment for Wine/Proton
        if runner in ['Wine'] or 'Proton' in runner:
            if not prefix:
                raise Exception("Prefix not set for Wine/Proton runner")
            try:
                os.makedirs(prefix, exist_ok=True)
                # Fix ownership if running as root with sudo
                if os.geteuid() == 0 and 'SUDO_UID' in os.environ:
                    user_id = os.environ['SUDO_UID']
                    group_id = os.environ['SUDO_GID']
                    subprocess.run(['chown', '-R', f'{user_id}:{group_id}', prefix], check=True)
                    protonfixes_dir = os.path.expanduser('~/.config/protonfixes')
                    os.makedirs(protonfixes_dir, exist_ok=True)
                    subprocess.run(['chown', '-R', f'{user_id}:{group_id}', protonfixes_dir], check=True)
            except Exception as e:
                raise Exception(f"Failed to set up prefix or protonfixes: {e}")
            env['WINEPREFIX'] = prefix
            if game.get('enable_dxvk', False):
                env['WINEDLLOVERRIDES'] = 'd3d11=n,b;dxgi=n,b'
            env['WINEESYNC'] = '1' if game.get('enable_esync', self.config_manager.settings['enable_esync']) else '0'
            env['WINEFSYNC'] = '1' if game.get('enable_fsync', self.config_manager.settings['enable_fsync']) else '0'
            env['DXVK_ASYNC'] = '1' if game.get('enable_dxvk_async', self.config_manager.settings['enable_dxvk_async']) else '0'

        # Build command
        cmd = []
        if gamescope:
            if not shutil.which('gamescope'):
                raise Exception("Gamescope is not installed. Please install it via your package manager (e.g., dnf install gamescope).")
            cmd = ['gamescope']
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
            if fps_limit:
                cmd.append('-r')
                cmd.append(str(fps_limit))
            # Remove processed options
            launch_options = [opt for opt in launch_options if opt not in options_to_remove]
            cmd.append('--')

        try:
            if runner == 'Native':
                cmd.extend([exe] + launch_options)
            elif runner == 'Wine':
                if not shutil.which('wine'):
                    raise Exception("Wine not installed. Please install it (e.g., dnf install wine).")
                cmd.extend(['wine', exe] + launch_options)
            elif runner == 'Flatpak':
                if not shutil.which('flatpak'):
                    raise Exception("Flatpak not installed. Please install it (e.g., dnf install flatpak).")
                cmd.extend(['flatpak', 'run', exe] + launch_options)
            elif runner == 'Steam':
                if shutil.which('flatpak') and not shutil.which('steam'):
                    cmd.extend(['flatpak', 'run', 'com.valvesoftware.Steam', '-applaunch', app_id] + launch_options)
                elif shutil.which('steam'):
                    cmd.extend(['steam', '-applaunch', app_id] + launch_options)
                else:
                    raise Exception("Steam or Flatpak not installed. Please install Steam (e.g., flatpak install flathub com.valvesoftware.Steam).")
            else:  # Proton
                proton_bin = self.proton_manager.get_proton_path(runner)
                if not os.path.exists(proton_bin):
                    raise Exception(f"Proton binary not found for {runner}")
                # Set up Steam environment for Proton
                steam_dir = os.path.expanduser('~/.local/share/Steam')
                os.makedirs(os.path.join(steam_dir, 'steamapps/compatdata'), exist_ok=True)  # Ensure Steam structure
                env['STEAM_COMPAT_CLIENT_INSTALL_PATH'] = steam_dir
                env['STEAM_COMPAT_DATA_PATH'] = prefix
                env['STEAM_RUNTIME'] = os.path.join(steam_dir, 'ubuntu12_32/steam-runtime')
                ld_library_path = os.path.join(steam_dir, 'ubuntu12_32') + ':' + os.path.join(steam_dir, 'ubuntu12_64')
                env['LD_LIBRARY_PATH'] = ld_library_path + ':' + env.get('LD_LIBRARY_PATH', '')
                cmd.extend([proton_bin, 'waitforexitandrun', exe] + launch_options)

            # Execute command
            log_file = os.path.join(self.config_manager.logs_dir, f"{game['name'].replace(' ', '_')}.log")
            with open(log_file, 'w') as f:
                process = subprocess.Popen(cmd, env=env, stdout=f, stderr=f)
            logging.info(f"Launched game: {game['name']} with cmd: {' '.join(cmd)}")
        except Exception as e:
            logging.error(f"Failed to launch {game['name']}: {e}")
            print(f"Error launching {game['name']}: {e}")
            raise
