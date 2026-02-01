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
        [SYSTEM_PATHS.BASE, SYSTEM_PATHS.PROTONS, SYSTEM_PATHS.PREFIXES, SYSTEM_PATHS.LOGS, SYSTEM_PATHS.CONFIG].forEach(dir => {
            try {
                if (fs && !fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            } catch(e) {
                console.warn(`Could not create dir ${dir}:`, e);
            }
        });

    } catch (e) {
        console.warn("Node integration not available. Running in browser mode.");
    }
}

// --- CONSTANTS & HELPERS ---
const GAMES_FILE = path ? path.join(SYSTEM_PATHS.CONFIG, 'games.json') : 'games.json';
const SETTINGS_FILE = path ? path.join(SYSTEM_PATHS.CONFIG, 'settings.json') : 'settings.json';

// --- UTILS ---

const ensureDirectoryWritable = async (dirPath: string) => {
    if (!fs) return;

    // Check if exists
    if (!fs.existsSync(dirPath)) {
        try {
            fs.mkdirSync(dirPath, { recursive: true });
        } catch (e) {
            console.error(`Failed to create directory ${dirPath}:`, e);
            throw new Error(`Could not create directory: ${dirPath}. Check user permissions.`);
        }
    }
};

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

    if (child_process && path) {
        // Ensure protons dir is writable
        await ensureDirectoryWritable(SYSTEM_PATHS.PROTONS);

        const installPath = path.join(SYSTEM_PATHS.PROTONS, versionId);
        const tempFile = path.join('/tmp', `hacker-launcher-${versionId}.tar`);

        const curlCmd = `curl -L -f -A "HackerLauncher/1.0" "${downloadUrl}" -o "${tempFile}"`;
        const tarCmd = `mkdir -p "${installPath}" && tar -xf "${tempFile}" -C "${installPath}" --strip-components=1`;
        const cleanCmd = `rm "${tempFile}"`;

        const finalCmd = `${curlCmd} && ${tarCmd} && ${cleanCmd}`;

        console.log(`Executing Install: ${finalCmd}`);

        return new Promise((resolve, reject) => {
            child_process.exec(finalCmd, (error: any, _stdout: string, stderr: string) => {
                if (error) {
                    console.error("Install Error:", stderr);
                    reject(`Failed: ${stderr || error.message}`);
                } else {
                    resolve("Installation successful");
                }
            });
        });
    }

    return new Promise(resolve => setTimeout(() => resolve("[SIMULATION] Installed"), 2000));
}

export const deleteProtonVersion = async (versionId: string): Promise<boolean> => {
    if (fs && path) {
        const dir = path.join(SYSTEM_PATHS.PROTONS, versionId);
        if (fs.existsSync(dir)) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
                return true;
            } catch(e) {
                console.error("Failed to delete directory:", e);
                return false;
            }
        }
    }
    return true;
}

// --- GAME EXECUTION ---

export const constructLaunchCommand = (game: Game): {
    executable: string,
    args: string[],
    env: Record<string, string>,
    cwd: string,
    fullCmdString: string
} => {
    const env: Record<string, string> = { ...process.env } as any;

    // Paths
    const safeTitle = game.title.replace(/[^a-zA-Z0-9]/g, '_');
    const prefixPath = path ? path.join(SYSTEM_PATHS.PREFIXES, safeTitle) : `/tmp/${safeTitle}`;
    // Determine the Game Directory (Critical for the game to find its own files)
    const gameCwd = path && game.executablePath ? path.dirname(game.executablePath) : '';

    // Proton path handling
    let protonPath = game.protonVersion;
    if (game.protonVersion !== 'Native' && path) {
        // If it's a known ID like GE-Proton8-25, map it to the path
        if (!game.protonVersion.includes('/')) {
            protonPath = path.join(SYSTEM_PATHS.PROTONS, game.protonVersion, 'proton');
        }
    }

    // Environment Variables
    env['WINEPREFIX'] = prefixPath;
    env['WINEESYNC'] = '1';
    env['WINEFSYNC'] = '1';
    env['DXVK_ASYNC'] = '1';

    if (game.protonVersion !== 'Native') {
        env['STEAM_COMPAT_CLIENT_INSTALL_PATH'] = SYSTEM_PATHS.STEAM_COMPAT_CLIENT_INSTALL_PATH;
        env['STEAM_COMPAT_DATA_PATH'] = prefixPath;

        // Fix for "Unit Test" warning in ProtonFixes:
        // Use 0 or a generic AppId to tell Proton this is a manual non-steam game
        env['SteamAppId'] = '0';
        env['SteamGameId'] = '0';
        env['ProtonGameId'] = '0'; // game.id might be 'manual-123' which breaks python int casting
    }

    // Arguments Construction
    const args: string[] = [];
    const launchOptions = game.launchOptions ? game.launchOptions.split(' ') : [];

    let executable = '';

    if (game.protonVersion === 'Native') {
        executable = game.executablePath || '';
        args.push(...launchOptions);
    } else {
        // Proton / Wine Launch
        if (!game.protonVersion.includes('Wine') && !game.protonVersion.toLowerCase().includes('lutris')) {
            // Standard Proton
            executable = protonPath;
            args.push('run');
        } else {
            // System Wine fallback
            executable = 'wine';
        }

        args.push(game.executablePath || '');
        args.push(...launchOptions);
    }

    const fullCmdString = `${executable} ${args.join(' ')}`;

    return {
        executable,
        args,
        env,
        cwd: gameCwd,
        fullCmdString
    };
}

