import React, { useState } from 'react';
import { Play, Settings2, Clock, Gamepad2, Layers } from 'lucide-react';
import { Game } from '../types';
import { FALLBACK_PROTON_VERSIONS } from '../constants';

interface GameCardProps {
    game: Game;
    onLaunch: (game: Game) => void;
    onUpdateConfig: (gameId: string, proton: string, options: string) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onLaunch, onUpdateConfig }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [localProton, setLocalProton] = useState(game.protonVersion);
    const [localOptions, setLocalOptions] = useState(game.launchOptions);

    const handleSaveConfig = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdateConfig(game.id, localProton, localOptions);
        setIsFlipped(false);
    };

    const getSourceColor = (source: string) => {
        switch(source) {
            case 'steam': return 'bg-[#1b2838] text-[#66c0f4] border-[#66c0f4]/30';
            case 'lutris': return 'bg-[#3d2608] text-[#ff9900] border-[#ff9900]/30';
            case 'heroic': return 'bg-[#180526] text-[#ad00ff] border-[#ad00ff]/30';
            default: return 'bg-deck-card text-deck-muted border-deck-border';
        }
    }

    return (
        <div
        className="relative group h-[380px] w-full perspective-1000"
        onMouseLeave={() => setIsFlipped(false)}
        >
        <div className={`relative w-full h-full duration-500 preserve-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>

        {/* FRONT SIDE */}
        <div className="absolute w-full h-full backface-hidden rounded-xl overflow-hidden bg-deck-card border border-deck-border shadow-lg group-hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] group-hover:border-deck-accent/50 transition-all">

        {/* Cover Image */}
        <div className="absolute inset-0 z-0 bg-deck-bg">
        {game.coverUrl ? (
            <img src={game.coverUrl} alt={game.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-300" />
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-deck-card text-deck-muted">
            <Gamepad2 size={48} />
            </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-[#05050A]/80 to-transparent" />
        </div>

        <div className="relative z-10 p-5 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
        <span className={`px-2 py-1 text-[10px] font-bold rounded border uppercase tracking-wider backdrop-blur-sm shadow-sm flex items-center gap-1 ${getSourceColor(game.source)}`}>
        <Gamepad2 size={10} /> {game.source}
        </span>
        </div>

        <div>
        <h3 className="text-xl font-bold font-sans text-white mb-2 leading-tight drop-shadow-md truncate">{game.title}</h3>

        <div className="flex items-center space-x-3 text-[11px] text-deck-muted mb-4 font-mono">
        <span className="flex items-center"><Clock size={11} className="mr-1.5"/> {game.playtime}h</span>
        <span className="flex items-center text-deck-accent"><Layers size={11} className="mr-1.5"/> {localProton}</span>
        </div>

        <div className="flex space-x-2">
        <button
        onClick={() => onLaunch(game)}
        className="flex-1 bg-deck-accent text-black font-bold py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-white transition-colors"
        >
        <Play size={16} fill="currentColor" />
        <span>LAUNCH</span>
        </button>
        <button
        onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
        className="w-10 bg-deck-border/50 hover:bg-deck-border text-white rounded-lg flex items-center justify-center backdrop-blur-sm transition-colors border border-white/5"
        >
        <Settings2 size={18} />
        </button>
        </div>
        </div>
        </div>
        </div>

        {/* BACK SIDE (SETTINGS) */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-xl overflow-hidden bg-deck-card border border-deck-border shadow-xl p-5 flex flex-col">

        <div className="flex items-center justify-between mb-4 pb-4 border-b border-deck-border">
        <h3 className="text-base font-bold text-white flex items-center">
        <Settings2 size={16} className="mr-2 text-deck-accent" />
        Configuration
        </h3>
        </div>

        <div className="space-y-4 flex-1">
        <div>
        <label className="text-[10px] text-deck-muted uppercase font-bold tracking-widest mb-1.5 block">Compatibility Tool</label>
        <div className="relative">
        <select
        value={localProton}
        onChange={(e) => setLocalProton(e.target.value)}
        className="w-full bg-deck-bg border border-deck-border rounded-lg p-2.5 text-xs text-white focus:border-deck-accent focus:outline-none appearance-none"
        >
        {FALLBACK_PROTON_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <div className="absolute right-3 top-3 pointer-events-none text-deck-muted">▼</div>
        </div>
        </div>

        <div>
        <label className="text-[10px] text-deck-muted uppercase font-bold tracking-widest mb-1.5 block">Launch Options</label>
        <textarea
        value={localOptions}
        onChange={(e) => setLocalOptions(e.target.value)}
        className="w-full h-24 bg-deck-bg border border-deck-border rounded-lg p-3 text-xs text-deck-text font-mono focus:border-deck-accent focus:outline-none resize-none"
        placeholder="e.g. gamemoderun %command%"
        />
        </div>
        </div>

        <div className="mt-4 flex space-x-2">
        <button
        onClick={() => setIsFlipped(false)}
        className="flex-1 py-2 rounded-lg text-xs font-bold text-deck-muted hover:bg-white/5 transition-colors"
        >
        CANCEL
        </button>
        <button
        onClick={handleSaveConfig}
        className="flex-1 py-2 rounded-lg text-xs font-bold bg-deck-secondary/20 text-deck-secondary border border-deck-secondary/50 hover:bg-deck-secondary hover:text-white transition-all"
        >
        SAVE
        </button>
        </div>
        </div>

        </div>
        </div>
    );
};

export default GameCard;
