import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal as TerminalIcon } from 'lucide-react';

interface TerminalProps {
    logs: LogEntry[];
    isOpen: boolean;
}

const Terminal: React.FC<TerminalProps> = ({ logs, isOpen }) => {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-0 left-20 right-0 h-48 bg-black/90 backdrop-blur-md border-t border-deck-border z-40 transition-all duration-300 ease-in-out font-mono text-sm shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center px-4 py-2 border-b border-deck-border bg-deck-card/50">
        <TerminalIcon size={14} className="text-deck-accent mr-2" />
        <span className="text-deck-muted text-xs uppercase tracking-widest">System Log // Proton Bridge</span>
        </div>
        <div className="p-4 h-[calc(100%-36px)] overflow-y-auto space-y-1">
        {logs.map((log) => (
            <div key={log.id} className="flex items-start opacity-90 hover:opacity-100">
            <span className="text-deck-muted min-w-[140px] text-xs select-none">[{log.timestamp}]</span>
            <span className={`flex-1 break-all ${
                log.type === 'error' ? 'text-red-500' :
                log.type === 'success' ? 'text-deck-success' :
                log.type === 'warning' ? 'text-yellow-400' : 'text-deck-text'
            }`}>
            {log.type === 'success' && '➜ '}
            {log.message}
            </span>
            </div>
        ))}
        <div ref={endRef} />
        </div>
        </div>
    );
};

export default Terminal;
