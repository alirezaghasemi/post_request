import React, { useState } from 'react';
import { X, Upload, FileCode, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface OpenApiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenApiImportModal: React.FC<OpenApiImportModalProps> = ({ isOpen, onClose }) => {
  const { activeWorkspaceId, init } = useAppStore();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ name: string; requests: number } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContent(text || '');
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file from disk');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!content.trim()) {
      setError('Please provide OpenAPI JSON or YAML specification content');
      return;
    }
    if (!activeWorkspaceId) {
      setError('No active workspace selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await window.electronAPI.importExport.importOpenApi(activeWorkspaceId, content.trim());
      setSuccessInfo({
        name: res.collection.name,
        requests: res.requestsCount
      });
      // Refresh workspace data
      await init();
    } catch (err: any) {
      setError(err.message || 'Failed to import OpenAPI specification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl w-[640px] max-w-[95vw] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <FileCode size={16} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">Import OpenAPI / Swagger</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {successInfo ? (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex flex-col items-center text-center space-y-2 py-6">
              <CheckCircle2 size={32} className="text-emerald-400" />
              <h4 className="text-sm font-semibold text-emerald-200">Specification Imported Successfully!</h4>
              <p className="text-slate-300">
                Created collection <strong className="text-white">"{successInfo.name}"</strong> with{' '}
                <strong className="text-white">{successInfo.requests}</strong> endpoints.
              </p>
              <button
                onClick={onClose}
                className="mt-3 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Paste OpenAPI 3.0 / 3.1 or Swagger 2.0 (JSON or YAML) below:
                </span>
                <label className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 cursor-pointer transition-colors">
                  <Upload size={12} />
                  <span>Choose File</span>
                  <input
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setError(null);
                }}
                placeholder="openapi: 3.0.0&#10;info:&#10;  title: Sample API&#10;  version: 1.0.0&#10;paths: ..."
                rows={12}
                className="w-full font-mono text-xs p-3 rounded bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
              />

              {error && (
                <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!successInfo && (
          <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !content.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <FileText size={14} />
                  <span>Import Specification</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
