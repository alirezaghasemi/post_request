import React, { useState } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import type { RequestBodyConfig, BodyType, KeyValuePair } from '@shared/types';
import { KeyValueTable } from './KeyValueTable';

interface BodyEditorProps {
  config: RequestBodyConfig;
  onChange: (config: RequestBodyConfig) => void;
}

export const BodyEditor: React.FC<BodyEditorProps> = ({ config, onChange }) => {
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleTypeChange = (type: BodyType) => {
    onChange({
      ...config,
      type
    });
  };

  const handleRawChange = (rawContent: string) => {
    onChange({
      ...config,
      rawContent
    });

    if (config.type === 'json' && rawContent.trim().length > 0) {
      try {
        JSON.parse(rawContent);
        setJsonError(null);
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
      }
    } else {
      setJsonError(null);
    }
  };

  const handleFormatJson = () => {
    if (!config.rawContent?.trim()) return;
    try {
      const parsed = JSON.parse(config.rawContent);
      const formatted = JSON.stringify(parsed, null, 2);
      handleRawChange(formatted);
      setJsonError(null);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Cannot format: Invalid JSON');
    }
  };

  const handleUrlencodedChange = (items: KeyValuePair[]) => {
    onChange({
      ...config,
      urlencodedData: items
    });
  };

  return (
    <div className="flex flex-col h-full space-y-2">
      {/* Body Type Radio Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-900/60 text-xs">
        <div className="flex items-center gap-4">
          {(['none', 'json', 'text', 'xml', 'urlencoded'] as BodyType[]).map((type) => (
            <label
              key={type}
              className={`flex items-center gap-1.5 cursor-pointer capitalize transition-colors ${
                config.type === type ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <input
                type="radio"
                name="bodyType"
                value={type}
                checked={config.type === type}
                onChange={() => handleTypeChange(type)}
                className="hidden"
              />
              <span className={`w-2.5 h-2.5 rounded-full border ${
                config.type === type ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
              }`} />
              <span>{type === 'urlencoded' ? 'x-www-form-urlencoded' : type}</span>
            </label>
          ))}
        </div>

        {config.type === 'json' && (
          <button
            type="button"
            onClick={handleFormatJson}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-blue-400 hover:text-blue-300 hover:bg-slate-800 transition-colors"
          >
            <Sparkles size={12} />
            <span>Format JSON</span>
          </button>
        )}
      </div>

      {/* Editor Body Area */}
      <div className="flex-1 p-2">
        {config.type === 'none' ? (
          <div className="h-32 flex items-center justify-center text-xs text-slate-500">
            This request does not have a body.
          </div>
        ) : config.type === 'urlencoded' ? (
          <KeyValueTable
            items={config.urlencodedData || []}
            onChange={handleUrlencodedChange}
            keyPlaceholder="Form Key"
            valuePlaceholder="Form Value"
          />
        ) : (
          <div className="flex flex-col h-full space-y-1">
            <textarea
              value={config.rawContent || ''}
              onChange={(e) => handleRawChange(e.target.value)}
              placeholder={`Enter raw ${config.type.toUpperCase()} content...`}
              rows={8}
              className="w-full h-44 p-3 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-200 outline-none focus:border-blue-500 transition-colors resize-y"
            />
            {jsonError && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                <AlertCircle size={13} />
                <span>JSON Warning: {jsonError}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
