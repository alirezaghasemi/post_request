import React, { useState, useEffect } from 'react';
import { X, Play, Square, Wifi, Send, Plus, Tag, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface MqttModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBrokerUrl?: string;
}

export const MqttModal: React.FC<MqttModalProps> = ({
  isOpen,
  onClose,
  defaultBrokerUrl = 'mqtt://broker.emqx.io:1883'
}) => {
  const [brokerUrl, setBrokerUrl] = useState(defaultBrokerUrl);
  const [clientId] = useState(`devpilot-${Date.now()}`);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  // Subscribe state
  const [subTopic, setSubTopic] = useState('devpilot/test/#');
  const [subQos, setSubQos] = useState<0 | 1 | 2>(0);
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>([]);

  // Publish state
  const [pubTopic, setPubTopic] = useState('devpilot/test/telemetry');
  const [pubMessage, setPubMessage] = useState('{"temperature": 24.5, "status": "online"}');
  const [pubQos, setPubQos] = useState<0 | 1 | 2>(0);

  // Message stream
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = window.electronAPI.mqtt.onMessage(({ clientId: cId, entry }) => {
      if (cId === clientId) {
        setMessages((prev) => [entry, ...prev.slice(0, 99)]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    if (!brokerUrl.trim()) return;
    try {
      setLoading(true);
      await window.electronAPI.mqtt.connect(clientId, brokerUrl.trim());
      setIsConnected(true);
    } catch (err: any) {
      alert(`MQTT connection failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await window.electronAPI.mqtt.disconnect(clientId);
      setIsConnected(false);
      setSubscribedTopics([]);
    } catch (err: any) {
      console.error('Failed to disconnect MQTT:', err);
    }
  };

  const handleSubscribe = async () => {
    if (!isConnected || !subTopic.trim()) return;
    try {
      await window.electronAPI.mqtt.subscribe(clientId, subTopic.trim(), subQos);
      if (!subscribedTopics.includes(subTopic.trim())) {
        setSubscribedTopics((prev) => [...prev, subTopic.trim()]);
      }
    } catch (err: any) {
      alert(`Subscribe failed: ${err.message}`);
    }
  };

  const handleUnsubscribe = async (topic: string) => {
    try {
      await window.electronAPI.mqtt.unsubscribe(clientId, topic);
      setSubscribedTopics((prev) => prev.filter((t) => t !== topic));
    } catch (err: any) {
      console.error('Unsubscribe failed:', err);
    }
  };

  const handlePublish = async () => {
    if (!isConnected || !pubTopic.trim() || !pubMessage.trim()) return;
    try {
      await window.electronAPI.mqtt.publish(clientId, pubTopic.trim(), pubMessage.trim(), pubQos);
    } catch (err: any) {
      alert(`Publish failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl w-[950px] max-w-[95vw] h-[85vh] max-h-[740px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <Wifi size={18} className="text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-200">MQTT Client</h3>
              <p className="text-[11px] text-slate-400">IoT publish/subscribe broker workbench</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Broker URL Control Bar */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span className="text-xs font-semibold text-slate-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <input
            type="text"
            value={brokerUrl}
            disabled={isConnected}
            onChange={(e) => setBrokerUrl(e.target.value)}
            placeholder="mqtt:// or ws:// broker address..."
            className="flex-1 px-3 py-1.5 text-xs font-mono rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-60"
          />

          {isConnected ? (
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
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
            >
              <Play size={12} />
              <span>{loading ? 'Connecting...' : 'Connect'}</span>
            </button>
          )}
        </div>

        {/* Content Split: Left (Pub/Sub Controls) & Right (Message Stream) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Controls */}
          <div className="w-1/2 border-r border-slate-800 p-4 space-y-4 overflow-y-auto bg-slate-950/30">
            {/* Subscribe Box */}
            <div className="p-3 bg-slate-900/90 rounded border border-slate-800 space-y-2.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Tag size={13} className="text-amber-400" />
                <span>Subscribe to Topic</span>
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={subTopic}
                  disabled={!isConnected}
                  onChange={(e) => setSubTopic(e.target.value)}
                  placeholder="topic/# or topic/+"
                  className="flex-1 px-2.5 py-1 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-200 disabled:opacity-50"
                />
                <select
                  value={subQos}
                  onChange={(e) => setSubQos(Number(e.target.value) as 0 | 1 | 2)}
                  className="px-2 py-1 text-xs rounded bg-slate-950 border border-slate-700 text-slate-300 font-mono"
                >
                  <option value={0}>QoS 0</option>
                  <option value={1}>QoS 1</option>
                  <option value={2}>QoS 2</option>
                </select>
                <button
                  onClick={handleSubscribe}
                  disabled={!isConnected || !subTopic.trim()}
                  className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-xs font-medium text-white rounded transition-colors"
                >
                  <Plus size={12} />
                  <span>Subscribe</span>
                </button>
              </div>

              {subscribedTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {subscribedTopics.map((top) => (
                    <span
                      key={top}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300"
                    >
                      <span>{top}</span>
                      <button
                        onClick={() => handleUnsubscribe(top)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Publish Box */}
            <div className="p-3 bg-slate-900/90 rounded border border-slate-800 space-y-2.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Send size={13} className="text-cyan-400" />
                <span>Publish Message</span>
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pubTopic}
                  disabled={!isConnected}
                  onChange={(e) => setPubTopic(e.target.value)}
                  placeholder="topic/name"
                  className="flex-1 px-2.5 py-1 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-200 disabled:opacity-50"
                />
                <select
                  value={pubQos}
                  onChange={(e) => setPubQos(Number(e.target.value) as 0 | 1 | 2)}
                  className="px-2 py-1 text-xs rounded bg-slate-950 border border-slate-700 text-slate-300 font-mono"
                >
                  <option value={0}>QoS 0</option>
                  <option value={1}>QoS 1</option>
                  <option value={2}>QoS 2</option>
                </select>
              </div>

              <textarea
                rows={4}
                value={pubMessage}
                disabled={!isConnected}
                onChange={(e) => setPubMessage(e.target.value)}
                placeholder="Message payload (JSON or string)..."
                className="w-full font-mono text-xs p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500 resize-none leading-relaxed disabled:opacity-50"
              />

              <div className="flex justify-end">
                <button
                  onClick={handlePublish}
                  disabled={!isConnected || !pubTopic.trim() || !pubMessage.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-medium text-white rounded transition-colors shadow-sm"
                >
                  <Send size={12} />
                  <span>Publish</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: Live Feed */}
          <div className="w-1/2 flex flex-col bg-slate-950/60">
            <div className="p-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Message Feed ({messages.length})</span>
              <button
                onClick={() => setMessages([])}
                className="text-[11px] text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 ? (
                <div className="text-center py-24 text-xs text-slate-500">
                  Subscribe to topics or publish to view live MQTT broker messages
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 bg-slate-900/90 rounded border border-slate-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {m.direction === 'in' ? (
                          <ArrowDownLeft size={13} className="text-emerald-400" />
                        ) : (
                          <ArrowUpRight size={13} className="text-cyan-400" />
                        )}
                        <span className="font-mono font-bold text-amber-300 text-[11px]">
                          {m.topic}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span>QoS {m.qos}</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <pre className="font-mono text-[11px] p-2 bg-slate-950 rounded text-slate-200 overflow-x-auto whitespace-pre-wrap">
                      <code>{m.message}</code>
                    </pre>
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