export const launchGame = async (game: Game): Promise<string> => {
    if (!child_process || !fs) throw new Error("Not running in Desktop mode");

    const safeTitle = game.title.replace(/[^a-zA-Z0-9]/g, '_');
    const logFile = path.join(SYSTEM_PATHS.LOGS, `${safeTitle}.log`);
    const prefixPath = path.join(SYSTEM_PATHS.PREFIXES, safeTitle);

    // 1. Ensure Writable Prefix & Logs & Steam Dummy Path
    await ensureDirectoryWritable(SYSTEM_PATHS.LOGS);
    await ensureDirectoryWritable(SYSTEM_PATHS.PREFIXES);

    // Create dummy Steam path to satisfy Proton scripts
    if (!fs.existsSync(SYSTEM_PATHS.STEAM_COMPAT_CLIENT_INSTALL_PATH)) {
        try {
            fs.mkdirSync(SYSTEM_PATHS.STEAM_COMPAT_CLIENT_INSTALL_PATH, { recursive: true });
        } catch(e) { console.warn("Failed to create dummy steam path", e); }
    }

    // Explicitly create the specific prefix folder if missing
    if (!fs.existsSync(prefixPath)) {
        try {
            fs.mkdirSync(prefixPath, { recursive: true });
        } catch(e) {
            throw new Error(`Failed to create prefix directory at ${prefixPath}: ${e}`);
        }
    }

    // 2. Prepare Command
    const { executable, args, env, cwd, fullCmdString } = constructLaunchCommand(game);

    return new Promise((resolve, reject) => {
        try {
            const logStream = fs.createWriteStream(logFile, { flags: 'a' });

            logStream.write(`\n\n--- LAUNCHING ${game.title} [${new Date().toISOString()}] ---\n`);
            logStream.write(`CMD: ${fullCmdString}\n`);
            logStream.write(`CWD: ${cwd}\n`); // Log the working directory
            logStream.write(`PREFIX: ${env['WINEPREFIX']}\n\n`);

            const child = child_process.spawn(executable, args, {
                env: env,
                cwd: cwd, // IMPORTANT: Set current working directory to the game folder!
                detached: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            child.stdout.pipe(logStream);
            child.stderr.pipe(logStream);

            child.on('error', (err: any) => {
                const msg = `Failed to spawn: ${err.message}`;
                logStream.write(msg + '\n');
                reject(msg);
            });

            child.on('spawn', () => {
                resolve(`Game launched. PID: ${child.pid}. Logs: ${logFile}`);
                child.unref(); // Don't block parent process
            });

        } catch (e: any) {
            reject(e.message);
        }
    });
};


// --- GAME MANAGEMENT (PERSISTENCE) ---

export const fetchGames = async (): Promise<Game[]> => {
    if (fs) {
        // Ensure config writable before reading/writing might fail later
        if (!fs.existsSync(SYSTEM_PATHS.CONFIG)) {
            await ensureDirectoryWritable(SYSTEM_PATHS.CONFIG);
        }

        if (fs.existsSync(GAMES_FILE)) {
            try {
                const raw = fs.readFileSync(GAMES_FILE, 'utf-8');
                return JSON.parse(raw);
            } catch (e) {
                console.error("Failed to read games.json", e);
                return [];
            }
        }
    }
    return [];
};

export const saveGamesToDisk = async (games: Game[]) => {
    if (fs) {
        try {
            await ensureDirectoryWritable(SYSTEM_PATHS.CONFIG);
            fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
        } catch (e) {
            console.error("Failed to save games.json", e);
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
        protonVersion: gameData.protonVersion || 'Native',
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

export const saveSettings = async (settings: any) => {
    if (fs) {
        try {
            await ensureDirectoryWritable(SYSTEM_PATHS.CONFIG);
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
