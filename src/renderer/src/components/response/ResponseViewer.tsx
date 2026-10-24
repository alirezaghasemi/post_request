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
  AlertCircle
} from 'lucide-react';
import type { HttpResponseData } from '@shared/types';

interface ResponseViewerProps {
  response: HttpResponseData | null;
  loading: boolean;
  onCancel?: () => void;
}

export const ResponseViewer: React.FC<ResponseViewerProps> = ({ response, loading, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'cookies'>('body');
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
    const blob = new Blob([response.body], { type: response.contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-${Date.now()}.${response.contentType.includes('json') ? 'json' : 'txt'}`;
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
          {/* Controls Bar: Pretty/Raw, Search, Copy, Download */}
          <div className="px-3 py-1.5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded bg-slate-800 p-0.5 border border-slate-700/60">
                <button
                  onClick={() => setViewMode('pretty')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    viewMode === 'pretty' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pretty
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    viewMode === 'raw' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Raw
                </button>
              </div>

              {response.contentType && (
                <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">
                  {response.contentType}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-300">
                <Search size={12} className="text-slate-500 mr-1.5" />
                <input
                  type="text"
                  placeholder="Filter response..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent outline-none text-[11px] w-28 text-slate-200 placeholder:text-slate-600"
                />
              </div>

              <button
                onClick={handleCopy}
                title="Copy body to clipboard"
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[11px]"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownload}
                title="Save response to file"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <Download size={13} />
              </button>
            </div>
          </div>

          {/* Truncated Warning Banner */}
          {response.isTruncated && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs">
              <AlertTriangle size={14} />
              <span>
                Response exceeds 10MB memory threshold and was truncated to prevent freezing the interface.
              </span>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 p-3 overflow-auto font-mono text-xs text-slate-200 select-text leading-relaxed">
            <pre className="whitespace-pre-wrap break-all">
              {searchTerm
                ? formattedBody
                    .split('\n')
                    .filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))
                    .join('\n')
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
    </div>
  );
};
