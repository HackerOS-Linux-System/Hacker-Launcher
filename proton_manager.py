import requests
import json
import tarfile
import os
import shutil
import tempfile
import time
from datetime import datetime
from config_manager import ConfigManager
class ProtonManager:
    def __init__(self):
        self.protons_dir = ConfigManager.protons_dir
        os.makedirs(self.protons_dir, exist_ok=True)
    def get_installed_protons(self):
        protons = []
        for d in os.listdir(self.protons_dir):
            if os.path.isdir(os.path.join(self.protons_dir, d)):
                proton_path = os.path.join(self.protons_dir, d)
                version = d
                proton_type = 'GE' if d.startswith('GE-Proton') else 'Official'
                install_date = datetime.fromtimestamp(os.path.getctime(proton_path)).strftime('%Y-%m-%d')
                update_info = self.check_update(version, proton_type)
                status = 'Update Available' if update_info else 'Installed'
                protons.append({'version': version, 'type': proton_type, 'date': install_date, 'status': status})
        return sorted(protons, key=lambda x: x['version'])
    def get_proton_path(self, version):
        return os.path.join(self.protons_dir, version, 'proton')
    def get_available_ge(self):
        for attempt in range(3):
            try:
                url = 'https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases'
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                releases = json.loads(response.text)
                return [r['tag_name'] for r in releases if 'tag_name' in r and r['tag_name'].startswith('GE-Proton')]
            except Exception as e:
                print(f"Error fetching GE protons (attempt {attempt+1}/3): {e}")
                time.sleep(2)
        return []
    def get_available_official(self):
        for attempt in range(3):
            try:
                url = 'https://api.github.com/repos/ValveSoftware/Proton/releases'
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                releases = json.loads(response.text)
                return [r['tag_name'] for r in releases if 'tag_name' in r and ('experimental' in r['tag_name'].lower() or 'hotfix' in r['tag_name'].lower() or r['tag_name'].startswith('Proton-'))]
            except Exception as e:
                print(f"Error fetching official protons (attempt {attempt+1}/3): {e}")
                time.sleep(2)
        return []
    def install_proton(self, version, proton_type, progress_callback=None):
        try:
            repo = 'GloriousEggroll/proton-ge-custom' if proton_type == 'GE' else 'ValveSoftware/Proton'
            url = f'https://api.github.com/repos/{repo}/releases'
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            releases = json.loads(response.text)
            selected_release = next((r for r in releases if r['tag_name'] == version), None)
            if not selected_release:
                print(f"No release found for {version}")
                return False, f"No release found for {version}"
            assets = selected_release['assets']
            tar_asset = next((a for a in assets if a['name'].endswith('.tar.gz')), None)
            if not tar_asset:
                print(f"No tar.gz asset found for {version}")
                return False, f"No tar.gz asset found for {version}"
            dl_url = tar_asset['browser_download_url']
            progress_callback("Downloading", 0, 100)
            with tempfile.NamedTemporaryFile(suffix='.tar.gz', delete=False) as temp_tar:
                response = requests.get(dl_url, stream=True, timeout=30)
                response.raise_for_status()
                total_size = int(response.headers.get('content-length', 0))
                downloaded = 0
                chunk_size = 8192
                with open(temp_tar.name, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=chunk_size):
                        if chunk:
                            f.write(chunk)
                            downloaded += len(chunk)
                            if progress_callback and total_size:
                                progress_callback("Downloading", downloaded, total_size)
                temp_tar_path = temp_tar.name
            progress_callback("Extracting", 0, 100)
            with tarfile.open(temp_tar_path) as tar:
                total_size = sum(m.size for m in tar.getmembers())
                extracted = 0
                for member in tar.getmembers():
                    tar.extract(member, self.protons_dir)
                    extracted += member.size
                    if progress_callback and total_size:
                        progress_callback("Extracting", extracted, total_size)
            os.remove(temp_tar_path)
            # Verify proton binary exists
            proton_path = os.path.join(self.protons_dir, version, 'proton')
            if not os.path.exists(proton_path):
                return False, f"Proton binary not found after extraction for {version}"
            return True, "Success"
        except Exception as e:
            print(f"Error installing {proton_type} proton {version}: {e}")
            return False, str(e)
    def install_custom_tar(self, tar_path, version, progress_callback=None):
        try:
            progress_callback("Extracting", 0, 100)
            with tarfile.open(tar_path) as tar:
                total_size = sum(m.size for m in tar.getmembers())
                extracted = 0
                for member in tar.getmembers():
                    tar.extract(member, self.protons_dir)
                    extracted += member.size
                    if progress_callback and total_size:
                        progress_callback("Extracting", extracted, total_size)
            proton_path = os.path.join(self.protons_dir, version, 'proton')
            if not os.path.exists(proton_path):
                return False, f"Proton binary not found after extraction for {version}"
            return True, "Success"
        except Exception as e:
            print(f"Error installing custom tar: {e}")
            return False, str(e)
    def install_custom_folder(self, src_folder, version):
        try:
            dest = os.path.join(self.protons_dir, version)
            shutil.copytree(src_folder, dest)
            proton_path = os.path.join(self.protons_dir, version, 'proton')
            if not os.path.exists(proton_path):
                shutil.rmtree(dest)
                return False, f"Proton binary not found in folder for {version}"
            return True, "Success"
        except Exception as e:
            print(f"Error installing custom folder: {e}")
            return False, str(e)
    def remove_proton(self, version):
        try:
            shutil.rmtree(os.path.join(self.protons_dir, version))
            return True
        except Exception as e:
            print(f"Error removing proton: {e}")
            return False
    def check_update(self, version, proton_type):
        if proton_type == 'GE':
            available = self.get_available_ge()
            if available and available[0] != version:
                return ('GE', available[0])
        elif proton_type == 'Official':
            available = self.get_available_official()
            if available and available[0] != version:
                return ('Official', available[0])
        return None
