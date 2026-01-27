import React from 'react';
import { Monitor, Palette, Folder } from 'lucide-react';
import { SYSTEM_PATHS } from '../constants';

interface SettingsViewProps {
    currentTheme: string;
    onThemeChange: (theme: string) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ currentTheme, onThemeChange }) => {

    const themes = [
        { id: 'cyberpunk', name: 'Night City', color: '#00F0FF' },
        { id: 'matrix', name: 'The Construct', color: '#00FF00' },
        { id: 'vaporwave', name: 'Miami 84', color: '#ff71ce' },
        { id: 'dracula', name: 'Vampire', color: '#bd93f9' },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
        <h2 className="text-3xl font-bold text-white mb-8 border-b border-deck-border pb-4">Settings</h2>

        {/* Appearance */}
        <section className="bg-deck-card border border-deck-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6 text-deck-accent">
        <Palette size={24} />
        <h3 className="text-xl font-bold text-white">Appearance</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {themes.map(theme => (
            <button
            key={theme.id}
            onClick={() => onThemeChange(theme.id)}
            className={`relative p-4 rounded-xl border transition-all duration-200 text-left overflow-hidden group ${
                currentTheme === theme.id
                ? 'border-deck-accent bg-deck-accent/10 shadow-[0_0_15px_rgba(0,0,0,0.3)]'
                : 'border-deck-border bg-deck-bg hover:border-deck-muted'
            }`}
            >
            <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm text-white">{theme.name}</span>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.color }} />
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            {currentTheme === theme.id && (
                <div className="h-full bg-deck-accent w-full animate-pulse" />
            )}
            </div>
            </button>
        ))}
        </div>
        </section>

        {/* Paths */}
        <section className="bg-deck-card border border-deck-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6 text-deck-accent">
        <Folder size={24} />
        <h3 className="text-xl font-bold text-white">Storage & Paths</h3>
        </div>

        <div className="space-y-4 font-mono text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-deck-bg rounded-xl border border-deck-border">
        <span className="text-deck-muted">Base Directory</span>
        <code className="md:col-span-2 text-deck-text bg-black/30 p-2 rounded border border-white/5 truncate">
        {SYSTEM_PATHS.BASE}
        </code>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-deck-bg rounded-xl border border-deck-border">
        <span className="text-deck-muted">Proton Installations</span>
        <code className="md:col-span-2 text-deck-text bg-black/30 p-2 rounded border border-white/5 truncate">
        {SYSTEM_PATHS.PROTONS}
        </code>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-deck-bg rounded-xl border border-deck-border">
        <span className="text-deck-muted">Wine Prefixes</span>
        <code className="md:col-span-2 text-deck-text bg-black/30 p-2 rounded border border-white/5 truncate">
        {SYSTEM_PATHS.PREFIXES}
        </code>
        </div>
        </div>
        </section>

        {/* System */}
        <section className="bg-deck-card border border-deck-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6 text-deck-accent">
        <Monitor size={24} />
        <h3 className="text-xl font-bold text-white">System Optimizations</h3>
        </div>

        <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-deck-bg rounded-xl border border-deck-border">
        <div>
        <div className="font-bold text-white text-sm">Feral GameMode</div>
        <div className="text-xs text-deck-muted">Apply CPU/GPU optimizations automatically</div>
        </div>
        <div className="h-6 w-11 bg-deck-success/20 rounded-full border border-deck-success relative cursor-not-allowed opacity-80">
        <div className="absolute right-1 top-1 w-4 h-4 bg-deck-success rounded-full shadow-sm" />
        </div>
        </div>
        <div className="flex items-center justify-between p-4 bg-deck-bg rounded-xl border border-deck-border">
        <div>
        <div className="font-bold text-white text-sm">Gamescope Integration</div>
        <div className="text-xs text-deck-muted">Use Wayland compositor for window management</div>
        </div>
        <div className="h-6 w-11 bg-deck-bg border border-deck-border rounded-full relative">
        <div className="absolute left-1 top-1 w-4 h-4 bg-deck-muted rounded-full" />
        </div>
        </div>
        </div>
        </section>
        </div>
    );
};

export default SettingsView;
