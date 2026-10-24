import React, { useState } from 'react';
import {
  Clock,
  HardDrive,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Terminal,
  CheckCheck
} from 'lucide-react';
import type { HttpResponseData } from '@shared/types';

interface ResponseViewerProps {
  response: HttpResponseData | null;
  loading: boolean;
  onCancel?: () => void;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ response, loading, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'cookies' | 'tests' | 'console'>('body');
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/80 text-xs text-slate-400">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-slate-200">Sending HTTP Request...</span>
        </div>
        <p className="text-slate-500 mb-4">Waiting for remote server response...</p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 rounded bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 font-medium transition-colors"
          >
            Cancel Request
          </button>
        )}
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/40 text-xs text-slate-500 select-none">
        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-2">
          <Clock size={18} className="text-slate-600" />
        </div>
        <p className="font-medium text-slate-400">Response Area</p>
        <p className="text-[11px] text-slate-600 mt-1">
          Click &ldquo;Send&rdquo; above to execute the HTTP request and inspect the response.
        </p>
      </div>
    );
  }

  if (response.error) {
    return (
      <div className="flex-1 p-6 bg-slate-950/60 overflow-y-auto">
        <div className="max-w-xl mx-auto border border-red-500/30 rounded-lg p-5 bg-red-950/20 text-xs space-y-3">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
            <XCircle size={18} />
            <span>Request Failed</span>
          </div>
          <p className="font-mono text-slate-300 bg-slate-900/90 p-3 rounded border border-slate-800 text-[11px] break-all">
            {response.error}
          </p>
          <div className="text-[11px] text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">Potential Causes:</p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400">
              <li>Target server is offline or unreachable.</li>
              <li>Invalid URL or hostname could not be resolved (DNS).</li>
              <li>Network timeout occurred.</li>
              <li>Self-signed SSL/TLS certificate was rejected.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = response.status >= 200 && response.status < 300;
  const isRedirect = response.status >= 300 && response.status < 400;
  const isClientError = response.status >= 400 && response.status < 500;

  const statusBg = isSuccess
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : isRedirect
    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    : isClientError
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    : 'bg-red-500/10 text-red-400 border-red-500/20';

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = response.contentType.includes('json')
      ? 'json'
      : response.contentType.includes('html')
      ? 'html'
      : response.contentType.includes('xml')
      ? 'xml'
      : 'txt';
    const blob = new Blob([response.body], { type: response.contentType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-${response.requestId}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format Pretty JSON if possible
  let formattedBody = response.body;
  if (viewMode === 'pretty' && response.contentType.includes('json')) {
    try {
      formattedBody = JSON.stringify(JSON.parse(response.body), null, 2);
    } catch {
      formattedBody = response.body;
    }
  }

  const tests = response.tests || [];
  const logs = response.logs || [];
  const passedTestsCount = tests.filter((t) => t.passed).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/60 overflow-hidden text-xs select-none">
      {/* Response Header Metrics Bar */}
      <div className="h-10 px-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('body')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'body'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Body
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'headers'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Headers ({Object.keys(response.headers).length})
          </button>
          <button
            onClick={() => setActiveTab('cookies')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'cookies'
                ? 'bg-slate-800 text-blue-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cookies ({response.cookies.length})
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'tests'
                ? 'bg-slate-800 text-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Test Results</span>
            {tests.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  passedTestsCount === tests.length
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {passedTestsCount}/{tests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
              activeTab === 'console'
                ? 'bg-slate-800 text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal size={12} />
            <span>Console</span>
            {logs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                {logs.length}
              </span>
            )}
          </button>
        </div>

        {/* Metrics Badges */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border font-semibold ${statusBg}`}>
            {isSuccess ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            <span>{response.status} {response.statusText}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <Clock size={12} className="text-slate-500" />
            <span>{response.timeMs} ms</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <HardDrive size={12} className="text-slate-500" />
            <span>{formatSize(response.sizeBytes)}</span>
          </div>
        </div>
      </div>

      {/* Response Tab: Body */}
      {activeTab === 'body' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub Toolbar */}
          <div className="h-8 px-3 border-b border-slate-800/80 bg-slate-900/50 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('pretty')}
                className={`px-2 py-0.5 rounded font-medium ${
                  viewMode === 'pretty'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pretty
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`px-2 py-0.5 rounded font-medium ${
                  viewMode === 'raw'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Raw
              </button>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 font-mono text-[10px]">{response.contentType}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Search in response */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] focus-within:border-slate-700">
                <Search size={11} className="text-slate-500 mr-1" />
                <input
                  type="text"
                  placeholder="Find in response..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent outline-none text-slate-200 w-28 placeholder:text-slate-600"
                />
              </div>

              <button
                type="button"
                onClick={handleCopy}
                title="Copy to clipboard"
                className="flex items-center gap-1 px-2 py-0.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                title="Download response"
                className="flex items-center gap-1 px-2 py-0.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              >
                <Download size={12} />
                <span>Save</span>
              </button>
            </div>
          </div>

          {response.isTruncated && (
            <div className="px-3 py-1 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 flex items-center gap-1.5 text-[11px]">
              <AlertTriangle size={13} />
              <span>Response exceeds 10MB memory safety threshold. Only the first 10MB are previewed here.</span>
            </div>
          )}

          {/* Body Viewer */}
          <div className="flex-1 p-3 overflow-auto bg-slate-950/40 font-mono text-[11px] leading-relaxed select-text">
            <pre className="text-slate-200 whitespace-pre-wrap break-all">
              {searchTerm
                ? formattedBody.split(new RegExp(`(${searchTerm})`, 'gi')).map((part, i) =>
                    part.toLowerCase() === searchTerm.toLowerCase() ? (
                      <span key={i} className="bg-amber-400 text-slate-950 font-bold px-0.5 rounded">
                        {part}
                      </span>
                    ) : (
                      part
                    )
                  )
                : formattedBody}
            </pre>
          </div>
        </div>
      )}

      {/* Response Tab: Headers */}
      {activeTab === 'headers' && (
        <div className="flex-1 p-3 overflow-y-auto select-text font-mono">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-semibold text-[11px]">
                <th className="py-1.5 px-2 w-1/3">Header Name</th>
                <th className="py-1.5 px-2">Header Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {Object.entries(response.headers).map(([k, v]) => (
                <tr key={k} className="hover:bg-slate-900/50">
                  <td className="py-1.5 px-2 font-medium text-blue-400 break-all">{k}</td>
                  <td className="py-1.5 px-2 text-slate-300 break-all">
                    {Array.isArray(v) ? v.join(', ') : String(v)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Response Tab: Cookies */}
      {activeTab === 'cookies' && (
        <div className="flex-1 p-3 overflow-y-auto select-text font-mono">
          {response.cookies.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              No cookies returned by this endpoint.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-semibold text-[11px]">
                  <th className="py-1.5 px-2">Name</th>
                  <th className="py-1.5 px-2">Value</th>
                  <th className="py-1.5 px-2">Domain</th>
                  <th className="py-1.5 px-2">Path</th>
                  <th className="py-1.5 px-2">Security</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {response.cookies.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-900/50">
                    <td className="py-1.5 px-2 font-medium text-emerald-400">{c.name}</td>
                    <td className="py-1.5 px-2 text-slate-300 truncate max-w-xs">{c.value}</td>
                    <td className="py-1.5 px-2 text-slate-400">{c.domain || '/'}</td>
                    <td className="py-1.5 px-2 text-slate-400">{c.path || '/'}</td>
                    <td className="py-1.5 px-2 text-slate-500">
                      {c.httpOnly && <span className="mr-1 text-blue-400">HttpOnly</span>}
                      {c.secure && <span className="text-amber-400">Secure</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Response Tab: Test Results */}
      {activeTab === 'tests' && (
        <div className="flex-1 p-4 overflow-y-auto">
          {tests.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <CheckCheck size={28} className="mx-auto text-slate-600 mb-2" />
              <p className="font-medium text-slate-400">No Tests Executed</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Add JavaScript test assertions in the &ldquo;Tests&rdquo; tab above to automatically validate API responses.
              </p>
            </div>
          ) : (
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-300 text-xs">
                  Test Results ({passedTestsCount}/{tests.length} passed)
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    passedTestsCount === tests.length
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {Math.round((passedTestsCount / tests.length) * 100)}% Passing
                </span>
              </div>

              <div className="space-y-2">
                {tests.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs ${
                      t.passed
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-rose-950/20 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {t.passed ? (
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle size={15} className="text-rose-400 shrink-0" />
                      )}
                      <span className={`font-medium ${t.passed ? 'text-slate-200' : 'text-rose-200'}`}>
                        {t.name}
                      </span>
                      <span
                        className={`ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          t.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {t.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>

                    {!t.passed && t.error && (
                      <div className="mt-2 p-2 bg-slate-950/80 rounded font-mono text-[11px] text-rose-300 border border-rose-500/20">
                        {t.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Response Tab: Console Logs */}
      {activeTab === 'console' && (
        <div className="flex-1 p-3 overflow-y-auto font-mono text-xs select-text">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Terminal size={24} className="mx-auto text-slate-600 mb-2" />
              <p className="font-medium text-slate-400">Execution Console Empty</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Messages logged via <code className="text-blue-400">console.log()</code> in scripts will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-1.5 rounded flex items-start gap-2 text-[11px] hover:bg-slate-900/60 ${
                    log.level === 'error'
                      ? 'text-rose-300 bg-rose-950/20'
                      : log.level === 'warn'
                      ? 'text-amber-300 bg-amber-950/20'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="text-slate-600 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`px-1 rounded text-[9px] font-bold uppercase shrink-0 ${
                      log.level === 'error'
                        ? 'bg-rose-500/20 text-rose-400'
                        : log.level === 'warn'
                        ? 'bg-amber-500/20 text-amber-400'
                        : log.level === 'info'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="whitespace-pre-wrap break-all">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
