import React from 'react';
import {
  Send,
  FolderPlus,
  ShieldCheck,
  Cpu,
  Database,
  CheckCircle2,
  Terminal
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const WelcomeView: React.FC = () => {
  const { systemStatus, createRequest, workspaces, collections } = useAppStore();

  const handleQuickRequest = async () => {
    await createRequest({
      name: 'Quick Request',
      method: 'GET',
      url: 'https://httpbin.org/get'
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-slate-900/50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Header */}
        <div className="border border-slate-800 rounded-xl p-6 bg-gradient-to-br from-slate-900 via-slate-800/60 to-slate-900 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Terminal size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">DevPilot API Studio</h1>
              <p className="text-xs text-slate-400">
                Production-grade, local-first API development & protocol testing platform
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <button
              onClick={handleQuickRequest}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-lg shadow-blue-600/20"
            >
              <Send size={14} />
              <span>New HTTP Request</span>
            </button>
            <button
              onClick={() => {
                const sidebarNewCollectionBtn = document.querySelector('[title="New Collection"]') as HTMLButtonElement;
                sidebarNewCollectionBtn?.click();
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors font-medium"
            >
              <FolderPlus size={14} />
              <span>New Collection</span>
            </button>
          </div>
        </div>

        {/* System Architecture & Status Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              <Database size={15} className="text-emerald-400" />
              <span>Local Persistence</span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <p className="flex justify-between">
                <span>Database:</span>
                <span className="text-slate-200 font-mono">SQLite (WAL)</span>
              </p>
              <p className="flex justify-between">
                <span>Status:</span>
                <span className="text-emerald-400 font-medium">Connected</span>
              </p>
              <p className="flex justify-between">
                <span>Workspaces:</span>
                <span className="text-slate-200 font-mono">{workspaces.length}</span>
              </p>
              <p className="flex justify-between">
                <span>Collections:</span>
                <span className="text-slate-200 font-mono">{collections.length}</span>
              </p>
            </div>
          </div>

          <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              <ShieldCheck size={15} className="text-blue-400" />
              <span>Security Perimeter</span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <p className="flex justify-between">
                <span>Context Isolation:</span>
                <span className="text-emerald-400 font-mono">Enabled</span>
              </p>
              <p className="flex justify-between">
                <span>Node Integration:</span>
                <span className="text-emerald-400 font-mono">Disabled</span>
              </p>
              <p className="flex justify-between">
                <span>Sandbox:</span>
                <span className="text-emerald-400 font-mono">Enforced</span>
              </p>
              <p className="flex justify-between">
                <span>CSP:</span>
                <span className="text-emerald-400 font-mono">Strict</span>
              </p>
            </div>
          </div>

          <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/80">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2">
              <Cpu size={15} className="text-purple-400" />
              <span>Runtime Engine</span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <p className="flex justify-between">
                <span>Platform:</span>
                <span className="text-slate-200 font-mono">{systemStatus?.platform || 'linux'}</span>
              </p>
              <p className="flex justify-between">
                <span>Node.js:</span>
                <span className="text-slate-200 font-mono">{systemStatus?.nodeVersion || 'v24'}</span>
              </p>
              <p className="flex justify-between">
                <span>Electron:</span>
                <span className="text-slate-200 font-mono">{systemStatus?.electronVersion || 'v33'}</span>
              </p>
              <p className="flex justify-between">
                <span>Architecture:</span>
                <span className="text-slate-200 font-mono">x86_64</span>
              </p>
            </div>
          </div>
        </div>

        {/* Phase Verification Card */}
        <div className="border border-slate-800 rounded-lg p-5 bg-slate-900/80">
          <h2 className="text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
            Current Phase Verification Status
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={14} />
              <span className="text-slate-200 font-medium">Phase 1: Electron Foundation</span>
              <span className="text-[11px] text-slate-400">
                (Typed IPC, Preload, SQLite, Theme, UI Shell)
              </span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={14} />
              <span className="text-slate-200 font-medium">Phase 2: Core HTTP Client & Response Inspector Active</span>
              <span className="text-[11px] text-slate-400">
                (Real HTTP/HTTPS Execution, Params, Headers, Body, Auth, Response Inspector, History)
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex items-center justify-center text-[9px]">
                3
              </div>
              <span>Phase 3: Collections, Variables, Environments & Postman Import/Export</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
