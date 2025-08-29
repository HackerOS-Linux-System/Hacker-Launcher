import subprocess
import os
import shutil
from config_manager import ConfigManager
class GameManager:
    def __init__(self, proton_manager):
        self.proton_manager = proton_manager
        self.config_manager = ConfigManager()
    def add_game(self, game):
        games = self.config_manager.load_games()
        games.append(game)
        self.config_manager.save_games(games)
    def remove_game(self, name):
        games = self.config_manager.load_games()
        games = [g for g in games if g['name'] != name]
        self.config_manager.save_games(games)
    def launch_game(self, game, gamescope=False):
        runner = game['runner']
        exe = game['exe']
        launch_options = game.get('launch_options', '').split()
        if gamescope:
            if not shutil.which('gamescope'):
                raise Exception("Gamescope is not installed. Please install it using 'sudo apt install gamescope'.")
            cmd = ['gamescope', '--']
            if '--bigpicture' in launch_options:
                cmd.extend(['-e', '-f'])
                launch_options.remove('--bigpicture')
            if '--fullscreen' in launch_options:
                cmd.append('-f')
                launch_options.remove('--fullscreen')
        else:
            cmd = []
            if '--bigpicture' in launch_options:
                launch_options.remove('--bigpicture') # Handled separately if needed
            if '--fullscreen' in launch_options:
                launch_options.append('-f')
        if runner == 'Native':
            cmd.extend([exe] + launch_options)
            subprocess.Popen(cmd)
        elif runner == 'Wine':
            env = os.environ.copy()
            env['WINEPREFIX'] = game['prefix']
            cmd.extend(['wine', exe] + launch_options)
            subprocess.Popen(cmd, env=env)
        elif runner == 'Flatpak':
            cmd.extend(['flatpak', 'run', exe] + launch_options)
            subprocess.Popen(cmd)
        elif runner == 'Snap':
            cmd.extend(['snap', 'run', exe] + launch_options)
            subprocess.Popen(cmd)
        else: # Proton
            proton_path = self.proton_manager.get_proton_path(runner)
            prefix = game['prefix']
            os.makedirs(prefix, exist_ok=True)
            env = os.environ.copy()
            env['STEAM_COMPAT_DATA_PATH'] = prefix
            cmd.extend([proton_path, 'run', exe] + launch_options)
            subprocess.Popen(cmd, env=env)
