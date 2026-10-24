import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Square,
  Shield,
  Trash2,
  FolderPlus,
  ArrowRight,
  Filter,
  Check,
  Search
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProxyModal: React.FC<ProxyModalProps> = ({ isOpen, onClose }) => {
  const { collections } = useAppStore();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [port, setPort] = useState<number>(8080);
  const [traffic, setTraffic] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [filterText, setFilterText] = useState<string>('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(collections[0]?.id || '');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    // Check status
    window.electronAPI.proxy.getStatus().then((status: any) => {
      setIsRunning(status.isRunning);
      if (status.port) setPort(status.port);
    });

    // Load existing traffic
    window.electronAPI.proxy.getTraffic().then((items: any[]) => {
      setTraffic(items);
      if (items.length > 0 && !selectedItem) {
        setSelectedItem(items[0]);
      }
    });

    // Listen to live traffic
    const unsubscribe = window.electronAPI.proxy.onTraffic((item: any) => {
      setTraffic((prev) => [item, ...prev]);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleProxy = async () => {
    if (isRunning) {
      await window.electronAPI.proxy.stop();
      setIsRunning(false);
    } else {
      const res = await window.electronAPI.proxy.start(port);
      setIsRunning(res.isRunning);
      setPort(res.port);
    }
  };

  const handleClearTraffic = async () => {
    await window.electronAPI.proxy.clear();
    setTraffic([]);
    setSelectedItem(null);
  };

  const handleSaveToCollection = async () => {
    if (!selectedItem || !selectedCollectionId) return;
    try {
      await window.electronAPI.proxy.saveToCollection(selectedItem.id, selectedCollectionId);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  const filteredTraffic = traffic.filter((item) => {
    if (!filterText.trim()) return true;
    const term = filterText.toLowerCase();
    return (
      item.url.toLowerCase().includes(term) ||
      item.method.toLowerCase().includes(term) ||
      String(item.statusCode).includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl h-[88vh] rounded-xl flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                HTTP/HTTPS Intercepting Forward Proxy
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-mono ${
                    isRunning
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isRunning ? `ACTIVE ON 127.0.0.1:${port}` : 'STOPPED'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Capture outgoing browser and app network traffic, inspect bodies, and save directly to collections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1">
              <span className="text-xs text-slate-400">Port:</span>
              <input
                type="number"
                disabled={isRunning}
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 8080)}
                className="w-16 bg-transparent text-xs text-slate-200 outline-none font-mono disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleToggleProxy}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isRunning ? <Square size={13} className="fill-white" /> : <Play size={13} />}
              <span>{isRunning ? 'Stop Proxy' : 'Start Proxy'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-800 overflow-hidden bg-slate-950">
          {/* Traffic Table Column */}
          <div className="flex flex-col h-full overflow-hidden">
            {/* Filter Toolbar */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/60">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filter by URL, Method, or Status..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-slate-700"
                />
              </div>
              <button
                onClick={handleClearTraffic}
                title="Clear Traffic"
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <Trash2 size={13} />
                <span>Clear ({traffic.length})</span>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
              {filteredTraffic.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  {isRunning
                    ? 'Listening on proxy... Send requests via 127.0.0.1:' + port
                    : 'Proxy stopped. Click "Start Proxy" to begin capturing traffic.'}
                </div>
              ) : (
                filteredTraffic.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const isSuccess = item.statusCode >= 200 && item.statusCode < 300;
                  const isError = item.statusCode >= 400;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-3 cursor-pointer text-xs transition-colors flex items-center justify-between gap-3 ${
                        isSelected ? 'bg-slate-800/80 border-l-2 border-emerald-400' : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <span
                          className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                            item.method === 'GET'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : item.method === 'POST'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-blue-500/10 text-blue-400'
                          }`}
                        >
                          {item.method}
                        </span>
                        <span className="font-mono text-slate-300 truncate">{item.url}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono font-semibold ${
                            isSuccess ? 'text-emerald-400' : isError ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {item.statusCode}
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">{item.timeMs}ms</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="flex flex-col h-full overflow-hidden bg-slate-900/40">
            {selectedItem ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Details Header & Save Action */}
                <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-bold text-xs text-emerald-400">{selectedItem.method}</span>
                    <span className="font-mono text-xs text-slate-200 truncate">{selectedItem.url}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={selectedCollectionId}
                      onChange={(e) => setSelectedCollectionId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 outline-none"
                    >
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={handleSaveToCollection}
                      className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors"
                    >
                      {savedSuccess ? <Check size={13} /> : <FolderPlus size={13} />}
                      <span>{savedSuccess ? 'Saved!' : 'Save to Collection'}</span>
                    </button>
                  </div>
                </div>

                {/* Inspect Body & Headers */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Request Section */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ArrowRight size={13} className="text-blue-400" />
                      Request Details
                    </h4>
                    {selectedItem.requestBody ? (
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300 max-h-48 overflow-auto">
                        <pre>{selectedItem.requestBody}</pre>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">No request body</div>
                    )}
                  </div>

                  {/* Response Section */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ArrowRight size={13} className="text-emerald-400" />
                      Response Details ({selectedItem.statusCode} {selectedItem.statusText})
                    </h4>
                    {selectedItem.responseBody ? (
                      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300 max-h-64 overflow-auto">
                        <pre>{selectedItem.responseBody}</pre>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">No response body</div>
                    )}
                  </div>

                  {/* Headers */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Request Headers
                    </h4>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-2 font-mono text-[11px] space-y-1">
                      {Object.entries(selectedItem.headers).map(([k, v]) => (
                        <div key={k} className="flex">
                          <span className="text-slate-400 w-1/3 truncate">{k}:</span>
                          <span className="text-slate-200 flex-1 truncate">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                Select a captured traffic entry to view request and response payloads
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-500" />
            <span>Forward Proxy Configuration: Set client HTTP proxy to 127.0.0.1:{port}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
