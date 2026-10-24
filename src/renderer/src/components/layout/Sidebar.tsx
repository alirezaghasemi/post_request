import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  Layers,
  Globe,
  Clock,
  Plus,
  Settings,
  Database,
  PlusCircle,
  Play,
  BookOpen,
  Server,
  FileCode,
  Code2,
  Radio,
  Wifi,
  Workflow,
  Shield,
  GitCompare,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface SidebarProps {
  onRunCollection?: (collectionId: string) => void;
  onViewDocs?: (collectionId: string) => void;
  onOpenMock?: (collectionId?: string) => void;
  onOpenOpenApiImport?: () => void;
  onOpenGraphQL?: () => void;
  onOpenWebSocket?: () => void;
  onOpenMqtt?: () => void;
  onOpenCiWorkflow?: (collectionId?: string) => void;
  onOpenProxy?: () => void;
  onOpenGitDiff?: (collectionId?: string) => void;
  onOpenAi?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onRunCollection,
  onViewDocs,
  onOpenMock,
  onOpenOpenApiImport,
  onOpenGraphQL,
  onOpenWebSocket,
  onOpenMqtt,
  onOpenCiWorkflow,
  onOpenProxy,
  onOpenGitDiff,
  onOpenAi
}) => {
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
    createWorkspace,
    collections,
    requestsByCollection,
    createCollection,
    createRequest,
    environments,
    history,
    clearHistory,
    openTab,
    sidebarWidth,
    setSidebarWidth,
    sidebarCollapsed,
    toggleSidebarCollapsed
  } = useAppStore();

  const [activeNav, setActiveNav] = useState<'collections' | 'environments' | 'history'>('collections');
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newColName, setNewColName] = useState('');
  const [isResizing, setIsResizing] = useState(false);

  // Resize drag handling with mouse
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      setSidebarWidth(e.clientX);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, setSidebarWidth]);

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

  // 1. Collapsed Mode: Sleek Rail View (48px)
  if (sidebarCollapsed) {
    return (
      <aside className="w-12 min-w-[48px] max-w-[48px] h-full bg-slate-900 border-r border-slate-800 flex flex-col items-center py-2 select-none justify-between z-20">
        <div className="flex flex-col items-center gap-2 w-full">
          {/* Expand Toggle */}
          <button
            onClick={toggleSidebarCollapsed}
            title="Expand Sidebar (Ctrl+B)"
            className="p-2 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
          >
            <PanelLeftOpen size={16} />
          </button>

          <div className="w-6 h-[1px] bg-slate-800 my-0.5" />

          {/* Primary Nav Icons */}
          <button
            onClick={() => {
              setActiveNav('collections');
              toggleSidebarCollapsed();
            }}
            title={`Collections (${collections.length})`}
            className={`p-2 rounded transition-colors relative ${
              activeNav === 'collections'
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Folder size={16} />
            {collections.length > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => {
              setActiveNav('environments');
              toggleSidebarCollapsed();
            }}
            title={`Environments (${environments.length})`}
            className={`p-2 rounded transition-colors ${
              activeNav === 'environments'
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Globe size={16} />
          </button>

          <button
            onClick={() => {
              setActiveNav('history');
              toggleSidebarCollapsed();
            }}
            title={`History (${history.length})`}
            className={`p-2 rounded transition-colors ${
              activeNav === 'history'
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Clock size={16} />
          </button>

          <div className="w-6 h-[1px] bg-slate-800 my-1" />

          {/* Quick Action Tools in Rail */}
          <button
            onClick={() => onOpenOpenApiImport?.()}
            title="Import OpenAPI / Swagger"
            className="p-1.5 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
          >
            <FileCode size={15} />
          </button>
          <button
            onClick={() => onOpenMock?.()}
            title="Local Mock Server"
            className="p-1.5 rounded text-slate-400 hover:text-purple-400 hover:bg-slate-800 transition-colors"
          >
            <Server size={15} />
          </button>
          <button
            onClick={() => onOpenGraphQL?.()}
            title="GraphQL Studio"
            className="p-1.5 rounded text-slate-400 hover:text-pink-400 hover:bg-slate-800 transition-colors"
          >
            <Code2 size={15} />
          </button>
          <button
            onClick={() => onOpenWebSocket?.()}
            title="WebSocket Client"
            className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
          >
            <Radio size={15} />
          </button>
          <button
            onClick={() => onOpenMqtt?.()}
            title="MQTT Client"
            className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
          >
            <Wifi size={15} />
          </button>
          <button
            onClick={() => onOpenProxy?.()}
            title="Traffic Proxy"
            className="p-1.5 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
          >
            <Shield size={15} />
          </button>
          <button
            onClick={() => onOpenGitDiff?.()}
            title="Git Diff & Versioning"
            className="p-1.5 rounded text-slate-400 hover:text-orange-400 hover:bg-slate-800 transition-colors"
          >
            <GitCompare size={15} />
          </button>
          <button
            onClick={() => onOpenAi?.()}
            title="AI Assistant"
            className="p-1.5 rounded text-slate-400 hover:text-violet-400 hover:bg-slate-800 transition-colors"
          >
            <Sparkles size={15} />
          </button>
          <button
            onClick={() => onOpenCiWorkflow?.()}
            title="CI/CD Pipeline Generator"
            className="p-1.5 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
          >
            <Workflow size={15} />
          </button>
        </div>

        {/* Bottom Rail Actions */}
        <div className="flex flex-col items-center gap-1 w-full">
          <button
            onClick={() =>
              openTab({
                id: 'tab-settings',
                type: 'settings',
                title: 'Settings'
              })
            }
            title="App Settings"
            className="p-2 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Settings size={15} />
          </button>
        </div>
      </aside>
    );
  }

  // 2. Expanded Mode: Resizable, Flexible Sidebar
  return (
    <aside
      className="relative h-full bg-slate-900/95 border-r border-slate-800 flex flex-col select-none shrink-0"
      style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
    >
      {/* Interactive Resizing Drag Handle on Right Border */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={() => setSidebarWidth(320)}
        title="Drag to resize width (Double-click to reset)"
        className={`absolute top-0 -right-1 w-2.5 h-full cursor-col-resize z-30 transition-colors flex items-center justify-center ${
          isResizing ? 'bg-blue-500/30' : 'hover:bg-blue-500/20'
        }`}
      >
        <div
          className={`w-[2px] h-8 rounded-full ${
            isResizing ? 'bg-blue-400' : 'bg-slate-700 hover:bg-blue-400'
          } transition-colors`}
        />
      </div>

      {/* Workspace Selector & Collapse Header */}
      <div className="p-2 border-b border-slate-800">
        <div className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-800/80 border border-slate-700/60">
          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-1">
            <Layers size={14} className="text-blue-400 shrink-0" />
            <select
              value={activeWorkspaceId || ''}
              onChange={(e) => setActiveWorkspace(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer truncate w-full"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-slate-900 text-slate-200">
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowNewWorkspaceModal(true)}
              title="Create New Workspace"
              className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-slate-700/60 transition-colors"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={toggleSidebarCollapsed}
              title="Collapse Sidebar (Ctrl+B)"
              className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-slate-700/60 transition-colors"
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Nav Tabs: Collections / Environments / History */}
      <div className="flex border-b border-slate-800 text-xs font-medium text-slate-400 shrink-0">
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
          <div className="space-y-1.5">
            {/* Header: Title and New Collection Button */}
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span className="truncate">Saved Collections ({collections.length})</span>
              <button
                onClick={() => setShowNewCollectionModal(true)}
                title="Create New Collection"
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors"
              >
                <Plus size={13} />
                <span>New</span>
              </button>
            </div>

            {/* Quick Tools Toolbar: Neatly formatted in a dedicated bar */}
            <div className="mx-1 p-1 bg-slate-950/70 border border-slate-800/80 rounded-md flex items-center justify-between gap-0.5 text-slate-400">
              <button
                onClick={() => onOpenOpenApiImport?.()}
                title="Import OpenAPI / Swagger"
                className="p-1 hover:text-emerald-400 hover:bg-slate-800/80 rounded transition-colors"
              >
                <FileCode size={13} />
              </button>
              <button
                onClick={() => onOpenMock?.()}
                title="Local Mock Server"
                className="p-1 hover:text-purple-400 hover:bg-slate-800/80 rounded transition-colors"
              >
                <Server size={13} />
              </button>
              <button
                onClick={() => onOpenGraphQL?.()}
                title="GraphQL Studio"
                className="p-1 hover:text-pink-400 hover:bg-slate-800/80 rounded transition-colors"
              >
                <Code2 size={13} />
              </button>
              <button
                onClick={() => onOpenWebSocket?.()}
                title="WebSocket Client"
                className="p-1 hover:text-cyan-400 hover:bg-slate-800/80 rounded transition-colors"
              >
                <Radio size={13} />
              </button>
              <button
                onClick={() => onOpenMqtt?.()}
                title="MQTT Client"
                className="p-1 hover:text-amber-400 hover:bg-slate-800/80 rounded transition-colors"
              >
                <Wifi size={13} />
              </button>
              <button
                onClick={() => onOpenProxy?.()}
                title="Traffic Proxy (Capture Network)"
                className="p-1 hover:text-emerald-400 hover:bg-slate-800/80 rounded transition-colors"
              >
                <Shield size={13} />
              </button>
              <button
                onClick={() => onOpenGitDiff?.()}
                title="Git Diff & Versioning"
                className="p-1 hover:text-orange-400 hover:bg-slate-800/80 rounded transition-colors"
              >
                <GitCompare size={13} />
              </button>
              <button
                onClick={() => onOpenAi?.()}
                title="AI Assistant (Prompt, Tests, Docs)"
                className="p-1 hover:text-violet-400 hover:bg-slate-800/80 rounded transition-colors"
              >
                <Sparkles size={13} />
              </button>
              <button
                onClick={() => onOpenCiWorkflow?.()}
                title="CI/CD Automation (GitHub Actions)"
                className="p-1 hover:text-indigo-400 hover:bg-slate-800/80 rounded transition-colors"
              >
                <Workflow size={13} />
              </button>
            </div>

            {/* Collections List */}
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
              collections.map((col) => {
                const requests = requestsByCollection[col.id] || [];

                return (
                  <div key={col.id} className="space-y-0.5">
                    <div
                      className="group flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800/70 hover:text-slate-100 cursor-pointer transition-colors"
                      onClick={() => {
                        openTab({
                          id: `col-${col.id}`,
                          type: 'overview',
                          title: col.name
                        });
                      }}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 mr-1">
                        <Folder size={14} className="text-amber-400/80 shrink-0" />
                        <span className="truncate font-medium">{col.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDocs?.(col.id);
                          }}
                          title="Generate API Documentation"
                          className="p-0.5 hover:text-blue-400"
                        >
                          <BookOpen size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMock?.(col.id);
                          }}
                          title="Mock Collection"
                          className="p-0.5 hover:text-purple-400"
                        >
                          <Server size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRunCollection?.(col.id);
                          }}
                          title="Run Collection"
                          className="p-0.5 hover:text-emerald-400"
                        >
                          <Play size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCiWorkflow?.(col.id);
                          }}
                          title="Generate CI/CD Pipeline"
                          className="p-0.5 hover:text-indigo-400"
                        >
                          <Workflow size={12} />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await createRequest({
                              name: 'New Request',
                              method: 'GET',
                              url: 'https://httpbin.org/get',
                              collectionId: col.id
                            });
                          }}
                          title="Add Request"
                          className="p-0.5 hover:text-blue-400"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Nested Requests */}
                    {requests.length > 0 && (
                      <div className="pl-4 space-y-0.5 border-l border-slate-800/80 ml-3">
                        {requests.map((req) => (
                          <div
                            key={req.id}
                            onClick={() => {
                              openTab({
                                id: `req-${req.id}`,
                                type: 'request',
                                title: req.name,
                                method: req.method,
                                url: req.url,
                                requestId: req.id
                              });
                            }}
                            className="flex items-center gap-2 px-2 py-1 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 cursor-pointer truncate"
                          >
                            <span
                              className={`text-[9px] font-bold shrink-0 ${
                                req.method === 'GET'
                                  ? 'text-emerald-400'
                                  : req.method === 'POST'
                                  ? 'text-amber-400'
                                  : req.method === 'PUT'
                                  ? 'text-blue-400'
                                  : 'text-purple-400'
                              }`}
                            >
                              {req.method}
                            </span>
                            <span className="truncate">{req.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeNav === 'environments' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Environments ({environments.length})</span>
              <button
                onClick={() =>
                  openTab({
                    id: 'tab-environments',
                    type: 'overview',
                    title: 'Environments'
                  })
                }
                title="Manage Environments"
                className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-slate-800"
              >
                <Plus size={13} />
              </button>
            </div>
            {environments.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded mt-2">
                No active environment
              </div>
            ) : (
              environments.map((env) => (
                <div
                  key={env.id}
                  onClick={() =>
                    openTab({
                      id: 'tab-environments',
                      type: 'overview',
                      title: 'Environments'
                    })
                  }
                  className="flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Globe size={14} className={env.isActive ? 'text-emerald-400' : 'text-slate-500'} />
                    <span className="truncate">{env.name}</span>
                  </div>
                  {env.isActive && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded font-medium">
                      Active
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeNav === 'history' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Execution History ({history.length})</span>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => clearHistory()}
                  className="text-[10px] text-red-400/80 hover:text-red-400 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded mt-2">
                No requests executed yet.
              </div>
            ) : (
              history.map((item) => {
                const is2xx = item.statusCode >= 200 && item.statusCode < 300;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      openTab({
                        id: `hist-${item.id}`,
                        type: 'request',
                        title: item.url.replace(/^https?:\/\//, ''),
                        method: item.method,
                        url: item.url
                      });
                    }}
                    className="group flex items-center justify-between px-2.5 py-1.5 rounded text-xs hover:bg-slate-800/70 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`text-[10px] font-bold ${
                          item.method === 'GET'
                            ? 'text-emerald-400'
                            : item.method === 'POST'
                            ? 'text-amber-400'
                            : item.method === 'PUT'
                            ? 'text-blue-400'
                            : 'text-purple-400'
                        }`}
                      >
                        {item.method}
                      </span>
                      <span className="truncate text-slate-300 font-mono text-[11px]">
                        {item.url.replace(/^https?:\/\//, '')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0">
                      <span className={is2xx ? 'text-emerald-400' : 'text-amber-400'}>
                        {item.statusCode}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
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
