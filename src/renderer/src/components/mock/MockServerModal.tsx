import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Square,
  Server,
  Layers,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Activity,
  Plus,
  Trash2
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { RequestItem } from '@shared/types';

interface MockServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCollectionId?: string;
}

export const MockServerModal: React.FC<MockServerModalProps> = ({
  isOpen,
  onClose,
  initialCollectionId
}) => {
  const { collections, requestsByCollection } = useAppStore();

  const [port, setPort] = useState<number>(3001);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activePort, setActivePort] = useState<number>(3001);
  const [routes, setRoutes] = useState<
    Array<{
      id: string;
      method: string;
      path: string;
      statusCode: number;
      body: string;
      delayMs: number;
    }>
  >([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    initialCollectionId || (collections[0]?.id || '')
  );
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Sync initial status and routes
  useEffect(() => {
    if (!isOpen) return;

    window.electronAPI.mockServer.status().then((status) => {
      setIsRunning(status.isRunning);
      if (status.port) {
        setPort(status.port);
        setActivePort(status.port);
      }
    });

    window.electronAPI.mockServer.getLogs().then((existingLogs) => {
      setLogs(existingLogs);
    });

    // Subscribe to live mock requests
    const unsubscribe = window.electronAPI.mockServer.onRequest((log) => {
      setLogs((prev) => [log, ...prev.slice(0, 49)]);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  // Populate routes from selected collection
  useEffect(() => {
    if (selectedCollectionId && requestsByCollection[selectedCollectionId]) {
      const collectionRequests: RequestItem[] = requestsByCollection[selectedCollectionId] || [];
      const generatedRoutes = collectionRequests.map((req, idx) => {
        let path = '/';
        try {
          const urlObj = new URL(req.url.replace(/\{\{[^}]+\}\}/g, 'http://localhost'));
          path = urlObj.pathname;
        } catch {
          const match = req.url.match(/(\/[a-zA-Z0-9_\-/:{}]*)/);
          path = match ? match[1] : `/${req.name.toLowerCase().replace(/\s+/g, '-')}`;
        }

        let defaultBody = '{"message": "Mock response from DevPilot"}';
        return {
          id: `route-${idx}`,
          method: req.method || 'GET',
          path: path.replace(/\{([^}]+)\}/g, ':$1'),
          statusCode: 200,
          body: defaultBody,
          delayMs: 0
        };
      });
      setRoutes(generatedRoutes);
    }
  }, [selectedCollectionId, requestsByCollection]);

  if (!isOpen) return null;

  const handleStart = async () => {
    try {
      await window.electronAPI.mockServer.setRoutes(routes);
      const res = await window.electronAPI.mockServer.start(port);
      setIsRunning(res.isRunning);
      setActivePort(res.port);
    } catch (err: any) {
      alert(`Failed to start Mock Server: ${err.message}`);
    }
  };

  const handleStop = async () => {
    try {
      const res = await window.electronAPI.mockServer.stop();
      setIsRunning(res.isRunning);
    } catch (err: any) {
      alert(`Failed to stop Mock Server: ${err.message}`);
    }
  };

  const handleSyncRoutes = async () => {
    await window.electronAPI.mockServer.setRoutes(routes);
  };

  const handleAddRoute = () => {
    setRoutes((prev) => [
      ...prev,
      {
        id: `route-${Date.now()}`,
        method: 'GET',
        path: '/api/v1/custom',
        statusCode: 200,
        body: '{"status": "ok"}',
        delayMs: 0
      }
    ]);
  };

  const handleDeleteRoute = (id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  };

  const copyMockUrl = () => {
    const url = `http://localhost:${activePort}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl w-[900px] max-w-[95vw] h-[85vh] max-h-[720px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <Server size={18} className="text-purple-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Local Mock Server</h3>
              <p className="text-[11px] text-slate-400">Zero-config in-process HTTP mock server</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Server Control Bar */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span className="text-xs font-semibold text-slate-200">
                {isRunning ? `Running on port ${activePort}` : 'Stopped'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pl-4 border-l border-slate-800">
              <span className="text-xs text-slate-400">Port:</span>
              <input
                type="number"
                disabled={isRunning}
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 3001)}
                className="w-20 px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 font-mono text-slate-200 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRunning && (
              <button
                onClick={copyMockUrl}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors"
              >
                {copiedUrl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedUrl ? 'Copied' : `http://localhost:${activePort}`}</span>
              </button>
            )}

            {isRunning ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white transition-colors"
              >
                <Square size={13} />
                <span>Stop Server</span>
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors"
              >
                <Play size={13} />
                <span>Start Server</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Split: Left (Routes Config), Right (Live Request Logs) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Routes */}
          <div className="w-7/12 border-r border-slate-800 flex flex-col">
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">
                  Mock Routes ({routes.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {collections.length > 0 && (
                  <select
                    value={selectedCollectionId}
                    onChange={(e) => setSelectedCollectionId(e.target.value)}
                    className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700"
                  >
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleAddRoute}
                  className="p-1 hover:text-blue-400 text-slate-400 rounded hover:bg-slate-800"
                  title="Add Custom Route"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {routes.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  No mock routes configured. Select a collection or add routes manually.
                </div>
              ) : (
                routes.map((route, idx) => (
                  <div
                    key={route.id || idx}
                    className="p-3 bg-slate-950/60 rounded border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <select
                        value={route.method}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRoutes((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, method: val } : r))
                          );
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-900 border border-slate-700 ${
                          route.method === 'GET'
                            ? 'text-emerald-400'
                            : route.method === 'POST'
                            ? 'text-blue-400'
                            : route.method === 'PUT'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                        <option value="*">* ANY</option>
                      </select>

                      <input
                        type="text"
                        value={route.path}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRoutes((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, path: val } : r))
                          );
                        }}
                        placeholder="/api/v1/users/:id"
                        className="flex-1 px-2 py-1 font-mono text-xs rounded bg-slate-900 border border-slate-700 text-slate-200"
                      />

                      <input
                        type="number"
                        title="Status Code"
                        value={route.statusCode}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 200;
                          setRoutes((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, statusCode: val } : r))
                          );
                        }}
                        className="w-14 px-1.5 py-1 text-center font-mono text-xs rounded bg-slate-900 border border-slate-700 text-amber-400"
                      />

                      <button
                        onClick={() => handleDeleteRoute(route.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">Delay:</span>
                      <input
                        type="number"
                        value={route.delayMs}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setRoutes((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, delayMs: val } : r))
                          );
                        }}
                        placeholder="0ms"
                        className="w-16 px-1.5 py-0.5 text-xs rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono"
                      />
                      <span className="text-[10px] text-slate-500">ms</span>
                    </div>

                    <textarea
                      rows={3}
                      value={route.body}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRoutes((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, body: val } : r))
                        );
                      }}
                      placeholder="Response Body (JSON or text)"
                      className="w-full font-mono text-[11px] p-2 rounded bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ))
              )}
            </div>

            {isRunning && (
              <div className="p-2.5 bg-slate-900/60 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleSyncRoutes}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                >
                  <RefreshCw size={12} />
                  <span>Update Live Routes</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Live Request Monitor */}
          <div className="w-5/12 flex flex-col bg-slate-950/40">
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-emerald-400" />
                <span className="text-xs font-semibold text-slate-300">Live Traffic Monitor</span>
              </div>
              <button
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {logs.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-500">
                  <Clock size={20} className="mx-auto mb-2 opacity-40" />
                  <span>Waiting for incoming HTTP requests...</span>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`text-[10px] font-bold ${
                          log.method === 'GET'
                            ? 'text-emerald-400'
                            : log.method === 'POST'
                            ? 'text-blue-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {log.method}
                      </span>
                      <span className="font-mono text-slate-300 truncate text-[11px]">
                        {log.path}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          log.statusCode >= 200 && log.statusCode < 300
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {log.statusCode}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {log.durationMs}ms
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
