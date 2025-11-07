import requests
import json
import tarfile
import os
import shutil
import tempfile
import time
from datetime import datetime
from config_manager import ConfigManager
import logging

class ProtonManager:
    def __init__(self):
        self.protons_dir = ConfigManager.protons_dir
        os.makedirs(self.protons_dir, exist_ok=True)
        self.available_ge_cache = None
        self.available_official_stable_cache = None
        self.available_official_exp_cache = None
        self.cache_time = 0
        self.cache_duration = 3600  # 1 hour

    def refresh_cache_if_needed(self):
        if time.time() - self.cache_time > self.cache_duration:
            self.available_ge_cache = self.get_available_ge()
            self.available_official_stable_cache = self.get_available_official(stable=True)
            self.available_official_exp_cache = self.get_available_official(stable=False)
            self.cache_time = time.time()

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
        base = os.path.join(self.protons_dir, version)
        for root, dirs, files in os.walk(base):
            if 'proton' in files:
                return os.path.join(root, 'proton')
        raise Exception(f"Proton binary not found in {version}")

    def _version_key(self, version):
        version = version.replace('GE-Proton', '').replace('Proton-', '')
        parts = []
        current = ''
        for char in version:
            if char.isdigit() or char == '.':
                if current and not (current[-1].isdigit() or current[-1] == '.'):
                    parts.append(current)
                    current = ''
                current += char
            else:
                if current and (current[-1].isdigit() or current[-1] == '.'):
                    parts.append(current)
                    current = ''
                current += char
        if current:
            parts.append(current)
        def convert_part(part):
            try:
                return float(part) if '.' in part else int(part)
            except ValueError:
                return part
        return [convert_part(part) for part in parts]

    def get_available_ge(self):
        if self.available_ge_cache is not None:
            return self.available_ge_cache
        for attempt in range(3):
            try:
                url = 'https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases'
                response = requests.get(url, timeout=15)
                response.raise_for_status()
                releases = json.loads(response.text)
                tags = [r['tag_name'] for r in releases if 'tag_name' in r and r['tag_name'].startswith('GE-Proton')]
                tags.sort(key=self._version_key, reverse=True)
                self.available_ge_cache = tags
                return tags
            except Exception as e:
                logging.error(f"Error fetching GE protons (attempt {attempt+1}/3): {e}")
                print(f"Error fetching GE protons (attempt {attempt+1}/3): {e}")
                time.sleep(3)
        logging.warning("Failed to fetch GE protons after retries, returning empty list")
        print("Failed to fetch GE protons after retries, returning empty list")
        self.available_ge_cache = []
        return []

    def get_available_official(self, stable=True):
        if stable and self.available_official_stable_cache is not None:
            return self.available_official_stable_cache
        if not stable and self.available_official_exp_cache is not None:
            return self.available_official_exp_cache
        for attempt in range(3):
            try:
                url = 'https://api.github.com/repos/ValveSoftware/Proton/releases'
                response = requests.get(url, timeout=15)
                response.raise_for_status()
                releases = json.loads(response.text)
                filtered = [r['tag_name'] for r in releases if 'tag_name' in r]
                if stable:
                    filtered = [t for t in filtered if 'experimental' not in t.lower() and 'hotfix' not in t.lower()]
                else:
                    filtered = [t for t in filtered if 'experimental' in t.lower() or 'hotfix' in t.lower()]
                filtered.sort(key=self._version_key, reverse=True)
                if stable:
                    self.available_official_stable_cache = filtered
                else:
                    self.available_official_exp_cache = filtered
                return filtered
            except Exception as e:
                logging.error(f"Error fetching official protons (attempt {attempt+1}/3): {e}")
                print(f"Error fetching official protons (attempt {attempt+1}/3): {e}")
                time.sleep(3)
        logging.warning(f"Failed to fetch {'stable' if stable else 'experimental'} official protons after retries, returning empty list")
        print(f"Failed to fetch {'stable' if stable else 'experimental'} official protons after retries, returning empty list")
        if stable:
            self.available_official_stable_cache = []
        else:
            self.available_official_exp_cache = []
        return []

    def install_proton(self, version, proton_type, progress_callback=None):
        try:
            repo = 'GloriousEggroll/proton-ge-custom' if proton_type == 'GE' else 'ValveSoftware/Proton'
            url = f'https://api.github.com/repos/{repo}/releases'
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            releases = json.loads(response.text)
            selected_release = next((r for r in releases if r['tag_name'] == version), None)
            if not selected_release:
                logging.error(f"No release found for {version}")
                print(f"No release found for {version}")
                return False, f"No release found for {version}"
            assets = selected_release['assets']
            tar_asset = next((a for a in assets if a['name'].endswith('.tar.gz')), None)
            if not tar_asset:
                logging.error(f"No tar.gz asset found for {version}")
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
            extract_dir = os.path.join(self.protons_dir, version)
            os.makedirs(extract_dir, exist_ok=True)
            with tarfile.open(temp_tar_path) as tar:
                for member in tar.getmembers():
                    member_path = os.path.join(extract_dir, member.name)
                    abs_path = os.path.abspath(member_path)
                    if not abs_path.startswith(os.path.abspath(extract_dir)):
                        raise Exception("Path traversal detected in tar file")
                total_size = sum(m.size for m in tar.getmembers())
                extracted = 0
                for member in tar.getmembers():
                    tar.extract(member, extract_dir)
                    extracted += member.size
                    if progress_callback and total_size:
                        progress_callback("Extracting", extracted, total_size)
            subdirs = [d for d in os.listdir(extract_dir) if os.path.isdir(os.path.join(extract_dir, d))]
            if len(subdirs) == 1:
                subdir = os.path.join(extract_dir, subdirs[0])
                for item in os.listdir(subdir):
                    shutil.move(os.path.join(subdir, item), extract_dir)
                os.rmdir(subdir)
            os.remove(temp_tar_path)
            if not os.path.exists(self.get_proton_path(version)):
                shutil.rmtree(extract_dir)
                return False, f"Proton binary not found after extraction for {version}"
            logging.info(f"Installed Proton {version} ({proton_type})")
            return True, "Success"
        except Exception as e:
            logging.error(f"Error installing {proton_type} proton {version}: {e}")
            print(f"Error installing {proton_type} proton {version}: {e}")
            return False, str(e)

    def install_custom_tar(self, tar_path, version, progress_callback=None):
        try:
            extract_dir = os.path.join(self.protons_dir, version)
            os.makedirs(extract_dir, exist_ok=True)
            progress_callback("Extracting", 0, 100)
            with tarfile.open(tar_path) as tar:
                for member in tar.getmembers():
                    member_path = os.path.join(extract_dir, member.name)
                    abs_path = os.path.abspath(member_path)
                    if not abs_path.startswith(os.path.abspath(extract_dir)):
                        raise Exception("Path traversal detected in tar file")
                total_size = sum(m.size for m in tar.getmembers())
                extracted = 0
                for member in tar.getmembers():
                    tar.extract(member, extract_dir)
                    extracted += member.size
                    if progress_callback and total_size:
                        progress_callback("Extracting", extracted, total_size)
            subdirs = [d for d in os.listdir(extract_dir) if os.path.isdir(os.path.join(extract_dir, d))]
            if len(subdirs) == 1:
                subdir = os.path.join(extract_dir, subdirs[0])
                for item in os.listdir(subdir):
                    shutil.move(os.path.join(subdir, item), extract_dir)
                os.rmdir(subdir)
            if not os.path.exists(self.get_proton_path(version)):
                shutil.rmtree(extract_dir)
                return False, f"Proton binary not found after extraction for {version}"
            logging.info(f"Installed custom Proton {version} from tar")
            return True, "Success"
        except Exception as e:
            logging.error(f"Error installing custom tar: {e}")
            print(f"Error installing custom tar: {e}")
            return False, str(e)

    def install_custom_folder(self, src_folder, version):
        try:
            dest = os.path.join(self.protons_dir, version)
            shutil.copytree(src_folder, dest, dirs_exist_ok=True)
            if not os.path.exists(self.get_proton_path(version)):
                shutil.rmtree(dest)
                return False, f"Proton binary not found in folder for {version}"
            logging.info(f"Installed custom Proton {version} from folder")
            return True, "Success"
        except Exception as e:
            logging.error(f"Error installing custom folder: {e}")
            print(f"Error installing custom folder: {e}")
            return False, str(e)

    def remove_proton(self, version):
        path = os.path.join(self.protons_dir, version)
        if not os.path.exists(path):
            return False
        try:
            shutil.rmtree(path)
            logging.info(f"Removed Proton {version}")
            return True
        except Exception as e:
            logging.error(f"Error removing proton: {e}")
            print(f"Error removing proton: {e}")
            return False

    def check_update(self, version, proton_type):
        self.refresh_cache_if_needed()
        if proton_type == 'GE':
            available = self.available_ge_cache
            if available and available[0] != version:
                return ('GE', available[0])
        elif proton_type == 'Official':
            available_stable = self.available_official_stable_cache
            available_exp = self.available_official_exp_cache
            available = available_stable + available_exp
            if available and available[0] != version:
                new_type = 'Official' if available[0] in available_stable else 'Experimental'
                return (new_type, available[0])
        return None
