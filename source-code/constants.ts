import { Game } from './types';

export const SYSTEM_PATHS = {
    BASE: '/usr/share/Hacker-Launcher',
    PROTONS: '/usr/share/Hacker-Launcher/Protons',
    PREFIXES: '/usr/share/Hacker-Launcher/Prefixes',
    LOGS: '/usr/share/Hacker-Launcher/Logs',
    CONFIG: '/usr/share/Hacker-Launcher/Configs',
    STEAM_COMPAT_CLIENT_INSTALL_PATH: '/home/deck/.local/share/Steam',
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
