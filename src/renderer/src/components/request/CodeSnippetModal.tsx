import React, { useState } from 'react';
import { X, Copy, Check, Code } from 'lucide-react';
import { generateCodeSnippet, type SupportedLanguage } from '@shared/code-generator';

interface CodeSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    method: string;
    url: string;
    headers?: any;
    params?: any;
    body?: any;
  };
}

export const CodeSnippetModal: React.FC<CodeSnippetModalProps> = ({
  isOpen,
  onClose,
  request
}) => {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('curl');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const languages: Array<{ id: SupportedLanguage; label: string }> = [
    { id: 'curl', label: 'cURL' },
    { id: 'javascript', label: 'JavaScript (Fetch)' },
    { id: 'python', label: 'Python (Requests)' },
    { id: 'go', label: 'Go (net/http)' },
    { id: 'rust', label: 'Rust (reqwest)' }
  ];

  const code = generateCodeSnippet(request, selectedLang);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl w-[680px] max-w-[95vw] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Code size={16} className="text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-200">Generate Code Snippet</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Language Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-3 pt-2 gap-1 overflow-x-auto text-xs">
          {languages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setSelectedLang(lang.id)}
              className={`px-3 py-1.5 rounded-t text-xs font-medium transition-colors ${
                selectedLang === lang.id
                  ? 'bg-slate-800 text-blue-400 border-t-2 border-blue-500 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="p-4 bg-slate-950/70 relative">
          <button
            onClick={handleCopy}
            className="absolute top-6 right-6 flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors shadow-sm"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy Code</span>
              </>
            )}
          </button>
          <pre className="font-mono text-xs text-slate-200 p-3 bg-slate-900/90 rounded border border-slate-800/80 overflow-x-auto max-h-[360px] leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
