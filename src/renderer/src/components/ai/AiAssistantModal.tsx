import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Bot,
  FileCode,
  BookOpen,
  Settings,
  Check,
  Copy,
  Plus,
  Play
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose }) => {
  const { collections, createRequest, tabs, activeTabId, requestsByCollection } = useAppStore();

  const [activeTab, setActiveTab] = useState<'prompt' | 'tests' | 'docs' | 'settings'>('prompt');
  const [promptText, setPromptText] = useState<string>(
    'Create a POST request to https://api.stripe.com/v1/customers with email alice@example.com and name Alice Smith'
  );
  const [generatedRequest, setGeneratedRequest] = useState<any | null>(null);
  const [targetCollectionId, setTargetCollectionId] = useState<string>(collections[0]?.id || '');
  const [createdSuccess, setCreatedSuccess] = useState<boolean>(false);

  // Test generator state
  const activeReqTab = tabs.find((t) => t.id === activeTabId);
  const [sampleResponseJson, setSampleResponseJson] = useState<string>(
    JSON.stringify(
      {
        id: 'usr_789',
        username: 'dev_alex',
        email: 'alex@example.com',
        role: 'admin',
        isActive: true,
        permissions: ['read', 'write', 'execute']
      },
      null,
      2
    )
  );
  const [generatedTests, setGeneratedTests] = useState<string>('');
  const [copiedTests, setCopiedTests] = useState<boolean>(false);
  const [appliedTests, setAppliedTests] = useState<boolean>(false);

  // Docs generator state
  const [generatedDocs, setGeneratedDocs] = useState<string>('');
  const [copiedDocs, setCopiedDocs] = useState<boolean>(false);

  // Provider Settings
  const [provider, setProvider] = useState<'offline' | 'ollama' | 'openai'>('offline');
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:11434');
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('llama3');
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleBuildRequest = async () => {
    if (!promptText.trim()) return;
    try {
      const res = await window.electronAPI.ai.buildRequest(promptText);
      setGeneratedRequest(res);
    } catch (err: any) {
      alert(`AI error: ${err.message}`);
    }
  };

  const handleCreateRequestInCollection = async () => {
    if (!generatedRequest || !targetCollectionId) return;
    await createRequest({
      collectionId: targetCollectionId,
      name: generatedRequest.name || 'AI Generated Request',
      method: generatedRequest.method || 'GET',
      url: generatedRequest.url || 'https://api.example.com',
      headers: generatedRequest.headers,
      body: generatedRequest.body
    });
    setCreatedSuccess(true);
    setTimeout(() => setCreatedSuccess(false), 2000);
  };

  const handleGenerateTests = async () => {
    try {
      const res = await window.electronAPI.ai.generateTests({
        status: 200,
        statusText: 'OK',
        timeMs: 120,
        bodyText: sampleResponseJson
      });
      setGeneratedTests(res);
    } catch (err: any) {
      alert(`Test generation error: ${err.message}`);
    }
  };

  const handleApplyTestsToActiveTab = () => {
    if (!generatedTests) return;
    navigator.clipboard.writeText(generatedTests);
    setAppliedTests(true);
    setTimeout(() => setAppliedTests(false), 2000);
  };

  const handleGenerateDocs = async () => {
    try {
      const allRequests = Object.values(requestsByCollection).flat();
      const activeReq = allRequests.find((r) => r.id === activeReqTab?.requestId);
      const sampleReq = {
        name: activeReq?.name || activeReqTab?.title || 'API Endpoint',
        method: activeReq?.method || activeReqTab?.method || 'GET',
        url: activeReq?.url || activeReqTab?.url || 'https://api.example.com/v1/resource',
        headers: activeReq?.headers || '[]',
        body: activeReq?.body || '{"type":"none"}'
      };
      const res = await window.electronAPI.ai.generateDocs(sampleReq, {
        status: 200,
        bodyText: sampleResponseJson
      });
      setGeneratedDocs(res);
    } catch (err: any) {
      alert(`Docs generation error: ${err.message}`);
    }
  };

  const handleSaveSettings = async () => {
    await window.electronAPI.ai.setConfig({
      provider,
      baseUrl,
      apiKey,
      model
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[85vh] rounded-xl flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                DevPilot AI Assistant
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/30 font-mono">
                  {provider.toUpperCase()}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Natural language request generation, automated Postman test synthesis, and API documentation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/70 px-4">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'prompt'
                ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot size={14} />
            <span>Prompt to Request</span>
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'tests'
                ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode size={14} />
            <span>Test Script Generator</span>
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'docs'
                ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen size={14} />
            <span>API Docs Generator</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings size={14} />
            <span>Provider Settings</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
          {/* 1. Prompt to Request Tab */}
          {activeTab === 'prompt' && (
            <div className="space-y-5 max-w-3xl mx-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Natural Language API Description:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBuildRequest()}
                    placeholder="e.g. Create a POST request to https://api.stripe.com/v1/customers with email test@example.com"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={handleBuildRequest}
                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Sparkles size={14} />
                    <span>Generate</span>
                  </button>
                </div>
              </div>

              {generatedRequest && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">
                        {generatedRequest.method}
                      </span>
                      <span className="font-mono text-xs text-slate-200">{generatedRequest.url}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={targetCollectionId}
                        onChange={(e) => setTargetCollectionId(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 outline-none"
                      >
                        {collections.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={handleCreateRequestInCollection}
                        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors"
                      >
                        {createdSuccess ? <Check size={13} /> : <Plus size={13} />}
                        <span>{createdSuccess ? 'Added!' : 'Add to Collection'}</span>
                      </button>
                    </div>
                  </div>

                  {generatedRequest.body && (
                    <div>
                      <span className="text-xs text-slate-400 font-semibold uppercase block mb-1.5">
                        Generated Request Body
                      </span>
                      <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-auto max-h-48">
                        {(() => {
                          try {
                            const b = JSON.parse(generatedRequest.body);
                            return b.rawContent || JSON.stringify(b, null, 2);
                          } catch {
                            return generatedRequest.body;
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. Test Generator Tab */}
          {activeTab === 'tests' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Sample JSON Response Payload:
                </span>
                <button
                  onClick={handleGenerateTests}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Sparkles size={13} />
                  <span>Synthesize Tests</span>
                </button>
              </div>

              <textarea
                value={sampleResponseJson}
                onChange={(e) => setSampleResponseJson(e.target.value)}
                rows={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 outline-none focus:border-violet-500"
              />

              {generatedTests && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400">
                      Generated Postman `pm.test` Assertions:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedTests);
                          setCopiedTests(true);
                          setTimeout(() => setCopiedTests(false), 2000);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        {copiedTests ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedTests ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={handleApplyTestsToActiveTab}
                        className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                      >
                        {appliedTests ? <Check size={12} /> : <Play size={12} />}
                        <span>{appliedTests ? 'Applied!' : 'Append to Active Tab'}</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-auto max-h-64 leading-relaxed">
                    {generatedTests}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* 3. Docs Generator Tab */}
          {activeTab === 'docs' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Generate Endpoint Markdown Documentation:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateDocs}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <BookOpen size={13} />
                    <span>Generate Docs</span>
                  </button>
                  {generatedDocs && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedDocs);
                        setCopiedDocs(true);
                        setTimeout(() => setCopiedDocs(false), 2000);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                    >
                      {copiedDocs ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedDocs ? 'Copied!' : 'Copy Markdown'}</span>
                    </button>
                  )}
                </div>
              </div>

              {generatedDocs ? (
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-auto max-h-96 leading-relaxed whitespace-pre-wrap">
                  {generatedDocs}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  Click "Generate Docs" to synthesize comprehensive documentation for the active endpoint
                </div>
              )}
            </div>
          )}

          {/* 4. Provider Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">AI Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
                >
                  <option value="offline">Built-in Offline Heuristic Engine (Zero Config)</option>
                  <option value="ollama">Local Ollama Server (e.g. Llama 3, Mistral)</option>
                  <option value="openai">OpenAI / Compatible Endpoint (vLLM, LMStudio)</option>
                </select>
              </div>

              {provider !== 'offline' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Endpoint Base URL</label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Model Name</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="llama3"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none"
                    />
                  </div>

                  {provider === 'openai' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono outline-none"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="pt-2">
                <button
                  onClick={handleSaveSettings}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  {settingsSaved ? <Check size={14} /> : <Settings size={14} />}
                  <span>{settingsSaved ? 'Settings Saved!' : 'Save AI Settings'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Engine: Built-in parser active with zero external telemetry</span>
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
