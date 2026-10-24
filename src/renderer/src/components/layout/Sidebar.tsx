import React, { useState } from 'react';
import {
  Folder,
  Layers,
  Globe,
  Clock,
  Plus,
  Settings,
  Database,
  PlusCircle
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const Sidebar: React.FC = () => {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace,
    collections,
    createCollection,
    environments,
    openTab
  } = useAppStore();

  const [activeNav, setActiveNav] = useState<'collections' | 'environments' | 'history'>('collections');
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newColName, setNewColName] = useState('');

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    await createWorkspace(newWsName.trim());
    setNewWsName('');
    setShowNewWorkspaceModal(false);
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    await createCollection(newColName.trim());
    setNewColName('');
    setShowNewCollectionModal(false);
  };

  return (
    <aside className="w-64 h-full bg-slate-900/90 border-r border-slate-800 flex flex-col select-none">
      {/* Workspace Selector */}
      <div className="p-2 border-b border-slate-800">
        <div className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center gap-2 overflow-hidden">
            <Layers size={14} className="text-blue-400 shrink-0" />
            <select
              value={activeWorkspaceId || ''}
              onChange={(e) => setActiveWorkspace(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer truncate max-w-[130px]"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-slate-900 text-slate-200">
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowNewWorkspaceModal(true)}
            title="Create New Workspace"
            className="text-slate-400 hover:text-blue-400 p-0.5 rounded transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Nav Tabs: Collections / Environments / History */}
      <div className="flex border-b border-slate-800 text-xs font-medium text-slate-400">
        <button
          onClick={() => setActiveNav('collections')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeNav === 'collections'
              ? 'text-blue-400 border-blue-500 bg-slate-800/40'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <Folder size={13} />
          <span>Collections</span>
        </button>
        <button
          onClick={() => setActiveNav('environments')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeNav === 'environments'
              ? 'text-blue-400 border-blue-500 bg-slate-800/40'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <Globe size={13} />
          <span>Environments</span>
        </button>
        <button
          onClick={() => setActiveNav('history')}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            activeNav === 'history'
              ? 'text-blue-400 border-blue-500 bg-slate-800/40'
              : 'border-transparent hover:text-slate-200'
          }`}
        >
          <Clock size={13} />
          <span>History</span>
        </button>
      </div>

      {/* Nav Content Area */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeNav === 'collections' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Saved Collections ({collections.length})</span>
              <button
                onClick={() => setShowNewCollectionModal(true)}
                title="New Collection"
                className="text-slate-400 hover:text-blue-400 flex items-center gap-0.5"
              >
                <Plus size={13} />
              </button>
            </div>

            {collections.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded mt-2">
                <p>No collections yet</p>
                <button
                  onClick={() => setShowNewCollectionModal(true)}
                  className="mt-2 text-blue-400 hover:underline flex items-center justify-center gap-1 mx-auto text-[11px]"
                >
                  <PlusCircle size={12} />
                  <span>Create Collection</span>
                </button>
              </div>
            ) : (
              collections.map((col) => (
                <div
                  key={col.id}
                  className="group flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800/70 hover:text-slate-100 cursor-pointer transition-colors"
                  onClick={() => {
                    openTab({
                      id: `col-${col.id}`,
                      type: 'overview',
                      title: col.name
                    });
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder size={14} className="text-amber-400/80 shrink-0" />
                    <span className="truncate">{col.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                    {new Date(col.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeNav === 'environments' && (
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Environments ({environments.length})</span>
            </div>
            {environments.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded mt-2">
                No active environment
              </div>
            ) : (
              environments.map((env) => (
                <div
                  key={env.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  <Globe size={14} className="text-emerald-400 shrink-0" />
                  <span className="truncate">{env.name}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeNav === 'history' && (
          <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded mt-2">
            Local request history will record executed endpoints here.
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Database size={13} className="text-emerald-400" />
          <span className="text-[11px] text-slate-400">SQLite Engine</span>
        </div>
        <button
          onClick={() =>
            openTab({
              id: 'tab-settings',
              type: 'settings',
              title: 'Settings'
            })
          }
          title="App Settings"
          className="p-1 hover:text-slate-200 transition-colors"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Modal: New Workspace */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 w-80 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">Create New Workspace</h3>
            <form onSubmit={handleCreateWorkspace}>
              <input
                type="text"
                placeholder="Workspace Name (e.g. Production)"
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                autoFocus
                className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 outline-none focus:border-blue-500 mb-3"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowNewWorkspaceModal(false)}
                  className="px-3 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-blue-600 text-white font-medium hover:bg-blue-500"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Collection */}
      {showNewCollectionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 w-80 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">Create New Collection</h3>
            <form onSubmit={handleCreateCollection}>
              <input
                type="text"
                placeholder="Collection Name (e.g. Users API)"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                autoFocus
                className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-slate-200 outline-none focus:border-blue-500 mb-3"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowNewCollectionModal(false)}
                  className="px-3 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-blue-600 text-white font-medium hover:bg-blue-500"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
