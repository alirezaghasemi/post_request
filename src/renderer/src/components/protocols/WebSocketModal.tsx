import React, { useState, useEffect } from 'react';
import { X, Play, Square, Radio, Send, Trash2, ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react';

interface WebSocketModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUrl?: string;
}

export const WebSocketModal: React.FC<WebSocketModalProps> = ({
  isOpen,
  onClose,
  defaultUrl = 'wss://echo.websocket.events'
}) => {
  const [url, setUrl] = useState(defaultUrl);
  const [connectionId] = useState(`ws-${Date.now()}`);
  const [status, setStatus] = useState<string>('disconnected');
  const [messageText, setMessageText] = useState('{"type": "greeting", "text": "Hello WebSocket"}');
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Listen for live messages
    const unsubscribeMsg = window.electronAPI.websocket.onMessage(({ connectionId: cId, entry }) => {
      if (cId === connectionId) {
        setMessages((prev) => [entry, ...prev.slice(0, 99)]);
      }
    });

    // Listen for status changes
    const unsubscribeStatus = window.electronAPI.websocket.onStatus(({ connectionId: cId, status: newStatus }) => {
      if (cId === connectionId) {
        setStatus(newStatus);
      }
    });

    return () => {
      unsubscribeMsg();
      unsubscribeStatus();
    };
  }, [isOpen, connectionId]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    if (!url.trim()) return;
    setStatus('connecting');
    try {
      await window.electronAPI.websocket.connect(connectionId, url.trim());
      setStatus('connected');
    } catch (err: any) {
      setStatus('error');
      alert(`WebSocket connection failed: ${err.message}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await window.electronAPI.websocket.disconnect(connectionId);
      setStatus('disconnected');
    } catch (err: any) {
      console.error('Failed to disconnect WebSocket:', err);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || status !== 'connected') return;
    try {
      await window.electronAPI.websocket.send(connectionId, messageText);
    } catch (err: any) {
      alert(`Failed to send message: ${err.message}`);
    }
  };

  const handlePing = async () => {
    if (status !== 'connected') return;
    try {
      await window.electronAPI.websocket.send(connectionId, 'ping');
    } catch (err: any) {
      alert(`Ping failed: ${err.message}`);
    }
  };

  const handleClearHistory = async () => {
    await window.electronAPI.websocket.clearHistory(connectionId);
    setMessages([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl w-[900px] max-w-[95vw] h-[85vh] max-h-[720px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <Radio size={18} className="text-cyan-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-200">WebSocket Client</h3>
              <p className="text-[11px] text-slate-400">Bidirectional real-time stream inspector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* URL and Connection Control Bar */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                status === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : status === 'connecting'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-slate-500'
              }`}
            />
            <span className="text-xs font-semibold text-slate-300 capitalize">{status}</span>
          </div>

          <input
            type="text"
            value={url}
            disabled={status === 'connected'}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="ws:// or wss:// URL..."
            className="flex-1 px-3 py-1.5 text-xs font-mono rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
          />

          {status === 'connected' ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white transition-colors"
            >
              <Square size={12} />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={status === 'connecting'}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-medium text-white transition-colors"
            >
              <Play size={12} />
              <span>Connect</span>
            </button>
          )}
        </div>

        {/* Main Content Split: Message Composer (Top) & Live Stream (Bottom) */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/40">
          {/* Composer */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Message Payload</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePing}
                  disabled={status !== 'connected'}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[11px] border border-slate-700"
                >
                  Send "ping"
                </button>
                <button
                  onClick={handleSend}
                  disabled={status !== 'connected' || !messageText.trim()}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-medium text-white shadow-sm"
                >
                  <Send size={12} />
                  <span>Send Frame</span>
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Message payload (JSON, text, or binary representation)..."
              className="w-full font-mono text-xs p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
            />
          </div>

          {/* Live Stream Header */}
          <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-900/90">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-cyan-400" />
              <span className="font-semibold text-slate-300">Message Stream ({messages.length})</span>
            </div>
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-20 text-xs text-slate-500">
                Connect and send messages to inspect live WebSocket traffic
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2.5 rounded border text-xs flex flex-col space-y-1 ${
                    msg.direction === 'in'
                      ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
                      : 'bg-cyan-950/20 border-cyan-900/40 text-cyan-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider">
                      {msg.direction === 'in' ? (
                        <>
                          <ArrowDownLeft size={13} className="text-emerald-400" />
                          <span className="text-emerald-400">Received</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight size={13} className="text-cyan-400" />
                          <span className="text-cyan-400">Sent</span>
                        </>
                      )}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>{msg.sizeBytes} B</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <pre className="font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed text-slate-200 bg-slate-950/60 p-2 rounded border border-slate-900">
                    <code>{msg.data}</code>
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
