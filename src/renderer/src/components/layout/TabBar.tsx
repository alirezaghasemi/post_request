import React from 'react';
import { X, Plus, Home, Settings as SettingsIcon } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const methodColors: Record<string, string> = {
  GET: 'text-emerald-400 font-bold',
  POST: 'text-amber-400 font-bold',
  PUT: 'text-blue-400 font-bold',
  PATCH: 'text-purple-400 font-bold',
  DELETE: 'text-red-400 font-bold'
};

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, closeTab, createRequest } = useAppStore();

  const handleNewRequest = async () => {
    await createRequest({
      name: 'New Request',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/1'
    });
  };

  return (
    <div className="h-9 w-full bg-slate-900 border-b border-slate-800 flex items-center px-1 overflow-x-auto select-none">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-t text-xs cursor-pointer border-t-2 transition-all ${
                isActive
                  ? 'bg-slate-800/90 text-slate-100 border-blue-500 font-medium'
                  : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-800/40 hover:text-slate-300'
              }`}
            >
              {tab.type === 'overview' && <Home size={13} className="text-slate-400 shrink-0" />}
              {tab.type === 'settings' && <SettingsIcon size={13} className="text-slate-400 shrink-0" />}
              {tab.method && (
                <span className={`text-[10px] tracking-tight ${methodColors[tab.method] || 'text-slate-400'}`}>
                  {tab.method}
                </span>
              )}

              <span className="truncate max-w-[120px]">{tab.title}</span>

              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700/80 hover:text-red-400 transition-opacity"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={handleNewRequest}
          title="New Request"
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-1"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};
