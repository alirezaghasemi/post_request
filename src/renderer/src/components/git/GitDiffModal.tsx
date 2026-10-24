import React, { useState, useMemo } from 'react';
import {
  X,
  GitCompare,
  FolderGit2,
  Download,
  ArrowRight
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface GitDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCollectionId?: string;
}

export const GitDiffModal: React.FC<GitDiffModalProps> = ({
  isOpen,
  onClose,
  defaultCollectionId
}) => {
  const { collections, requestsByCollection } = useAppStore();

  const [selectedColId, setSelectedColId] = useState<string>(
    defaultCollectionId || (collections[0]?.id ?? '')
  );
  const requests = requestsByCollection[selectedColId] || [];

  const [reqAId, setReqAId] = useState<string>(requests[0]?.id || '');
  const [reqBId, setReqBId] = useState<string>(requests[1]?.id || requests[0]?.id || '');
  const [outputDir, setOutputDir] = useState<string>('./git-export');
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const reqA = requests.find((r) => r.id === reqAId) || requests[0];
  const reqB = requests.find((r) => r.id === reqBId) || requests[1] || reqA;

  const diffResult = useMemo(() => {
    if (!reqA || !reqB) return null;

    const fields = [
      { name: 'Method', a: reqA.method, b: reqB.method },
      { name: 'URL', a: reqA.url, b: reqB.url },
      { name: 'Headers', a: reqA.headers, b: reqB.headers, isJson: true },
      { name: 'Params', a: reqA.params, b: reqB.params, isJson: true },
      { name: 'Body', a: reqA.body, b: reqB.body, isJson: true },
      { name: 'Pre-request Script', a: reqA.preScript || '', b: reqB.preScript || '' },
      { name: 'Test Script', a: reqA.testScript || '', b: reqB.testScript || '' }
    ];

    const compared = fields.map((f) => {
      let aStr = String(f.a || '');
      let bStr = String(f.b || '');
      if (f.isJson) {
        try { aStr = JSON.stringify(JSON.parse(aStr), null, 2); } catch { /* noop */ }
        try { bStr = JSON.stringify(JSON.parse(bStr), null, 2); } catch { /* noop */ }
      }
      return {
        name: f.name,
        a: aStr,
        b: bStr,
        hasChanges: aStr !== bStr
      };
    });

    const totalChanges = compared.filter((c) => c.hasChanges).length;
    return { compared, totalChanges };
  }, [reqA, reqB]);

  if (!isOpen) return null;

  const handleExportRepo = async () => {
    if (!selectedColId) return;
    try {
      const res = await window.electronAPI.git.exportRepo(selectedColId, outputDir);
      setExportStatus(`Exported ${res.exportedFiles.length} files successfully!`);
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err: any) {
      setExportStatus(`Export failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl h-[88vh] rounded-xl flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <GitCompare size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Git Diff & Versioning Inspector
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  Side-by-Side
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect visual field-level differences and export clean Git repository directory structures
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

        {/* Controls Bar */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Collection:</span>
            <select
              value={selectedColId}
              onChange={(e) => {
                setSelectedColId(e.target.value);
                const colReqs = requestsByCollection[e.target.value] || [];
                setReqAId(colReqs[0]?.id || '');
                setReqBId(colReqs[1]?.id || colReqs[0]?.id || '');
              }}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 outline-none"
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-medium">Base (A):</span>
            <select
              value={reqAId}
              onChange={(e) => setReqAId(e.target.value)}
              className="bg-slate-900 border border-rose-500/40 rounded px-2 py-1 text-xs text-slate-200 outline-none max-w-xs truncate"
            >
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.method} {r.name}
                </option>
              ))}
            </select>

            <ArrowRight size={14} className="text-slate-500" />

            <span className="text-emerald-400 font-medium">Target (B):</span>
            <select
              value={reqBId}
              onChange={(e) => setReqBId(e.target.value)}
              className="bg-slate-900 border border-emerald-500/40 rounded px-2 py-1 text-xs text-slate-200 outline-none max-w-xs truncate"
            >
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.method} {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Diff Comparison Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/30">
          {diffResult ? (
            diffResult.compared.map((field) => (
              <div
                key={field.name}
                className={`rounded-lg border overflow-hidden transition-colors ${
                  field.hasChanges ? 'border-amber-500/40 bg-slate-950' : 'border-slate-800 bg-slate-950/60'
                }`}
              >
                <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-300">{field.name}</span>
                  {field.hasChanges ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                      Modified
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium">Unchanged</span>
                  )}
                </div>

                <div className="grid grid-cols-2 divide-x divide-slate-800 text-xs font-mono">
                  {/* Left (A) */}
                  <div
                    className={`p-3 overflow-x-auto max-h-48 whitespace-pre-wrap ${
                      field.hasChanges ? 'bg-rose-950/20 text-rose-200' : 'text-slate-400'
                    }`}
                  >
                    {field.a || <span className="text-slate-600 italic">None</span>}
                  </div>

                  {/* Right (B) */}
                  <div
                    className={`p-3 overflow-x-auto max-h-48 whitespace-pre-wrap ${
                      field.hasChanges ? 'bg-emerald-950/20 text-emerald-200' : 'text-slate-400'
                    }`}
                  >
                    {field.b || <span className="text-slate-600 italic">None</span>}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center p-8 text-xs text-slate-500">
              Select requests to compare side-by-side differences
            </div>
          )}
        </div>

        {/* Git Export Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <FolderGit2 size={16} className="text-orange-400" />
            <span className="text-slate-400">Export as Local Git Repo:</span>
            <input
              type="text"
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono text-xs w-48"
            />
            <button
              onClick={handleExportRepo}
              className="flex items-center gap-1.5 px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded font-medium transition-colors"
            >
              <Download size={13} />
              <span>Export Repo</span>
            </button>
            {exportStatus && (
              <span className="text-emerald-400 text-xs font-medium ml-2">{exportStatus}</span>
            )}
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
