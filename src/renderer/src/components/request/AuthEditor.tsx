import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import type { AuthConfig, AuthType } from '@shared/types';

interface AuthEditorProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

export const AuthEditor: React.FC<AuthEditorProps> = ({ auth, onChange }) => {
  const [showSecret, setShowSecret] = useState(false);

  const handleTypeChange = (type: AuthType) => {
    onChange({
      ...auth,
      type
    });
  };

  return (
    <div className="p-4 space-y-4 max-w-lg text-xs">
      {/* Type Selector */}
      <div className="flex items-center gap-3">
        <label className="text-slate-400 font-medium w-24">Auth Type:</label>
        <select
          value={auth.type}
          onChange={(e) => handleTypeChange(e.target.value as AuthType)}
          className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-200 outline-none focus:border-blue-500 font-semibold cursor-pointer"
        >
          <option value="none">No Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="apikey">API Key</option>
        </select>
      </div>

      {/* None */}
      {auth.type === 'none' && (
        <div className="p-4 text-center text-slate-500 border border-dashed border-slate-800 rounded">
          This request will not transmit authorization credentials.
        </div>
      )}

      {/* Bearer Token */}
      {auth.type === 'bearer' && (
        <div className="space-y-2 border border-slate-800 rounded-lg p-3 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
            <KeyRound size={14} className="text-blue-400" />
            <span>Bearer Token</span>
          </div>
          <div className="flex items-center bg-slate-950 border border-slate-700 rounded px-2.5 py-1">
            <input
              type={showSecret ? 'text' : 'password'}
              placeholder="Paste token here..."
              value={auth.bearerToken || ''}
              onChange={(e) => onChange({ ...auth, bearerToken: e.target.value })}
              className="flex-1 bg-transparent text-slate-200 font-mono outline-none"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="text-slate-500 hover:text-slate-300 ml-2"
            >
              {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Will automatically add header: <code className="text-blue-400 font-mono">Authorization: Bearer &lt;token&gt;</code>
          </p>
        </div>
      )}

      {/* Basic Auth */}
      {auth.type === 'basic' && (
        <div className="space-y-3 border border-slate-800 rounded-lg p-3 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
            <KeyRound size={14} className="text-amber-400" />
            <span>Basic Authentication</span>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Username</label>
              <input
                type="text"
                placeholder="Username"
                value={auth.basicUsername || ''}
                onChange={(e) => onChange({ ...auth, basicUsername: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Password</label>
              <div className="flex items-center bg-slate-950 border border-slate-700 rounded px-2.5 py-1">
                <input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Password"
                  value={auth.basicPassword || ''}
                  onChange={(e) => onChange({ ...auth, basicPassword: e.target.value })}
                  className="flex-1 bg-transparent text-slate-200 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-slate-500 hover:text-slate-300 ml-2"
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key */}
      {auth.type === 'apikey' && (
        <div className="space-y-3 border border-slate-800 rounded-lg p-3 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
            <KeyRound size={14} className="text-purple-400" />
            <span>API Key</span>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Key Name</label>
              <input
                type="text"
                placeholder="e.g. X-API-KEY or api_key"
                value={auth.apiKeyName || ''}
                onChange={(e) => onChange({ ...auth, apiKeyName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Key Value</label>
              <div className="flex items-center bg-slate-950 border border-slate-700 rounded px-2.5 py-1">
                <input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Secret value"
                  value={auth.apiKeyValue || ''}
                  onChange={(e) => onChange({ ...auth, apiKeyValue: e.target.value })}
                  className="flex-1 bg-transparent text-slate-200 font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-slate-500 hover:text-slate-300 ml-2"
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Add To</label>
              <select
                value={auth.apiKeyAddTo || 'header'}
                onChange={(e) => onChange({ ...auth, apiKeyAddTo: e.target.value as 'header' | 'query' })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none"
              >
                <option value="header">Header</option>
                <option value="query">Query Params</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
