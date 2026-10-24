import React, { useState } from 'react';
import { X, Play, Code2, RefreshCw, AlertCircle } from 'lucide-react';

interface GraphQLModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUrl?: string;
}

export const GraphQLModal: React.FC<GraphQLModalProps> = ({
  isOpen,
  onClose,
  defaultUrl = 'https://countries.trevorblades.com/'
}) => {
  const [url, setUrl] = useState(defaultUrl);
  const [query, setQuery] = useState(`query GetCountries {\n  countries {\n    code\n    name\n    emoji\n  }\n}`);
  const [variables, setVariables] = useState(`{\n  \n}`);
  const [activeTab, setActiveTab] = useState<'query' | 'variables' | 'schema'>('query');

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [schemaTypes, setSchemaTypes] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExecute = async () => {
    if (!url.trim()) return;

    try {
      setLoading(true);
      setError(null);
      let parsedVars = {};
      try {
        if (variables.trim()) {
          parsedVars = JSON.parse(variables);
        }
      } catch (err: any) {
        setError(`Invalid variables JSON: ${err.message}`);
        setLoading(false);
        return;
      }

      const res = await window.electronAPI.graphql.execute({
        url: url.trim(),
        query,
        variables: parsedVars
      });
      setResponse(res);
    } catch (err: any) {
      setError(err.message || 'GraphQL request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleIntrospect = async () => {
    if (!url.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await window.electronAPI.graphql.introspect(url.trim());
      if (res.data?.__schema?.types) {
        setSchemaTypes(res.data.__schema.types);
        setActiveTab('schema');
      } else {
        setError('Introspection failed: No schema returned');
      }
    } catch (err: any) {
      setError(err.message || 'Introspection request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl w-[960px] max-w-[95vw] h-[85vh] max-h-[720px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <Code2 size={18} className="text-pink-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-200">GraphQL Studio</h3>
              <p className="text-[11px] text-slate-400">Query, mutation, and schema introspection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* URL and Action Bar */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-3">
          <span className="text-xs font-bold text-pink-400 font-mono">POST</span>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="GraphQL Endpoint URL..."
            className="flex-1 px-3 py-1.5 text-xs font-mono rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-pink-500"
          />

          <button
            onClick={handleIntrospect}
            disabled={loading}
            title="Fetch Schema via Introspection"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Introspect</span>
          </button>

          <button
            onClick={handleExecute}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
          >
            <Play size={12} />
            <span>{loading ? 'Running...' : 'Run Query'}</span>
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Editor */}
          <div className="w-1/2 border-r border-slate-800 flex flex-col">
            <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs px-3">
              <button
                onClick={() => setActiveTab('query')}
                className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'query'
                    ? 'border-pink-500 text-pink-400 bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Query / Mutation
              </button>
              <button
                onClick={() => setActiveTab('variables')}
                className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                  activeTab === 'variables'
                    ? 'border-pink-500 text-pink-400 bg-slate-800/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Variables (JSON)
              </button>
              {schemaTypes && (
                <button
                  onClick={() => setActiveTab('schema')}
                  className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                    activeTab === 'schema'
                      ? 'border-pink-500 text-pink-400 bg-slate-800/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Schema Types ({schemaTypes.length})
                </button>
              )}
            </div>

            <div className="flex-1 p-3 overflow-hidden flex flex-col bg-slate-950/30">
              {activeTab === 'query' && (
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="query { ... }"
                  className="flex-1 w-full bg-slate-950 font-mono text-xs text-slate-200 p-3 rounded border border-slate-800 focus:outline-none focus:border-pink-500 resize-none leading-relaxed"
                />
              )}

              {activeTab === 'variables' && (
                <textarea
                  value={variables}
                  onChange={(e) => setVariables(e.target.value)}
                  placeholder="{\n  &quot;key&quot;: &quot;value&quot;\n}"
                  className="flex-1 w-full bg-slate-950 font-mono text-xs text-slate-200 p-3 rounded border border-slate-800 focus:outline-none focus:border-pink-500 resize-none leading-relaxed"
                />
              )}

              {activeTab === 'schema' && schemaTypes && (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {schemaTypes
                    .filter((t) => !t.name.startsWith('__'))
                    .map((t) => (
                      <div
                        key={t.name}
                        className="p-2.5 bg-slate-900 rounded border border-slate-800 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-pink-300">{t.name}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{t.kind}</span>
                        </div>
                        {t.fields && (
                          <div className="pl-2 border-l border-slate-800 space-y-0.5 mt-1 font-mono text-[11px] text-slate-400">
                            {t.fields.map((f: any) => (
                              <div key={f.name}>
                                <span className="text-slate-300">{f.name}</span>
                                {f.type?.name && (
                                  <span className="text-slate-500 ml-1">: {f.type.name}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Response Inspector */}
          <div className="w-1/2 flex flex-col bg-slate-950/60">
            <div className="p-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Response</span>
              {response && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    response.errors
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  Status: {response.status}
                </span>
              )}
            </div>

            <div className="flex-1 p-3 overflow-auto font-mono text-xs text-slate-200">
              {error && (
                <div className="p-3 mb-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {response ? (
                <pre className="p-3 bg-slate-900/90 rounded border border-slate-800 leading-relaxed overflow-x-auto">
                  <code>{JSON.stringify(response, null, 2)}</code>
                </pre>
              ) : (
                <div className="text-center py-24 text-xs text-slate-500">
                  Execute query to inspect GraphQL data or errors
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
