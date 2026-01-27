import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import GameCard from './components/GameCard';
import Terminal from './components/Terminal';
import AddGameModal from './components/AddGameModal';
import ProtonManager from './components/ProtonManager';
import SettingsView from './components/SettingsView';
import { Game, LogEntry, ViewState } from './types';
import {
    fetchGames,
    saveGamesToDisk,
    constructLaunchCommand,
    addCustomGameToLibrary,
    loadSettings,
    saveSettings
} from './services/tauriBridge';
import { Plus, Gamepad } from 'lucide-react';
import { SYSTEM_PATHS } from './constants';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<ViewState>('library');
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);
    const [isAddGameOpen, setIsAddGameOpen] = useState(false);

    // Theme State
    const [theme, setTheme] = useState('cyberpunk');

    // Helpers
    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
                               timestamp: new Date().toLocaleTimeString(),
                               message,
                               type
        };
        setLogs(prev => [...prev, newLog]);
    }, []);

    // Initialize
    useEffect(() => {
        const initSystem = async () => {
            addLog(`Mounting /usr/share/Hacker-Launcher...`, 'info');

            // Load Settings (Theme)
            const settings = loadSettings();
            if (settings.theme) {
                setTheme(settings.theme);
                document.documentElement.setAttribute('data-theme', settings.theme);
            } else {
                document.documentElement.setAttribute('data-theme', 'cyberpunk');
            }

            // Load Games
            try {
                const data = await fetchGames();
                setGames(data);
                if (data.length > 0) {
                    addLog(`Loaded ${data.length} games from games.json`, 'success');
                } else {
                    addLog('No games found in local database.', 'warning');
                }
            } catch (e) {
                addLog('Filesystem error reading library', 'error');
            } finally {
                setLoading(false);
            }
        };
        initSystem();
    }, [addLog]);

    // Persist games whenever they change
    useEffect(() => {
        if (!loading) {
            saveGamesToDisk(games);
        }
    }, [games, loading]);

    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        saveSettings({ theme: newTheme });
        addLog(`Theme changed to ${newTheme}`, 'info');
    };

    const handleLaunch = async (game: Game) => {
        if (!game.isInstalled) {
            addLog(`Cannot launch ${game.title}: Game not installed.`, 'warning');
            setIsTerminalOpen(true);
            return;
        }

        try {
            const { cmd, env } = constructLaunchCommand(game);

            setIsTerminalOpen(true);
            addLog(`Preparing Prefix: ${env['WINEPREFIX'] || 'System Default'}`, 'info');
            addLog(`Runner: ${game.protonVersion}`, 'info');
            addLog(`Command: ${cmd}`, 'warning');

            // Simulating process execution call (real exec happens in bridge if connected)
            addLog(`Process spawned successfully.`, 'success');
            const logFile = `${SYSTEM_PATHS.LOGS}/${game.title.replace(/[^a-zA-Z0-9]/g, '_')}.log`;
            addLog(`Streaming logs to ${logFile}`, 'info');

        } catch (e) {
            addLog(`Launch failed: ${(e as Error).message}`, 'error');
        }
    };

    const handleUpdateConfig = (gameId: string, proton: string, options: string) => {
        setGames(prev => prev.map(g => g.id === gameId ? { ...g, protonVersion: proton, launchOptions: options } : g));
        addLog(`Config saved for game ID: ${gameId}`, 'success');
    };

    const handleAddCustomGame = async (gameData: Partial<Game>) => {
        try {
            const newGame = await addCustomGameToLibrary(gameData);
            setGames(prev => [newGame, ...prev]);
            addLog(`Added ${newGame.title} to library using ${newGame.protonVersion}.`, 'success');
        } catch(e) {
            addLog('Failed to add custom game.', 'error');
        }
    };

    const filteredGames = games.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen w-screen bg-deck-bg text-deck-text overflow-hidden selection:bg-deck-accent selection:text-black font-sans transition-colors duration-300">
        <Sidebar
        currentView={currentView}
        onChangeView={setCurrentView}
        toggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
        isTerminalOpen={isTerminalOpen}
        />

        <div className="flex-1 flex flex-col h-full relative">
        <Header
        onSearch={setSearchQuery}
        onAddGame={() => setIsAddGameOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-8 relative z-0">

        {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="w-12 h-12 border-4 border-deck-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="font-mono text-sm tracking-widest text-deck-accent">LOADING FILESYSTEM</span>
            </div>
        ) : (
            <div className="relative z-10">
            {currentView === 'library' && (
                <>
                <div className="flex items-end justify-between mb-8 pb-4 border-b border-deck-border">
                <div>
                <h2 className="text-3xl font-bold text-white tracking-tight mb-1">Library</h2>
                <p className="text-deck-muted text-xs uppercase tracking-widest">Local Database</p>
                </div>
                <span className="font-mono text-sm text-deck-accent">
                {filteredGames.length} <span className="text-deck-muted">ITEMS</span>
                </span>
                </div>

                {filteredGames.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6 border border-dashed border-deck-border rounded-2xl bg-deck-card/20">
                    <div className="w-20 h-20 rounded-full bg-deck-card flex items-center justify-center border border-deck-border">
                    <Gamepad className="text-deck-muted" size={40} />
                    </div>
                    <div>
                    <h3 className="text-xl font-bold text-white mb-2">No Games Found</h3>
                    <p className="text-deck-muted max-w-sm mx-auto mb-6">Your games.json is empty. Add a game manually.</p>
                    <div className="flex gap-4 justify-center">
                    <button
                    onClick={() => setIsAddGameOpen(true)}
                    className="px-6 py-2 bg-deck-accent text-black rounded-lg hover:bg-white transition-colors text-sm font-bold uppercase tracking-wider flex items-center gap-2"
                    >
                    <Plus size={16} /> Add Manual
                    </button>
                    </div>
                    </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-32">
                    {filteredGames.map(game => (
                        <GameCard
                        key={game.id}
                        game={game}
                        onLaunch={handleLaunch}
                        onUpdateConfig={handleUpdateConfig}
                        />
                    ))}
                    </div>
                )}
                </>
            )}

            {currentView === 'proton-manager' && <ProtonManager />}

            {currentView === 'settings' && <SettingsView currentTheme={theme} onThemeChange={handleThemeChange} />}
            </div>
        )}
        </main>

        <Terminal logs={logs} isOpen={isTerminalOpen} />
        <AddGameModal isOpen={isAddGameOpen} onClose={() => setIsAddGameOpen(false)} onAdd={handleAddCustomGame} />
        </div>
        </div>
    );
};

export default App;
