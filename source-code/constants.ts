import { Game } from './types';

// Detect Home Directory (works in Electron/Node environment)
const HOME = process.env.HOME || '/tmp';

// Zmieniono ścieżkę na katalog użytkownika, aby uniknąć problemów z uprawnieniami
const APP_ROOT = `${HOME}/.hackeros/Hacker-Launcher`;

export const SYSTEM_PATHS = {
    BASE: APP_ROOT,
    PROTONS: `${APP_ROOT}/Protons`,
    PREFIXES: `${APP_ROOT}/Prefixes`,
    LOGS: `${APP_ROOT}/Logs`,
    CONFIG: `${APP_ROOT}/Configs`,
    STEAM_COMPAT_CLIENT_INSTALL_PATH: `${HOME}/.local/share/Steam`,
};

// Fallback versions if API fails
export const FALLBACK_PROTON_VERSIONS = [
    'Proton Experimental',
'Proton 9.0',
'Proton 8.0',
'GE-Proton9-1',
'GE-Proton8-32'
];

export const MOCK_GAMES: Game[] = [];
