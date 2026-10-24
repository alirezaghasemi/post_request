import React, { useState, useEffect } from 'react';
import { Send, Save, Square } from 'lucide-react';
import type { TabItem } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';
import type {
  KeyValuePair,
  RequestBodyConfig,
  AuthConfig,
  HttpRequestExecutionPayload
} from '@shared/types';
import { KeyValueTable } from './KeyValueTable';
import { BodyEditor } from './BodyEditor';
import { AuthEditor } from './AuthEditor';
import { ScriptEditor } from './ScriptEditor';
import { ResponseViewer } from '../response/ResponseViewer';

interface RequestEditorProps {
  tab: TabItem;
}

export const RequestEditor: React.FC<RequestEditorProps> = ({ tab }) => {
  const {
    executeRequest,
    cancelRequest,
    activeResponses,
    executingRequests,
    createRequest,
    environments,
    activeEnvironmentId
  } = useAppStore();

  const [method, setMethod] = useState<string>(tab.method || 'GET');
  const [url, setUrl] = useState<string>(tab.url || 'https://jsonplaceholder.typicode.com/todos/1');
  const [preScript, setPreScript] = useState<string>(tab.preScript || '');
  const [testScript, setTestScript] = useState<string>(tab.testScript || '');

  // Compute live resolved URL for display
  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
  const resolvedUrlPreview = React.useMemo(() => {
    if (!url.includes('{{')) return null;
    let res = url;
    if (activeEnv) {
      for (const v of activeEnv.variables) {
        if (v.enabled) {
          res = res.replaceAll(`{{${v.key}}}`, v.value);
        }
      }
    }
    return res;
  }, [url, activeEnv]);

  // Request Config State
  const [activeConfigTab, setActiveConfigTab] = useState<'params' | 'headers' | 'auth' | 'body' | 'pre-request' | 'tests'>('params');

  const [params, setParams] = useState<KeyValuePair[]>([
    { id: 'p1', key: '', value: '', enabled: true, description: '' }
  ]);

  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { id: 'h1', key: 'Accept', value: '*/*', enabled: true, description: 'Default accept all' }
  ]);

  const [body, setBody] = useState<RequestBodyConfig>({
    type: 'none',
    rawContent: '{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}'
  });

  const [auth, setAuth] = useState<AuthConfig>({
    type: 'none'
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  const requestId = tab.requestId || tab.id;
  const isExecuting = Boolean(executingRequests[requestId]);
  const response = activeResponses[requestId] || null;

  // Sync query params when URL is edited or vice versa
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    try {
      const parsed = new URL(newUrl);
      const extractedParams: KeyValuePair[] = [];
      parsed.searchParams.forEach((val, key) => {
        extractedParams.push({
          id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          key,
          value: val,
          enabled: true
        });
      });
      if (extractedParams.length > 0) {
        setParams(extractedParams);
      }
    } catch {
      // User is still typing URL
    }
  };

  const handleParamsChange = (newParams: KeyValuePair[]) => {
    setParams(newParams);
    try {
      const parsed = new URL(url);
      parsed.search = '';
      for (const p of newParams) {
        if (p.enabled && p.key.trim().length > 0) {
          parsed.searchParams.append(p.key, p.value);
        }
      }
      setUrl(parsed.toString());
    } catch {
      // Ignored if URL is incomplete
    }
  };

  const handleSend = async () => {
    if (isExecuting) return;

    const payload: HttpRequestExecutionPayload = {
      requestId,
      method,
      url,
      params,
      headers,
      body,
      auth,
      preScript,
      testScript,
      workspaceId: activeEnv?.workspaceId
    };

    try {
      await executeRequest(payload);
    } catch (err) {
      console.warn('Execution caught in component:', err);
    }
  };

  const handleCancel = () => {
    cancelRequest(requestId);
  };

  const handleSave = async () => {
    try {
      await createRequest({
        name: tab.title || 'Saved Request',
        method,
        url,
        headers: JSON.stringify(headers),
        params: JSON.stringify(params),
        body: JSON.stringify(body),
        authConfig: JSON.stringify(auth),
        preScript,
        testScript
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save request:', err);
    }
  };

  // Keyboard shortcut: Ctrl/Cmd + Enter to send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSend]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900/60 overflow-hidden text-xs">
      {/* 1. Request URL & Method Bar */}
      <div className="p-2.5 border-b border-slate-800 bg-slate-900/90 flex items-center gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className={`px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs font-bold outline-none cursor-pointer ${
            method === 'GET'
              ? 'text-emerald-400'
              : method === 'POST'
              ? 'text-amber-400'
              : method === 'PUT'
              ? 'text-blue-400'
              : method === 'PATCH'
              ? 'text-purple-400'
              : method === 'DELETE'
              ? 'text-red-400'
              : 'text-slate-200'
          }`}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>

        <div className="flex-1 flex items-center bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 font-mono text-slate-200 focus-within:border-blue-500 transition-colors">
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="w-full bg-transparent outline-none placeholder:text-slate-600"
            placeholder="Enter request URL (e.g. https://httpbin.org/get)..."
          />
        </div>

        {isExecuting ? (
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-red-600/30 text-red-400 border border-red-500/40 hover:bg-red-600/40 font-semibold transition-colors"
          >
            <Square size={12} className="fill-red-400" />
            <span>Cancel</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-lg shadow-blue-600/20 active:translate-y-0.5"
          >
            <Send size={13} />
            <span>Send</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleSave}
          title="Save Request"
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
        >
          <Save size={13} />
          <span>{saveSuccess ? 'Saved!' : 'Save'}</span>
        </button>
      </div>

      {/* Live Variable Resolution Preview */}
      {resolvedUrlPreview && (
        <div className="px-3 py-1 bg-blue-950/30 border-b border-blue-900/30 flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span className="text-blue-400 font-semibold font-sans">Resolved URL:</span>
          <span className="text-slate-200 truncate">{resolvedUrlPreview}</span>
        </div>
      )}

      {/* 2. Middle Split: Request Configuration (Top) & Response Inspector (Bottom) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top: Request Config Tabs */}
        <div className="h-64 flex flex-col border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center px-3 border-b border-slate-800 bg-slate-900/70 select-none">
            {(['params', 'headers', 'auth', 'body', 'pre-request', 'tests'] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setActiveConfigTab(tabKey)}
                className={`py-2 px-3 font-medium capitalize border-b-2 transition-colors ${
                  activeConfigTab === tabKey
                    ? 'text-blue-400 border-blue-500 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tabKey === 'params'
                  ? `Params (${params.filter((p) => p.key).length})`
                  : tabKey === 'headers'
                  ? `Headers (${headers.filter((h) => h.key).length})`
                  : tabKey === 'pre-request'
                  ? `Pre-request ${preScript.trim() ? '•' : ''}`
                  : tabKey === 'tests'
                  ? `Tests ${testScript.trim() ? '•' : ''}`
                  : tabKey}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeConfigTab === 'params' && (
              <KeyValueTable
                items={params}
                onChange={handleParamsChange}
                keyPlaceholder="Query Parameter"
                valuePlaceholder="Value"
              />
            )}
            {activeConfigTab === 'headers' && (
              <KeyValueTable
                items={headers}
                onChange={setHeaders}
                keyPlaceholder="Header Name"
                valuePlaceholder="Header Value"
              />
            )}
            {activeConfigTab === 'auth' && <AuthEditor auth={auth} onChange={setAuth} />}
            {activeConfigTab === 'body' && <BodyEditor config={body} onChange={setBody} />}
            {activeConfigTab === 'pre-request' && (
              <ScriptEditor value={preScript} onChange={setPreScript} type="pre-request" />
            )}
            {activeConfigTab === 'tests' && (
              <ScriptEditor value={testScript} onChange={setTestScript} type="tests" />
            )}
          </div>
        </div>

        {/* Bottom: Response Inspector */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ResponseViewer
            response={response}
            loading={isExecuting}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
};
