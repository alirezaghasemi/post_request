import React from 'react';
import { Send, Save, Globe } from 'lucide-react';
import type { TabItem } from '../../store/useAppStore';

interface RequestEditorProps {
  tab: TabItem;
}

export const RequestEditor: React.FC<RequestEditorProps> = ({ tab }) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-hidden">
      {/* URL & Method Bar */}
      <div className="p-3 border-b border-slate-800 flex items-center gap-2">
        <select
          defaultValue={tab.method || 'GET'}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs font-bold text-emerald-400 outline-none"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>

        <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs font-mono text-slate-200">
          <input
            type="text"
            defaultValue="https://httpbin.org/get"
            className="w-full bg-transparent outline-none"
            placeholder="Enter request URL..."
          />
        </div>

        <button
          disabled
          title="HTTP Execution Engine will be activated in Phase 2"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600/40 text-blue-300/60 text-xs font-semibold cursor-not-allowed border border-blue-500/20"
        >
          <Send size={13} />
          <span>Send (Phase 2)</span>
        </button>

        <button
          disabled
          className="p-1.5 rounded bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700/60"
        >
          <Save size={14} />
        </button>
      </div>

      {/* Notice Banner */}
      <div className="p-8 text-center max-w-lg mx-auto my-auto space-y-3">
        <div className="w-12 h-12 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
          <Globe size={22} />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">Request: {tab.title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The Phase 1 Electron foundation, SQLite database, and UI shell are running.
          The complete HTTP Execution Engine, Monaco Body Editor, Headers/Params tables, and Response Inspector will be implemented and tested in <strong>Phase 2</strong>.
        </p>
      </div>
    </div>
  );
};
