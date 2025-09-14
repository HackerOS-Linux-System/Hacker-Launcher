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
                # Fix ownership if running as root
                if os.geteuid() == 0:
                    user_id = os.getuid()
                    group_id = os.getgid()
                    subprocess.run(['chown', '-R', f'{user_id}:{group_id}', prefix], check=True)
                    # Ensure protonfixes directory is accessible
                    protonfixes_dir = os.path.expanduser('~/.config/protonfixes')
                    os.makedirs(protonfixes_dir, exist_ok=True)
                    subprocess.run(['chown', '-R', f'{user_id}:{group_id}', protonfixes_dir], check=True)
            except Exception as e:
                raise Exception(f"Failed to set up prefix or protonfixes: {e}")
            env['WINEPREFIX'] = prefix
            if game.get('enable_dxvk', False):
                env['WINEDLLOVERRIDES'] = 'd3d11=n,b;dxgi=n,b'
            env['WINEESYNC'] = '1' if game.get('enable_esync', self.config_manager.load_settings()['enable_esync']) else '0'
            env['WINEFSYNC'] = '1' if game.get('enable_fsync', self.config_manager.load_settings()['enable_fsync']) else '0'
            env['DXVK_ASYNC'] = '1' if game.get('enable_dxvk_async', self.config_manager.load_settings()['enable_dxvk_async']) else '0'

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
            for opt in options_to_remove:
                if opt in launch_options:
                    launch_options.remove(opt)
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
                if not shutil.which('steam') and not shutil.which('flatpak'):
                    raise Exception("Steam or Flatpak not installed. Please install Steam (e.g., flatpak install flathub com.valvesoftware.Steam).")
                cmd.extend(['steam', '-applaunch', app_id] + launch_options)
            else:  # Proton
                proton_path = self.proton_manager.get_proton_path(runner)
                if not os.path.exists(proton_path):
                    raise Exception(f"Proton binary not found for {runner}")
                # Proton runs standalone, no Steam dependency
                env['STEAM_COMPAT_DATA_PATH'] = prefix
                # Set a dummy STEAM_COMPAT_CLIENT_INSTALL_PATH to avoid KeyError
                env['STEAM_COMPAT_CLIENT_INSTALL_PATH'] = os.path.expanduser('~/.hackeros/Hacker-Launcher')
                cmd.extend([proton_path, 'run', exe] + launch_options)
                # Fallback for GE-Proton
                if 'GE-Proton' in runner:
                    try:
                        subprocess.Popen(cmd, env=env)
                        return
                    except:
                        cmd = [proton_path, 'waitforexitandrun', exe] + launch_options

            # Execute command
            log_file = os.path.join(self.config_manager.logs_dir, f"{game['name'].replace(' ', '_')}.log")
            with open(log_file, 'w') as f:
                process = subprocess.Popen(cmd, env=env, stdout=f, stderr=f)
            logging.info(f"Launched game: {game['name']} with cmd: {' '.join(cmd)}")
        except Exception as e:
            logging.error(f"Failed to launch {game['name']}: {e}")
            raise
