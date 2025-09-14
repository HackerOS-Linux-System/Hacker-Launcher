# config_manager.py
import os
import json
import logging
from jsonschema import validate, ValidationError  # Assuming jsonschema is available or install if needed, but per tools, no install, so skip or use simple validation

class ConfigManager:
    base_dir = os.path.join(os.path.expanduser('~'), '.hackeros', 'Hacker-Launcher')
    protons_dir = os.path.join(base_dir, 'Protons')
    prefixes_dir = os.path.join(base_dir, 'Prefixes')
    config_dir = os.path.join(base_dir, 'Config')
    logs_dir = os.path.join(base_dir, 'Logs')
    games_file = os.path.join(config_dir, 'games.json')
    settings_file = os.path.join(config_dir, 'settings.json')

    def __init__(self):
        os.makedirs(self.config_dir, exist_ok=True)
        os.makedirs(self.prefixes_dir, exist_ok=True)
        os.makedirs(self.protons_dir, exist_ok=True)
        os.makedirs(self.logs_dir, exist_ok=True)
        self.setup_logging()
        self.load_settings()

    def setup_logging(self):
        logging.basicConfig(
            filename=os.path.join(self.logs_dir, 'launcher.log'),
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )

    def load_games(self):
        if os.path.exists(self.games_file):
            try:
                with open(self.games_file, 'r') as f:
                    games = json.load(f)
                # Simple validation
                for game in games:
                    if not all(key in game for key in ['name', 'exe', 'runner', 'prefix']):
                        raise ValueError("Invalid game data")
                return games
            except (json.JSONDecodeError, IOError, ValueError) as e:
                logging.error(f"Error loading games.json: {e}")
                return []
        return []

    def save_games(self, games):
        with open(self.games_file, 'w') as f:
            json.dump(games, f, indent=4)

    def load_settings(self):
        default_settings = {
            'fullscreen': False,
            'default_runner': 'Proton',
            'auto_update': 'Enabled',
            'enable_esync': True,
            'enable_fsync': True,
            'enable_dxvk_async': False
        }
        if os.path.exists(self.settings_file):
            try:
                with open(self.settings_file, 'r') as f:
                    settings = json.load(f)
                # Simple validation
                if not isinstance(settings.get('fullscreen'), bool):
                    raise ValueError("Invalid settings data")
                default_settings.update(settings)
            except (json.JSONDecodeError, IOError, ValueError) as e:
                logging.error(f"Error loading settings.json: {e}")
        # Only save if changed, but for simplicity, save once at load if needed
        return default_settings

    def save_settings(self, settings):
        with open(self.settings_file, 'w') as f:
            json.dump(settings, f, indent=4)

