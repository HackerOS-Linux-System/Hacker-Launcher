import React from 'react';
import { LayoutGrid, Cpu, Settings, Terminal } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
    currentView: ViewState;
    onChangeView: (view: ViewState) => void;
    toggleTerminal: () => void;
    isTerminalOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, toggleTerminal, isTerminalOpen }) => {
    const navItems = [
        { id: 'library', icon: LayoutGrid, label: 'Library' },
        { id: 'proton-manager', icon: Cpu, label: 'Proton' },
        { id: 'settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="w-20 h-screen bg-deck-bg/95 backdrop-blur-xl border-r border-deck-border/50 flex flex-col items-center py-6 z-50">

        <nav className="flex-1 space-y-6 w-full px-3 mt-4">
        {navItems.map((item) => (
            <button
            key={item.id}
            onClick={() => onChangeView(item.id as ViewState)}
            className={`w-full aspect-square flex flex-col items-center justify-center rounded-2xl transition-all duration-300 group relative
                ${currentView === item.id
                    ? 'bg-gradient-to-br from-deck-card to-deck-bg border border-deck-accent/30 text-deck-accent shadow-[0_0_20px_rgba(0,240,255,0.1)]'
                    : 'text-deck-muted hover:text-white hover:bg-white/5'
                }`}
                >
                <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />

                {/* Tooltip-ish indicator */}
                {currentView === item.id && (
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-deck-accent rounded-l-full blur-[2px]" />
                )}
                </button>
        ))}

        <div className="w-full h-px bg-deck-border/50 my-2" />

        <button
        onClick={toggleTerminal}
        className={`w-full aspect-square flex flex-col items-center justify-center rounded-2xl transition-all duration-300
            ${isTerminalOpen
                ? 'bg-deck-success/10 text-deck-success border border-deck-success/20 shadow-[0_0_15px_rgba(0,255,148,0.2)]'
                : 'text-deck-muted hover:text-white hover:bg-white/5'
            }`}
            >
            <Terminal size={22} />
            </button>
            </nav>
            </div>
    );
};

export default Sidebar;
