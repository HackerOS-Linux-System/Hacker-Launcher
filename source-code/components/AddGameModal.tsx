import React, { useState, useEffect, useRef } from 'react';
import { X, FolderOpen, Gamepad, Image as ImageIcon, Terminal, Cpu } from 'lucide-react';
import { Game } from '../types';
import { getProtonVersions } from '../services/tauriBridge';
import { FALLBACK_PROTON_VERSIONS } from '../constants';

interface AddGameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (game: Partial<Game>) => void;
}

const AddGameModal: React.FC<AddGameModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [title, setTitle] = useState('');
    const [exePath, setExePath] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [backdropUrl, setBackdropUrl] = useState('');
    const [protonVersion, setProtonVersion] = useState('');
    const [launchOptions, setLaunchOptions] = useState('');
    const [availableProtons, setAvailableProtons] = useState<string[]>(FALLBACK_PROTON_VERSIONS);

    // Reference for the hidden file input
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const fetchProtons = async () => {
                try {
                    const versions = await getProtonVersions();
                    // Prefer installed ones, then list all
                    const installed = versions.filter(v => v.status === 'installed').map(v => v.id);
                    if (installed.length > 0) {
                        setAvailableProtons([...installed, ...FALLBACK_PROTON_VERSIONS]);
                        if (!protonVersion) setProtonVersion(installed[0]);
                    } else {
                        setAvailableProtons(FALLBACK_PROTON_VERSIONS);
                        if (!protonVersion) setProtonVersion(FALLBACK_PROTON_VERSIONS[0]);
                    }
                } catch {
                    setAvailableProtons(FALLBACK_PROTON_VERSIONS);
                }
            }
            fetchProtons();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title && exePath) {
            onAdd({
                title,
                executablePath: exePath,
                coverUrl,
                backdropUrl,
                protonVersion: protonVersion || 'Native',
                launchOptions
            });
            // Reset
            setTitle('');
            setExePath('');
            setCoverUrl('');
            setBackdropUrl('');
            setLaunchOptions('');
            onClose();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // In Electron with nodeIntegration: true, the File object has a 'path' property
            // containing the full absolute path.
            const fullPath = (file as any).path;

            if (fullPath) {
                setExePath(fullPath);
                // Auto-fill title if empty based on filename
                if (!title) {
                    const filename = file.name.replace(/\.[^/.]+$/, ""); // remove extension
                    setTitle(filename.charAt(0).toUpperCase() + filename.slice(1));
                }
            } else {
                // Fallback for browser testing
                setExePath(file.name);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-2xl bg-deck-bg border border-deck-border rounded-2xl shadow-2xl overflow-hidden animate-[pulse_0.2s_ease-out] flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-deck-card/50">
        <h3 className="text-white font-bold text-lg flex items-center">
        <Gamepad className="mr-2 text-deck-accent" size={20} />
        Add Non-Steam Game
        </h3>
        <button onClick={onClose} className="text-deck-muted hover:text-white transition-colors">
        <X size={20} />
        </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
        <label className="text-xs font-bold text-deck-muted uppercase tracking-wider">Game Title *</label>
        <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-deck-accent focus:outline-none transition-colors"
        placeholder="e.g. World of Warcraft"
        required
        />
        </div>

        <div className="space-y-1">
        <label className="text-xs font-bold text-deck-muted uppercase tracking-wider">Runner / Compatibility *</label>
        <div className="relative">
        <Cpu className="absolute left-3 top-3 text-deck-muted" size={16} />
        <select
        value={protonVersion}
        onChange={e => setProtonVersion(e.target.value)}
        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-white focus:border-deck-accent focus:outline-none appearance-none"
        >
        <option value="Native">Native (Linux)</option>
        {availableProtons.map(p => (
            <option key={p} value={p}>{p}</option>
        ))}
        </select>
        <div className="absolute right-3 top-3 pointer-events-none text-deck-muted">▼</div>
        </div>
        </div>
        </div>

        <div className="space-y-1">
        <label className="text-xs font-bold text-deck-muted uppercase tracking-wider">Executable Path (.exe) *</label>
        <div className="flex gap-2">
        <input
        type="text"
        value={exePath}
        onChange={e => setExePath(e.target.value)}
        className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white font-mono text-xs focus:border-deck-accent focus:outline-none transition-colors"
        placeholder="/home/deck/Games/WoW/WoW.exe"
        required
        />

        {/* Hidden File Input */}
        <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept=".exe,.sh,.bin,.bat"
        />

        <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white transition-colors group"
        title="Browse Files"
        >
        <FolderOpen size={18} className="group-hover:text-deck-accent transition-colors" />
        </button>
        </div>
        </div>

        {/* Launch Options */}
        <div className="space-y-1">
        <label className="text-xs font-bold text-deck-muted uppercase tracking-wider">Launch Options</label>
        <div className="relative">
        <Terminal className="absolute left-3 top-3 text-deck-muted" size={16} />
        <input
        type="text"
        value={launchOptions}
        onChange={e => setLaunchOptions(e.target.value)}
        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-white font-mono text-xs focus:border-deck-accent focus:outline-none transition-colors"
        placeholder="e.g. gamemoderun %command% -novid"
        />
        </div>
        </div>

        {/* Images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1">
        <label className="text-xs font-bold text-deck-muted uppercase tracking-wider">Cover Image URL</label>
        <div className="relative">
        <ImageIcon className="absolute left-3 top-3 text-deck-muted" size={16} />
        <input
        type="text"
        value={coverUrl}
        onChange={e => setCoverUrl(e.target.value)}
        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-white text-xs focus:border-deck-accent focus:outline-none transition-colors"
        placeholder="https://... (Portrait)"
        />
        </div>
        </div>
        <div className="space-y-1">
        <label className="text-xs font-bold text-deck-muted uppercase tracking-wider">Backdrop URL</label>
        <div className="relative">
        <ImageIcon className="absolute left-3 top-3 text-deck-muted" size={16} />
        <input
        type="text"
        value={backdropUrl}
        onChange={e => setBackdropUrl(e.target.value)}
        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-white text-xs focus:border-deck-accent focus:outline-none transition-colors"
        placeholder="https://... (Landscape)"
        />
        </div>
        </div>
        </div>

        <div className="pt-4 flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-deck-muted hover:bg-white/5 transition-colors">Cancel</button>
        <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-deck-accent text-black hover:bg-white transition-colors shadow-lg shadow-deck-accent/20">Add to Library</button>
        </div>
        </form>
        </div>
        </div>
    );
};

export default AddGameModal;
