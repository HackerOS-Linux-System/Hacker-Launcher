export type GameSource = 'steam' | 'lutris' | 'heroic' | 'manual';

export interface Game {
    id: string;
    title: string;
    coverUrl: string;
    backdropUrl: string;
    playtime: number; // in hours
    lastPlayed: string;
    isInstalled: boolean;
    protonVersion: string;
    launchOptions: string;
    source: GameSource;
    executablePath?: string; // For manual games
}

export type ProtonType = 'official' | 'ge-custom' | 'cachyos' | 'wine-ge';

export interface ProtonVersion {
    id: string;
    name: string; // e.g., "GE-Proton8-25"
    type: ProtonType;
    status: 'installed' | 'available' | 'downloading';
    downloadProgress?: number;
    releaseDate?: string;
    description?: string;
    downloadUrl?: string; // URL for the tar.gz
}

export interface SystemStats {
    cpuLoad: number;
    gpuLoad: number;
    ramUsage: number;
    temp: number;
}

export interface LogEntry {
    id: string;
    timestamp: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
}

export type ViewState = 'library' | 'proton-manager' | 'settings' | 'terminal';
