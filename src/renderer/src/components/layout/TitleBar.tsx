import React from 'react';
import { Minus, Square, X, Sun, Moon, Terminal, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const TitleBar: React.FC = () => {
  const { theme, setTheme, systemStatus } = useAppStore();

  const handleMinimize = () => window.electronAPI?.window.minimize();
  const handleMaximize = () => window.electronAPI?.window.maximize();
  const handleClose = () => window.electronAPI?.window.close();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="h-9 w-full bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 select-none app-drag-region z-50">
      {/* Brand & Status Indicator */}
      <div className="flex items-center gap-2 app-no-drag">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold">
          <Terminal size={14} className="text-blue-400" />
          <span>DevPilot</span>
        </div>
        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          API Studio
        </span>
        {systemStatus?.databaseConnected && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
            <ShieldCheck size={12} />
            <span>SQLite Active</span>
          </span>
        )}
      </div>

      {/* Middle Drag Info */}
      <div className="text-[11px] text-slate-500 font-mono hidden md:block">
        v{systemStatus?.version || '0.1.0'} | Local-First Architecture
      </div>

      {/* Controls: Theme & Window buttons */}
      <div className="flex items-center gap-1 app-no-drag">
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <div className="h-3.5 w-[1px] bg-slate-800 mx-1" />

        <button
          onClick={handleMinimize}
          title="Minimize"
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <Minus size={13} />
        </button>
        <button
          onClick={handleMaximize}
          title="Maximize"
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <Square size={12} />
        </button>
        <button
          onClick={handleClose}
          title="Close"
          className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </header>
  );
};
