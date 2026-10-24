import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Settings, Shield, HardDrive, Palette } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { theme, setTheme, systemStatus } = useAppStore();

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-900/40">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Settings size={18} className="text-blue-400" />
            <span>Preferences & Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            All configuration is stored locally in the versioned SQLite database.
          </p>
        </div>

        {/* Theme Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Palette size={14} className="text-purple-400" />
            <span>Appearance & Theme</span>
          </h3>
          <div className="flex gap-4">
            <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
              theme === 'dark' ? 'bg-slate-800 border-blue-500 text-white font-medium' : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => setTheme('dark')}
                className="hidden"
              />
              <span>Dark Theme (Default)</span>
            </label>

            <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
              theme === 'light' ? 'bg-slate-800 border-blue-500 text-white font-medium' : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={() => setTheme('light')}
                className="hidden"
              />
              <span>Light Theme</span>
            </label>
          </div>
        </div>

        {/* Local Storage & DB Section */}
        <div className="space-y-3 border-t border-slate-800 pt-5">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <HardDrive size={14} className="text-emerald-400" />
            <span>Storage & Persistence</span>
          </h3>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Database Driver:</span>
              <span className="text-slate-200 font-mono">better-sqlite3 v11 (WAL Mode)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Database Path:</span>
              <span className="text-slate-300 font-mono text-[11px] truncate max-w-sm" title={systemStatus?.databasePath}>
                {systemStatus?.databasePath || 'In-Memory / Default'}
              </span>
            </div>
          </div>
        </div>

        {/* Security Policies */}
        <div className="space-y-3 border-t border-slate-800 pt-5">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Shield size={14} className="text-blue-400" />
            <span>Security Architecture</span>
          </h3>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5 text-slate-300">
            <p>✓ Context Isolation: Enforced via Electron preload layer</p>
            <p>✓ Node.js Integration in Renderer: Disabled</p>
            <p>✓ Sandboxed Renderers: Enabled</p>
            <p>✓ Strict Content Security Policy: Configured</p>
          </div>
        </div>
      </div>
    </div>
  );
};
