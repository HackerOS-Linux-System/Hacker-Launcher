import React, { useState, useEffect } from 'react';
import { Download, Trash2, Check, Box, RefreshCw, Github, FlaskConical, Wine, Loader2, AlertTriangle } from 'lucide-react';
import { ProtonVersion, ProtonType } from '../types';
import { getProtonVersions, installProtonVersion, deleteProtonVersion } from '../services/tauriBridge';

const ProtonManager: React.FC = () => {
    const [versions, setVersions] = useState<ProtonVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ProtonType | 'all'>('all');
    const [installingId, setInstallingId] = useState<string | null>(null);

    useEffect(() => {
        loadVersions();
    }, []);

    const loadVersions = async () => {
        setLoading(true);
        setError(null);
        const data = await getProtonVersions();
        setVersions(data);
        setLoading(false);
    };

    const handleInstall = async (id: string, url?: string) => {
        setInstallingId(id);
        setError(null);

        try {
            await installProtonVersion(id, url);
            // Refresh local state to reflect change (or optimistically update)
            setVersions(prev => prev.map(v => v.id === id ? { ...v, status: 'installed' } : v));
        } catch (e: any) {
            console.error("Install failed", e);
            setError(e?.toString() || "Unknown installation error");
        } finally {
            setInstallingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        await deleteProtonVersion(id);
        setVersions(prev => prev.map(v => v.id === id ? { ...v, status: 'available' } : v));
    };

    const filteredVersions = versions.filter(v => {
        if (activeTab === 'all') return true;
        return v.type === activeTab;
    });

    const getIconForType = (type: ProtonType) => {
        switch(type) {
            case 'ge-custom': return <Box className="text-deck-secondary" size={24} />;
            case 'official': return <FlaskConical className="text-blue-400" size={24} />;
            case 'cachyos': return <Check className="text-emerald-400" size={24} />;
            case 'wine-ge': return <Wine className="text-red-400" size={24} />;
            default: return <Box size={24} />;
        }
    };

    return (
        <div className="p-8 pb-32 max-w-6xl mx-auto animate-fade-in">
        <div className="flex items-end justify-between mb-8 border-b border-deck-border pb-6">
        <div>
        <h2 className="text-3xl font-bold text-white mb-2">Proton Manager</h2>
        <p className="text-deck-muted flex items-center gap-2">
        <Github size={14} /> Fetching directly from GitHub Releases
        </p>
        </div>

        <button
        onClick={loadVersions}
        disabled={loading}
        className="p-3 bg-deck-card border border-deck-border rounded-xl hover:text-deck-accent hover:border-deck-accent transition-colors disabled:opacity-50"
        >
        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center text-red-400">
            <AlertTriangle className="mr-3" />
            <span className="font-mono text-sm">{error}</span>
            </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
            { id: 'all', label: 'All Versions' },
            { id: 'official', label: 'Valve Official' },
            { id: 'ge-custom', label: 'GE-Proton' },
            { id: 'cachyos', label: 'CachyOS' },
            { id: 'wine-ge', label: 'Wine (Lutris/GE)' }
        ].map((tab) => (
            <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all border ${
                activeTab === tab.id
                ? 'bg-deck-accent/10 border-deck-accent text-deck-accent shadow-[0_0_15px_rgba(0,240,255,0.1)]'
                : 'bg-deck-card border-transparent text-deck-muted hover:text-white hover:bg-white/5'
            }`}
            >
            {tab.label}
            </button>
        ))}
        </div>

        {loading && versions.length === 0 ? (
            <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-deck-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-deck-muted font-mono animate-pulse">CONTACTING GITHUB API...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-4">
            {filteredVersions.length === 0 ? (
                <div className="text-center py-10 text-deck-muted">No versions found for this category.</div>
            ) : (
                filteredVersions.map((version) => (
                    <div key={version.id} className="group relative bg-deck-card/40 border border-deck-border rounded-xl p-5 hover:border-deck-accent/30 transition-all duration-300 hover:bg-deck-card/60">

                    <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-black/40 border border-white/5`}>
                    {getIconForType(version.type)}
                    </div>
                    <div>
                    <h3 className="text-white font-bold text-lg flex items-center gap-3">
                    {version.name}
                    {version.type === 'cachyos' && <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">Performance</span>}
                    {version.name.toLowerCase().includes('experimental') && <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase">Experimental</span>}
                    </h3>
                    <div className="flex items-center gap-4 mt-1">
                    <span className="text-deck-muted text-xs font-mono">{version.releaseDate}</span>
                    {version.downloadUrl && <span className="text-xs text-deck-muted bg-white/5 px-2 rounded">.tar.gz</span>}
                    </div>
                    </div>
                    </div>

                    <div className="flex items-center gap-4">
                    {version.status === 'installed' ? (
                        <div className="flex items-center gap-4">
                        <span className="text-deck-success text-xs font-bold uppercase tracking-widest flex items-center gap-1 bg-deck-success/10 px-3 py-1.5 rounded-lg border border-deck-success/20">
                        <Check size={14} /> Installed
                        </span>
                        <button onClick={() => handleDelete(version.id)} className="p-2 text-deck-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Uninstall">
                        <Trash2 size={18} />
                        </button>
                        </div>
                    ) : installingId === version.id ? (
                        <div className="flex items-center gap-3 px-4 py-3 bg-black/40 rounded-lg border border-deck-accent/30 text-deck-accent">
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-wide">Installing...</span>
                        </div>
                    ) : (
                        <button
                        onClick={() => handleInstall(version.id, version.downloadUrl)}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-deck-accent/5 hover:bg-deck-accent hover:text-black border border-deck-accent/30 text-deck-accent text-sm font-bold transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]"
                        >
                        <Download size={16} /> Install
                        </button>
                    )}
                    </div>
                    </div>
                    </div>
                ))
            )}
            </div>
        )}
        </div>
    );
};

export default ProtonManager;
