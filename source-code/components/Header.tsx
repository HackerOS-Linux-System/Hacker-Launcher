import React, { useState, useEffect } from 'react';
import { Search, Wifi, Zap, Plus, Activity } from 'lucide-react';
import { getSystemStats } from '../services/tauriBridge';
import { SystemStats } from '../types';

interface HeaderProps {
    onSearch: (query: string) => void;
    onAddGame: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch, onAddGame }) => {
    const [stats, setStats] = useState<SystemStats>({ cpuLoad: 0, gpuLoad: 0, ramUsage: 0, temp: 0 });
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timeInterval = setInterval(() => setTime(new Date()), 60000);
        const statsInterval = setInterval(async () => {
            const newStats = await getSystemStats();
            setStats(newStats);
        }, 2000);
        return () => {
            clearInterval(timeInterval);
            clearInterval(statsInterval);
        };
    }, []);

    return (
        <header className="h-24 px-8 flex items-center justify-between z-40 bg-transparent">

        {/* Search Bar & Actions */}
        <div className="flex items-center space-x-4 flex-1 mr-12">
        <div className="relative w-full max-w-md group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-deck-muted group-focus-within:text-deck-accent transition-colors duration-300" size={18} />
        <input
        type="text"
        placeholder="Search Library..."
        onChange={(e) => onSearch(e.target.value)}
        className="w-full bg-black/40 border border-deck-border rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder-deck-muted/50 focus:outline-none focus:border-deck-accent focus:bg-black/60 transition-all duration-300 shadow-inner"
        />
        </div>

        <div className="h-8 w-px bg-white/10 mx-2" />

        <button
        onClick={onAddGame}
        className="flex items-center px-4 h-10 rounded-xl bg-deck-accent/10 border border-deck-accent/20 hover:bg-deck-accent hover:text-black text-deck-accent font-medium text-xs tracking-wide transition-all uppercase"
        >
        <Plus size={16} className="mr-2" />
        Add Game
        </button>
        </div>

        {/* System Stats Widget */}
        <div className="flex items-center space-x-6">
        <div className="hidden lg:flex items-center gap-1 bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 shadow-2xl">

        <div className="flex flex-col items-center justify-center w-16 h-12 bg-deck-card/50 rounded-xl border border-white/5 relative overflow-hidden group">
        <div className="absolute bottom-0 left-0 right-0 bg-deck-accent/10 h-full origin-bottom transition-transform duration-500" style={{ transform: `scaleY(${stats.cpuLoad / 100})` }} />
        <span className="text-[9px] text-deck-muted font-bold relative z-10">CPU</span>
        <span className="text-xs font-mono font-bold text-white relative z-10">{stats.cpuLoad}%</span>
        </div>

        <div className="flex flex-col items-center justify-center w-16 h-12 bg-deck-card/50 rounded-xl border border-white/5 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 bg-deck-secondary/10 h-full origin-bottom transition-transform duration-500" style={{ transform: `scaleY(${stats.gpuLoad / 100})` }} />
        <span className="text-[9px] text-deck-muted font-bold relative z-10">GPU</span>
        <span className="text-xs font-mono font-bold text-white relative z-10">{stats.gpuLoad}%</span>
        </div>

        <div className="flex flex-col items-center justify-center w-16 h-12 bg-deck-card/50 rounded-xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-deck-success shadow-[0_0_5px_#00ff94]" />
        <span className="text-[9px] text-deck-muted font-bold flex items-center"><Activity size={8} className="mr-1"/> TMP</span>
        <span className="text-xs font-mono font-bold text-white">{stats.temp}°</span>
        </div>

        </div>

        {/* System Icons & Time */}
        <div className="flex items-center space-x-5 text-deck-muted pl-4 border-l border-white/5">
        <Wifi size={18} />
        <Zap size={18} />
        <div className="text-3xl font-light text-white font-mono tracking-tighter">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        </div>
        </div>
        </header>
    );
};

export default Header;
