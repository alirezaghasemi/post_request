import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Square,
  FileCode,
  Download,
  RotateCcw,
  Sliders,
  Check,
  Workflow
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { RequestItem, CollectionRunReport, RunnerStepResult } from '@shared/types';

interface CollectionRunnerModalProps {
  collectionId: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenCiWorkflow?: (collectionId: string) => void;
}

export const CollectionRunnerModal: React.FC<CollectionRunnerModalProps> = ({
  collectionId,
  isOpen,
  onClose,
  onOpenCiWorkflow
}) => {
  const { collections, requestsByCollection } = useAppStore();
  const collection = collections.find((c) => c.id === collectionId);
  const requests = requestsByCollection[collectionId] || [];

  // Config States
  const [iterations, setIterations] = useState<number>(1);
  const [delayMs, setDelayMs] = useState<number>(0);
  const [stopOnError, setStopOnError] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dataFileContent, setDataFileContent] = useState<string>('');
  const [dataFormat, setDataFormat] = useState<'csv' | 'json'>('csv');
  const [parsedData, setParsedData] = useState<Record<string, any>[] | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // Execution States
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [report, setReport] = useState<CollectionRunReport | null>(null);
  const [liveResults, setLiveResults] = useState<RunnerStepResult[]>([]);
  const [exportedStatus, setExportedStatus] = useState<string | null>(null);

  // Initialize selected requests on modal open
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(requests.map((r) => r.id));
      setReport(null);
      setLiveResults([]);
      setIsRunning(false);
    }
  }, [isOpen, requests.length]);

  if (!isOpen || !collection) return null;

  const handleToggleRequest = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (select: boolean) => {
    setSelectedIds(select ? requests.map((r) => r.id) : []);
  };

  const handleParseDataFile = async () => {
    if (!dataFileContent.trim()) {
      setParsedData(null);
      setDataError(null);
      return;
    }

    try {
      setDataError(null);
      const data = await window.electronAPI.runner.parseData(dataFileContent, dataFormat);
      setParsedData(data);
      if (data.length > 0) {
        setIterations(data.length);
      }
    } catch (err: any) {
      setDataError(err.message);
      setParsedData(null);
    }
  };

  const handleStartRun = async () => {
    if (selectedIds.length === 0) return;

    setIsRunning(true);
    setLiveResults([]);
    setReport(null);

    try {
      const rep: CollectionRunReport = await window.electronAPI.runner.start({
        collectionId,
        selectedRequestIds: selectedIds,
        iterations,
        delayMs,
        iterationData: parsedData || undefined,
        stopOnError
      });
      setReport(rep);
      setLiveResults(rep.results);
    } catch (err: any) {
      console.error('Runner failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCancelRun = () => {
    window.electronAPI.runner.cancel();
    setIsRunning(false);
  };

  const handleExport = async (format: 'html' | 'json') => {
    if (!report) return;
    try {
      const content = await window.electronAPI.runner.exportReport(report, format);
      const blob = new Blob([content], {
        type: format === 'html' ? 'text/html' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${collection.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setExportedStatus(`Exported as ${format.toUpperCase()}`);
      setTimeout(() => setExportedStatus(null), 2500);
    } catch (err: any) {
      console.error('Export failed:', err);
    }
  };

  const totalAssertions = (report?.totalPassed || 0) + (report?.totalFailed || 0);
  const passRate = totalAssertions > 0 ? Math.round(((report?.totalPassed || 0) / totalAssertions) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden text-xs text-slate-200">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Play size={14} className="fill-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Collection Runner: {collection.name}</span>
                {report && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      report.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : report.status === 'cancelled'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {report.status}
                  </span>
                )}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Configuration Panel (or Summary if completed) */}
          <div className="w-80 border-r border-slate-800 bg-slate-950/30 flex flex-col p-4 space-y-4 overflow-y-auto">
            {!report && !isRunning ? (
              <>
                <div className="flex items-center gap-1.5 font-semibold text-slate-300 pb-2 border-b border-slate-800">
                  <Sliders size={14} className="text-blue-400" />
                  <span>Execution Settings</span>
                </div>

                {/* Iterations */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Iterations</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={iterations}
                    onChange={(e) => setIterations(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Number of times the suite will execute</p>
                </div>

                {/* Delay */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Delay (ms)</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="50"
                    value={delayMs}
                    onChange={(e) => setDelayMs(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Pause between consecutive requests</p>
                </div>

                {/* Stop on error */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={stopOnError}
                      onChange={(e) => setStopOnError(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span className="text-[11px] text-slate-300">Stop run on first error / assertion failure</span>
                  </label>
                </div>

                {/* Data File */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-300 font-semibold">Iteration Data (CSV / JSON)</label>
                    <select
                      value={dataFormat}
                      onChange={(e) => setDataFormat(e.target.value as 'csv' | 'json')}
                      className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300"
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>
                  <textarea
                    rows={4}
                    placeholder={
                      dataFormat === 'csv'
                        ? 'userId,role,code\n1,admin,200\n2,editor,200'
                        : '[{"userId": 1}, {"userId": 2}]'
                    }
                    value={dataFileContent}
                    onChange={(e) => setDataFileContent(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-[10px] font-mono outline-none text-slate-200 resize-none placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={handleParseDataFile}
                    className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded font-medium transition-colors text-[11px]"
                  >
                    Parse Data ({parsedData ? `${parsedData.length} rows loaded` : 'Load'})
                  </button>
                  {dataError && <p className="text-[10px] text-rose-400">{dataError}</p>}
                </div>
              </>
            ) : (
              // Results Summary Card
              <div className="space-y-4">
                <div className="font-semibold text-slate-300 pb-2 border-b border-slate-800 flex items-center justify-between">
                  <span>Run Summary</span>
                  <span className="font-mono text-[10px] text-slate-500">{report?.totalTimeMs || 0} ms</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase block mb-1">Pass Rate</span>
                    <span className={`text-xl font-bold font-mono ${passRate >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {passRate}%
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase block mb-1">Requests</span>
                    <span className="text-xl font-bold font-mono text-blue-400">
                      {report?.totalRequests || liveResults.length}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-950/20 rounded-lg border border-emerald-500/30 text-center">
                    <span className="text-[10px] text-emerald-400 uppercase block mb-1">Passed Tests</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      {report?.totalPassed || 0}
                    </span>
                  </div>
                  <div className="p-3 bg-rose-950/20 rounded-lg border border-rose-500/30 text-center">
                    <span className="text-[10px] text-rose-400 uppercase block mb-1">Failed Tests</span>
                    <span className="text-xl font-bold font-mono text-rose-400">
                      {report?.totalFailed || 0}
                    </span>
                  </div>
                </div>

                {report && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleExport('html')}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Download size={13} />
                      <span>Export HTML Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('json')}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileCode size={13} />
                      <span>Export JSON Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCiWorkflow?.(collectionId)}
                      className="w-full py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Workflow size={13} />
                      <span>Generate CI/CD Pipeline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReport(null)}
                      className="w-full py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RotateCcw size={13} />
                      <span>Configure New Run</span>
                    </button>
                  </div>
                )}

                {exportedStatus && (
                  <div className="p-2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] text-center">
                    {exportedStatus}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Request Selection or Execution Stream */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/50">
            {!report && !isRunning ? (
              // Request Checklist
              <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="font-semibold text-slate-200">
                    Select Requests ({selectedIds.length} of {requests.length} selected)
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="text-blue-400 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="text-slate-400 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 py-2">
                  {requests.map((req: RequestItem) => (
                    <label
                      key={req.id}
                      className="flex items-center gap-3 p-2 hover:bg-slate-900/60 rounded cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(req.id)}
                        onChange={() => handleToggleRequest(req.id)}
                        className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          req.method === 'GET'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : req.method === 'POST'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        {req.method}
                      </span>
                      <span className="font-medium text-slate-200 flex-1">{req.name}</span>
                      <span className="text-[11px] font-mono text-slate-500 truncate max-w-xs">{req.url}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              // Live Results Table
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <span className="font-semibold text-slate-300">
                    Execution Log ({liveResults.length} requests executed)
                  </span>
                  {isRunning && (
                    <div className="flex items-center gap-2 text-blue-400">
                      <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span>Executing suite...</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-800/30">
                  {liveResults.map((res, index) => (
                    <div key={index} className="p-3 hover:bg-slate-900/40 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono text-[10px]">#{index + 1} (Iter {res.iteration})</span>
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            res.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                          }`}
                        >
                          {res.method}
                        </span>
                        <span className="font-semibold text-slate-200">{res.requestName}</span>
                        <span className="ml-auto font-mono text-[11px] text-slate-400 flex items-center gap-2">
                          <span className={res.status >= 200 && res.status < 300 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                            {res.status}
                          </span>
                          <span>{res.timeMs}ms</span>
                        </span>
                      </div>

                      <div className="text-[10px] font-mono text-slate-500 truncate pl-6">{res.url}</div>

                      {/* Tests in this request */}
                      {res.tests.length > 0 && (
                        <div className="pl-6 space-y-1 pt-1">
                          {res.tests.map((t: { name: string; passed: boolean; error?: string }, tidx: number) => (
                            <div
                              key={tidx}
                              className={`p-1.5 rounded flex items-center gap-2 text-[11px] ${
                                t.passed ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                              }`}
                            >
                              {t.passed ? <Check size={12} className="text-emerald-400" /> : <X size={12} className="text-rose-400" />}
                              <span>{t.name}</span>
                              {!t.passed && t.error && (
                                <span className="text-[10px] font-mono text-rose-400 ml-auto">{t.error}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {res.error && (
                        <div className="pl-6 pt-1 text-[11px] text-rose-400 font-mono">
                          Error: {res.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {isRunning
              ? 'Collection run in progress...'
              : report
              ? `Run completed in ${report.totalTimeMs}ms`
              : `${selectedIds.length} requests ready to run`}
          </div>

          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                type="button"
                onClick={handleCancelRun}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded font-semibold transition-colors"
              >
                <Square size={13} className="fill-rose-400" />
                <span>Stop Run</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRun}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1.5 px-5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded font-semibold transition-colors shadow-lg shadow-blue-600/20"
              >
                <Play size={13} className="fill-white" />
                <span>Run {collection.name}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
