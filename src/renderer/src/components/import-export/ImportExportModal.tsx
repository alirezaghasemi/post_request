import React, { useState } from 'react';
import { Upload, X, CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({ isOpen, onClose }) => {
  const { importPostmanData } = useAppStore();

  const [rawJson, setRawJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ type: string; name: string } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawJson(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!rawJson.trim()) {
      setError('Please provide JSON content or upload a file');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessResult(null);

    try {
      const parsed = JSON.parse(rawJson);
      const res = await importPostmanData(parsed);
      setSuccessResult(res);
      setRawJson('');
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 text-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Import Postman Data
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <p className="text-slate-400 text-xs">
            Upload or paste a Postman Collection (v2.0 / v2.1) or Postman Environment JSON file.
            All folders, requests, headers, and variables will be imported locally into your active workspace.
          </p>

          {/* File Upload Zone */}
          <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer bg-slate-950/40 transition-colors">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <FileCode size={24} className="text-blue-400 mb-2" />
            <span className="font-medium text-slate-300">Click to choose a JSON file</span>
            <span className="text-[11px] text-slate-500 mt-1">.json format supported</span>
          </label>

          {/* Raw JSON Textarea */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Or Paste Raw JSON:
            </label>
            <textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              placeholder="Paste Postman Collection or Environment JSON..."
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-slate-200 text-xs outline-none focus:border-blue-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-3 rounded border border-red-500/20">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successResult && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded border border-emerald-500/20">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>
                Successfully imported {successResult.type}: <strong>{successResult.name}</strong>!
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !rawJson.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition-colors shadow-lg shadow-blue-600/20"
          >
            {loading ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      </div>
    </div>
  );
};
