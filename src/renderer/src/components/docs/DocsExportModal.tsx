import React, { useState, useEffect } from 'react';
import { X, BookOpen, Download, Copy, Check, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface DocsExportModalProps {
  collectionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DocsExportModal: React.FC<DocsExportModalProps> = ({
  collectionId,
  isOpen,
  onClose
}) => {
  const { collections } = useAppStore();
  const collection = collections.find((c) => c.id === collectionId);

  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && collectionId) {
      setLoading(true);
      window.electronAPI.docs
        .generateHtml(collectionId)
        .then((content) => {
          setHtml(content);
        })
        .catch((err) => {
          console.error('Failed to generate HTML docs:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, collectionId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection?.name?.toLowerCase().replace(/\s+/g, '-') || 'api'}-docs.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenBrowser = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl w-[980px] max-w-[95vw] h-[85vh] max-h-[760px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <BookOpen size={18} className="text-blue-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Interactive API Documentation: {collection?.name}
              </h3>
              <p className="text-[11px] text-slate-400">
                Standalone HTML documentation with code snippets & schemas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Preview Mode</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied HTML' : 'Copy HTML'}</span>
            </button>
            <button
              onClick={handleOpenBrowser}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-colors"
            >
              <ExternalLink size={13} />
              <span>Open in New Tab</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors"
            >
              <Download size={13} />
              <span>Download HTML</span>
            </button>
          </div>
        </div>

        {/* Iframe Preview */}
        <div className="flex-1 bg-white relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Generating documentation...</span>
              </div>
            </div>
          ) : (
            <iframe
              srcDoc={html}
              title="Documentation Preview"
              className="w-full h-full border-0"
              sandbox="allow-same-origin allow-scripts"
            />
          )}
        </div>
      </div>
    </div>
  );
};
