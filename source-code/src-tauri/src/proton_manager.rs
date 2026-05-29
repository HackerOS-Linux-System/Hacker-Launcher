use anyhow::{bail, Context, Result};
use chrono::{DateTime, Local};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
// Tauri v2: emit via AppHandle, not Window
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtonEntry {
    pub version: String,
    pub r#type: String,
    pub date: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    assets: Vec<GithubAsset>,
}

#[derive(Debug, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
}

pub struct ProtonManager {
    pub protons_dir: PathBuf,
}

impl ProtonManager {
    pub fn new(protons_dir: PathBuf) -> Self {
        fs::create_dir_all(&protons_dir).ok();
        Self { protons_dir }
    }

    pub fn get_installed_protons(&self) -> Result<Vec<ProtonEntry>> {
        let mut protons = vec![];
        if !self.protons_dir.exists() {
            return Ok(protons);
        }
        for entry in fs::read_dir(&self.protons_dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                let version = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
                let proton_type = if version.starts_with("GE-Proton") {
                    "GE"
                } else {
                    "Official"
                }
                .to_string();
                let metadata = fs::metadata(&path)?;
                let created: DateTime<Local> = metadata
                .created()
                .unwrap_or(std::time::SystemTime::now())
                .into();
                let date = created.format("%Y-%m-%d").to_string();
                protons.push(ProtonEntry {
                    version,
                    r#type: proton_type,
                    date,
                    status: "Installed".to_string(),
                });
            }
        }
        protons.sort_by(|a, b| b.version.cmp(&a.version));
        Ok(protons)
    }

    fn get_proton_binary(base: &PathBuf) -> Option<PathBuf> {
        for entry in walkdir::WalkDir::new(base).max_depth(5) {
            if let Ok(e) = entry {
                if e.file_name() == "proton" && e.file_type().is_file() {
                    return Some(e.path().to_path_buf());
                }
            }
        }
        None
    }

    pub async fn fetch_available_ge() -> Result<Vec<String>> {
        let client = reqwest::Client::builder()
        .user_agent("hacker-launcher/0.6")
        .build()?;
        let url = "https://api.github.com/repos/GloriousEggroll/proton-ge-custom/releases";
        let releases: Vec<GithubRelease> = client.get(url).send().await?.json().await?;
        let mut tags: Vec<String> = releases
        .into_iter()
        .filter(|r| r.tag_name.starts_with("GE-Proton"))
        .map(|r| r.tag_name)
        .collect();
        tags.sort_by(|a, b| version_sort_key(b).cmp(&version_sort_key(a)));
        Ok(tags)
    }

    pub async fn fetch_available_official(stable: bool) -> Result<Vec<String>> {
        let client = reqwest::Client::builder()
        .user_agent("hacker-launcher/0.6")
        .build()?;
        let url = "https://api.github.com/repos/ValveSoftware/Proton/releases";
        let releases: Vec<GithubRelease> = client.get(url).send().await?.json().await?;
        let mut tags: Vec<String> = releases
        .into_iter()
        .filter(|r| {
            let lower = r.tag_name.to_lowercase();
            if stable {
                !lower.contains("experimental") && !lower.contains("hotfix")
            } else {
                lower.contains("experimental") || lower.contains("hotfix")
            }
        })
        .map(|r| r.tag_name)
        .collect();
        tags.sort_by(|a, b| version_sort_key(b).cmp(&version_sort_key(a)));
        Ok(tags)
    }

    pub async fn check_update_async(
        version: String,
        proton_type: String,
    ) -> Result<Option<(String, String)>> {
        match proton_type.as_str() {
            "GE" => {
                let available = Self::fetch_available_ge().await?;
                if let Some(latest) = available.first() {
                    if latest != &version {
                        return Ok(Some(("GE".to_string(), latest.clone())));
                    }
                }
            }
            "Official" => {
                let stable = Self::fetch_available_official(true).await?;
                let exp = Self::fetch_available_official(false).await?;
                let mut all = stable.clone();
                all.extend(exp.clone());
                all.sort_by(|a, b| version_sort_key(b).cmp(&version_sort_key(a)));
                if let Some(latest) = all.first() {
                    if latest != &version {
                        let t = if stable.contains(latest) {
                            "Official"
                        } else {
                            "Experimental"
                        };
                        return Ok(Some((t.to_string(), latest.clone())));
                    }
                }
            }
            _ => {}
        }
        Ok(None)
    }

    // Tauri v2: accept AppHandle instead of Window
    pub async fn install_proton_async(
        protons_dir: PathBuf,
        version: String,
        proton_type: String,
        app_handle: tauri::AppHandle,
    ) -> Result<()> {
        let repo = if proton_type == "GE" {
            "GloriousEggroll/proton-ge-custom"
        } else {
            "ValveSoftware/Proton"
        };

        let client = reqwest::Client::builder()
        .user_agent("hacker-launcher/0.6")
        .build()?;

        let url = format!("https://api.github.com/repos/{}/releases", repo);
        let releases: Vec<GithubRelease> = client.get(&url).send().await?.json().await?;

        let release = releases
        .into_iter()
        .find(|r| r.tag_name == version)
        .with_context(|| format!("No release found for {}", version))?;

        let asset = release
        .assets
        .into_iter()
        .find(|a| a.name.ends_with(".tar.gz"))
        .with_context(|| format!("No tar.gz asset found for {}", version))?;

        emit_progress(&app_handle, "Downloading", 0, 100);

        let response = client.get(&asset.browser_download_url).send().await?;
        let total_size = response.content_length().unwrap_or(0);
        let mut downloaded: u64 = 0;

        let tmp_path = protons_dir.join(format!("{}.tmp.tar.gz", version));
        {
            let mut file = fs::File::create(&tmp_path)?;
            let mut stream = response.bytes_stream();
            while let Some(chunk) = stream.next().await {
                let chunk = chunk?;
                file.write_all(&chunk)?;
                downloaded += chunk.len() as u64;
                if total_size > 0 {
                    emit_progress(&app_handle, "Downloading", downloaded, total_size);
                }
            }
        }

        emit_progress(&app_handle, "Extracting", 0, 100);
        let extract_dir = protons_dir.join(&version);
        fs::create_dir_all(&extract_dir)?;

        let tmp_path_clone = tmp_path.clone();
        let extract_dir_clone = extract_dir.clone();
        let app_handle_clone = app_handle.clone();

        tokio::task::spawn_blocking(move || -> Result<()> {
            let file = fs::File::open(&tmp_path_clone)?;
            let gz = flate2::read::GzDecoder::new(file);
            let mut archive = tar::Archive::new(gz);
            let total_size = fs::metadata(&tmp_path_clone)?.len();
            let mut extracted: u64 = 0;

            for entry in archive.entries()? {
                let mut entry = entry?;
                let path = entry.path()?.to_path_buf();
                // Security: strip absolute paths
                let stripped = path
                .components()
                .skip(1)
                .collect::<std::path::PathBuf>();
                let dest = extract_dir_clone.join(&stripped);
                if let Some(parent) = dest.parent() {
                    fs::create_dir_all(parent).ok();
                }
                entry.unpack(&dest).ok();
                extracted += entry.size();
                if total_size > 0 {
                    emit_progress(&app_handle_clone, "Extracting", extracted, total_size);
                }
            }
            Ok(())
        })
        .await??;

        fs::remove_file(&tmp_path).ok();

        if Self::get_proton_binary(&extract_dir).is_none() {
            fs::remove_dir_all(&extract_dir).ok();
            bail!(
                "Proton binary not found after extraction for {}",
                version
            );
        }

        emit_progress(&app_handle, "Done", 100, 100);
        Ok(())
    }

    pub async fn install_custom_tar_async(
        protons_dir: PathBuf,
        tar_path: String,
        version: String,
        app_handle: tauri::AppHandle,
    ) -> Result<()> {
        let extract_dir = protons_dir.join(&version);
        fs::create_dir_all(&extract_dir)?;

        emit_progress(&app_handle, "Extracting", 0, 100);

        let tar_path = PathBuf::from(tar_path);
        let extract_dir_clone = extract_dir.clone();
        let app_handle_clone = app_handle.clone();

        tokio::task::spawn_blocking(move || -> Result<()> {
            let file = fs::File::open(&tar_path)?;
            let gz = flate2::read::GzDecoder::new(file);
            let mut archive = tar::Archive::new(gz);
            let total_size = fs::metadata(&tar_path)?.len();
            let mut extracted: u64 = 0;

            for entry in archive.entries()? {
                let mut entry = entry?;
                let path = entry.path()?.to_path_buf();
                let stripped = path
                .components()
                .skip(1)
                .collect::<std::path::PathBuf>();
                let dest = extract_dir_clone.join(&stripped);
                if let Some(parent) = dest.parent() {
                    fs::create_dir_all(parent).ok();
                }
                entry.unpack(&dest).ok();
                extracted += entry.size();
                if total_size > 0 {
                    emit_progress(&app_handle_clone, "Extracting", extracted, total_size);
                }
            }
            Ok(())
        })
        .await??;

        if Self::get_proton_binary(&extract_dir).is_none() {
            fs::remove_dir_all(&extract_dir).ok();
            bail!(
                "Proton binary not found after extraction for {}",
                version
            );
        }

        emit_progress(&app_handle, "Done", 100, 100);
        Ok(())
    }

    pub fn install_custom_folder(&self, src: &str, version: &str) -> Result<()> {
        let dest = self.protons_dir.join(version);
        copy_dir_all(std::path::Path::new(src), &dest)?;
        if Self::get_proton_binary(&dest).is_none() {
            fs::remove_dir_all(&dest).ok();
            bail!("Proton binary not found in folder for {}", version);
        }
        Ok(())
    }

    pub fn remove_proton(&self, version: &str) -> Result<()> {
        let path = self.protons_dir.join(version);
        if !path.exists() {
            bail!("Proton version not found: {}", version);
        }
        fs::remove_dir_all(path)?;
        Ok(())
    }
}

// Tauri v2: AppHandle::emit (global broadcast), requires tauri::Emitter trait in scope
fn emit_progress(app: &tauri::AppHandle, stage: &str, value: u64, total: u64) {
    let _ = app.emit(
        "proton_progress",
        serde_json::json!({
            "stage": stage,
            "value": value,
            "total": total
        }),
    );
}

fn copy_dir_all(src: &std::path::Path, dst: &std::path::Path) -> Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

fn version_sort_key(v: &str) -> Vec<i64> {
    v.chars()
    .filter(|c| c.is_ascii_digit() || *c == '.')
    .collect::<String>()
    .split('.')
    .filter_map(|p| p.parse::<i64>().ok())
    .collect()
}
