import { Game, SystemStats, ProtonVersion, ProtonType } from '../types';
import { SYSTEM_PATHS } from '../constants';

declare global {
    interface Window {
        require: any;
    }
}

// --- NODE.JS INTEGRATION (ELECTRON) ---
let fs: any = null;
let path: any = null;
let child_process: any = null;

if (typeof window !== 'undefined' && window.require) {
    try {
        fs = window.require('fs');
        path = window.require('path');
        child_process = window.require('child_process');

        // Ensure directories exist on boot
        // Note: This might fail for /usr/share if not root, but we handle creation via pkexec in install later
        [SYSTEM_PATHS.BASE, SYSTEM_PATHS.PROTONS, SYSTEM_PATHS.PREFIXES, SYSTEM_PATHS.LOGS, SYSTEM_PATHS.CONFIG].forEach(dir => {
            try {
                if (fs && !fs.existsSync(dir)) {
                    // Attempt creation, suppress error if permission denied (handled later or logged)
                    fs.mkdirSync(dir, { recursive: true });
                }
            } catch(e) {
                console.warn(`Could not create dir ${dir} on boot (likely permissions):`, e);
            }
        });

    } catch (e) {
        console.warn("Node integration not available. Running in browser mode.");
    }
}

// --- CONSTANTS & HELPERS ---
const GAMES_FILE = path ? path.join(SYSTEM_PATHS.CONFIG, 'games.json') : 'games.json';
const SETTINGS_FILE = path ? path.join(SYSTEM_PATHS.CONFIG, 'settings.json') : 'settings.json';

// --- PROTON MANAGER ---

interface GithubRelease {
    tag_name: string;
    published_at: string;
    body: string;
    assets: { browser_download_url: string; name: string }[];
}

const REPOS = {
    'ge-custom': 'GloriousEggroll/proton-ge-custom',
    'official': 'ValveSoftware/Proton',
    'cachyos': 'CachyOS/proton-cachyos',
    'wine-ge': 'GloriousEggroll/wine-ge-custom'
};

const fetchGithubReleases = async (type: ProtonType): Promise<ProtonVersion[]> => {
    const repo = REPOS[type];
    if (!repo) return [];

    try {
        const response = await fetch(`https://api.github.com/repos/${repo}/releases`);
        if (!response.ok) throw new Error('GitHub API limit or error');

        const data: GithubRelease[] = await response.json();

        return data.slice(0, 20).map(release => {
            let isInstalled = false;

            // REAL FILESYSTEM CHECK
            if (fs && path) {
                const checkPath = path.join(SYSTEM_PATHS.PROTONS, release.tag_name);
                isInstalled = fs.existsSync(checkPath);
            }

            // Find compatible asset (tar.gz, tar.xz, tar.zst)
            const asset = release.assets.find(a =>
            a.name.endsWith('.tar.gz') ||
            a.name.endsWith('.tar.xz') ||
            a.name.endsWith('.tar.zst')
            );

            return {
                id: release.tag_name,
                name: release.tag_name,
                type: type,
                status: isInstalled ? 'installed' : 'available',
                releaseDate: new Date(release.published_at).toLocaleDateString(),
                                     description: release.body ? release.body.substring(0, 100) + '...' : 'No description',
                                     downloadUrl: asset?.browser_download_url
            };
        });
    } catch (error) {
        console.error(`Failed to fetch ${type}:`, error);
        return [];
    }
};

export const getProtonVersions = async (): Promise<ProtonVersion[]> => {
    const [ge, official, cachy, wine] = await Promise.all([
        fetchGithubReleases('ge-custom'),
                                                          fetchGithubReleases('official'),
                                                          fetchGithubReleases('cachyos'),
                                                          fetchGithubReleases('wine-ge')
    ]);
    return [...ge, ...official, ...cachy, ...wine];
}

export const installProtonVersion = async (versionId: string, downloadUrl?: string): Promise<string> => {
    if (!downloadUrl) throw new Error("No valid download URL found for this version.");

    // REAL IMPLEMENTATION
    if (child_process && path) {
        const installPath = path.join(SYSTEM_PATHS.PROTONS, versionId);
        // We use /tmp for download to avoid permission issues during download phase
        const tempFile = path.join('/tmp', `hacker-launcher-${versionId}.tar`);

        // 1. Check if we need root (pkexec)
        const needsRoot = installPath.startsWith('/usr') || installPath.startsWith('/opt') || installPath.startsWith('/var');

        // 2. Construct Command
        // -L follows redirects
        // -f fails on HTTP errors
        // -A sets User-Agent (Github requires this)
        const curlCmd = `curl -L -f -A "HackerLauncher/1.0" "${downloadUrl}" -o "${tempFile}"`;

        // Tar extraction command
        // We use auto-detect (-a) if available, or just -xf which modern tar handles
        const tarCmd = `mkdir -p "${installPath}" && tar -xf "${tempFile}" -C "${installPath}" --strip-components=1`;

        // Cleanup command
        const cleanCmd = `rm "${tempFile}"`;

        // Combine commands
        // If we need root, we run the mkdir/tar part via pkexec
        let finalCmd = '';

        if (needsRoot) {
            // Download to /tmp as user (usually allowed), then sudo the install
            // Note: Escape quotes for sh -c
            const installScript = `${tarCmd}`;
            finalCmd = `${curlCmd} && pkexec sh -c '${installScript}' && ${cleanCmd}`;
        } else {
            finalCmd = `${curlCmd} && ${tarCmd} && ${cleanCmd}`;
        }

        console.log(`Executing Install: ${finalCmd}`);

        return new Promise((resolve, reject) => {
            child_process.exec(finalCmd, (error: any, _stdout: string, stderr: string) => {
                if (error) {
                    console.error("Install Error Details:", stderr);
                    if (stderr.includes("polkit")) {
                        reject("Installation cancelled or permission denied by user.");
                    } else {
                        reject(`Failed: ${stderr || error.message}`);
                    }
                } else {
                    resolve("Installation successful");
                }
            });
        });
    }

    // Fallback for browser testing
    return new Promise(resolve => setTimeout(() => resolve("[SIMULATION] Installed"), 2000));
}

