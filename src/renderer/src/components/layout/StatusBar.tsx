import React from 'react';
import { Database, CheckCircle2, Cpu, HardDrive } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const StatusBar: React.FC = () => {
  const { systemStatus, workspaces, activeWorkspaceId } = useAppStore();
  const currentWs = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <footer className="h-6 w-full bg-slate-950 border-t border-slate-800/80 px-3 flex items-center justify-between text-[11px] text-slate-400 select-none">
      <div className="flex items-center gap-4">
        {/* DB Connection */}
        <div className="flex items-center gap-1.5">
          <Database size={11} className={systemStatus?.databaseConnected ? 'text-emerald-400' : 'text-red-400'} />
          <span className="text-slate-300">
            {systemStatus?.databaseConnected ? 'SQLite Connected' : 'DB Disconnected'}
          </span>
        </div>

        {/* Current Workspace */}
        {currentWs && (
          <div className="flex items-center gap-1 text-slate-400 border-l border-slate-800 pl-3">
            <span>Workspace:</span>
            <span className="text-slate-200 font-medium">{currentWs.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-slate-500 font-mono text-[10px]">
        <div className="flex items-center gap-1">
          <Cpu size={10} />
          <span>Electron {systemStatus?.electronVersion || '33.x'}</span>
        </div>
        <div className="flex items-center gap-1">
          <HardDrive size={10} />
          <span>Node {systemStatus?.nodeVersion || '24.x'}</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-400/80">
          <CheckCircle2 size={10} />
          <span>Offline Ready</span>
        </div>
      </div>
    </footer>
  );
};
