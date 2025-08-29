import os
import json
class ConfigManager:
    base_dir = os.path.join(os.path.expanduser('~'), '.hackeros', 'Hacker-Launcher')
    protons_dir = os.path.join(base_dir, 'Protons')
    prefixes_dir = os.path.join(base_dir, 'Prefixes')
    config_dir = os.path.join(base_dir, 'Config')
    games_file = os.path.join(config_dir, 'games.json')
    settings_file = os.path.join(config_dir, 'settings.json')
    def __init__(self):
        os.makedirs(self.config_dir, exist_ok=True)
        os.makedirs(self.prefixes_dir, exist_ok=True)
        os.makedirs(self.protons_dir, exist_ok=True)
        self.load_settings()
    def load_games(self):
        if os.path.exists(self.games_file):
            with open(self.games_file, 'r') as f:
                return json.load(f)
        return []
    def save_games(self, games):
        with open(self.games_file, 'w') as f:
            json.dump(games, f)
    def load_settings(self):
        default_settings = {
            'fullscreen': False,
            'default_runner': 'Proton',
            'auto_update': 'Enabled',
            'default_launch_options': ''
        }
        if os.path.exists(self.settings_file):
            with open(self.settings_file, 'r') as f:
                settings = json.load(f)
                default_settings.update(settings)
        with open(self.settings_file, 'w') as f:
            json.dump(default_settings, f)
        return default_settings
    def save_settings(self, settings):
        with open(self.settings_file, 'w') as f:
            json.dump(settings, f)