export const deleteProtonVersion = async (versionId: string): Promise<boolean> => {
    if (fs && path) {
        const dir = path.join(SYSTEM_PATHS.PROTONS, versionId);
        if (fs.existsSync(dir)) {
            try {
                // Try normal delete
                fs.rmSync(dir, { recursive: true, force: true });
                return true;
            } catch(e) {
                // Fallback to pkexec if permission denied
                console.log("Permission denied on delete, trying pkexec...");
                const cmd = `pkexec rm -rf "${dir}"`;
                return new Promise((resolve) => {
                    child_process.exec(cmd, (err: any) => {
                        resolve(!err);
                    });
                });
            }
        }
    }
    return true;
}

// --- GAME MANAGEMENT (PERSISTENCE) ---

export const fetchGames = async (): Promise<Game[]> => {
    if (fs && fs.existsSync(GAMES_FILE)) {
        try {
            const raw = fs.readFileSync(GAMES_FILE, 'utf-8');
            return JSON.parse(raw);
        } catch (e) {
            console.error("Failed to read games.json", e);
            return [];
        }
    }
    return [];
};

export const saveGamesToDisk = async (games: Game[]) => {
    if (fs) {
        // Ensure config dir exists (might need root if in /usr/share... ideally config should be in ~/.config)
        // For now, assuming user has rights or we use a try-catch
        try {
            fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
        } catch (e) {
            console.error("Failed to save games.json (permissions?)", e);
        }
    }
};

export const addCustomGameToLibrary = async (gameData: Partial<Game>): Promise<Game> => {
    const newGame: Game = {
        id: `manual-${Date.now()}`,
        title: gameData.title || 'Unknown Game',
        coverUrl: gameData.coverUrl || '',
        backdropUrl: gameData.backdropUrl || '',
        playtime: 0,
        lastPlayed: 'Never',
        isInstalled: true,
        protonVersion: gameData.protonVersion || 'GE-Proton8-25',
        launchOptions: gameData.launchOptions || '',
        source: 'manual',
        executablePath: gameData.executablePath
    };

    return newGame;
}

export const updateGameConfig = async (_gameId: string, _proton: string, _options: string): Promise<boolean> => {
    return true;
};

// --- SETTINGS (THEMES) ---

export const saveSettings = (settings: any) => {
    if (fs) {
        try {
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        } catch (e) { console.error(e); }
    }
}

export const loadSettings = (): any => {
    if (fs && fs.existsSync(SETTINGS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
        } catch { return {}; }
    }
    return {};
}

// --- SYSTEM STATS ---

export const getSystemStats = async (): Promise<SystemStats> => {
    return {
        cpuLoad: Math.floor(Math.random() * 30) + 10,
        gpuLoad: Math.floor(Math.random() * 40) + 20,
        ramUsage: Math.floor(Math.random() * 20) + 40,
        temp: Math.floor(Math.random() * 15) + 55,
    };
};

export const constructLaunchCommand = (game: Game): { cmd: string, env: Record<string, string> } => {
    const env: Record<string, string> = { ...process.env } as any;

    // Normalize paths
    const safeTitle = game.title.replace(/[^a-zA-Z0-9]/g, '_');
    const prefixPath = path ? path.join(SYSTEM_PATHS.PREFIXES, safeTitle) : `/tmp/${safeTitle}`;
    const protonPath = path ? path.join(SYSTEM_PATHS.PROTONS, game.protonVersion, 'proton') : game.protonVersion;

    // Manual Games configuration
    env['WINEPREFIX'] = prefixPath;
    env['WINEESYNC'] = '1';
    env['WINEFSYNC'] = '1';
    env['DXVK_ASYNC'] = '1';

    if (game.protonVersion !== 'Native') {
        env['STEAM_COMPAT_CLIENT_INSTALL_PATH'] = SYSTEM_PATHS.STEAM_COMPAT_CLIENT_INSTALL_PATH;
        env['STEAM_COMPAT_DATA_PATH'] = prefixPath;
    }

    let cmdParts: string[] = [];
    const launchOptions = game.launchOptions.split(' ');

    const gamescopeIdx = launchOptions.indexOf('--gamescope');
    if (gamescopeIdx !== -1) {
        cmdParts.push('gamescope');
        if (launchOptions.includes('-f')) cmdParts.push('-f');
        cmdParts.push('--');
    }

    if (game.protonVersion === 'Native') {
        cmdParts.push(game.executablePath || 'unknown_exe');
        cmdParts.push(...launchOptions);
    } else {
        if (!game.protonVersion.includes('Wine')) {
            // Standard Proton
            cmdParts.push(protonPath);
            cmdParts.push('run');
        } else {
            // System Wine fallback
            cmdParts.push('wine');
        }
        cmdParts.push(game.executablePath || 'unknown_exe');
        cmdParts.push(...launchOptions);
    }

    return {
        cmd: cmdParts.join(' '),
        env: env
    };
}
