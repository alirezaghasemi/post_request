import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import type { AuthConfig, AuthType } from '@shared/types';

interface AuthEditorProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

export const AuthEditor: React.FC<AuthEditorProps> = ({ auth, onChange }) => {
  const [showSecret, setShowSecret] = useState(false);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [tokenMsg, setTokenMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const handleTypeChange = (type: AuthType) => {
    onChange({
      ...auth,
      type
    });
  };

  const handleGeneratePKCE = async () => {
    try {
      const pkce = await window.electronAPI.auth.generatePKCE();
      onChange({
        ...auth,
        oauth2: {
          ...auth.oauth2,
          grantType: auth.oauth2?.grantType || 'authorization_code',
          codeVerifier: pkce.codeVerifier,
          codeChallenge: pkce.codeChallenge
        }
      });
      setTokenMsg({ text: 'PKCE code verifier and challenge generated!' });
    } catch (err: any) {
      setTokenMsg({ text: `Failed to generate PKCE: ${err.message}`, error: true });
    }
  };

  const handleFetchClientCredentialsToken = async () => {
    if (!auth.oauth2?.tokenUrl || !auth.oauth2?.clientId || !auth.oauth2?.clientSecret) {
      setTokenMsg({ text: 'Token URL, Client ID, and Client Secret are required', error: true });
      return;
    }

    setIsFetchingToken(true);
    setTokenMsg(null);
    try {
      const res = await window.electronAPI.auth.getOAuth2Token({
        tokenUrl: auth.oauth2.tokenUrl,
        clientId: auth.oauth2.clientId,
        clientSecret: auth.oauth2.clientSecret,
        scope: auth.oauth2.scope
      });

      onChange({
        ...auth,
        oauth2: {
          ...auth.oauth2,
          accessToken: res.accessToken,
          tokenType: res.tokenType || 'Bearer'
        }
      });
      setTokenMsg({ text: `Token received successfully! (Expires in ${res.expiresIn || 3600}s)` });
    } catch (err: any) {
      setTokenMsg({ text: err.message, error: true });
    } finally {
      setIsFetchingToken(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-xl text-xs">
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
          <option value="digest">Digest Auth (RFC 7616)</option>
          <option value="oauth2">OAuth 2.0 (PKCE & Client Credentials)</option>
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
              placeholder="Paste token or {{token}} here..."
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
                placeholder="Username or {{username}}"
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
                  placeholder="Password or {{password}}"
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
                  placeholder="Secret value or {{api_key}}"
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

      {/* Digest Auth */}
      {auth.type === 'digest' && (
        <div className="space-y-3 border border-slate-800 rounded-lg p-3 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-1">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>HTTP Digest Authentication (RFC 7616 / RFC 2617)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Username</label>
              <input
                type="text"
                placeholder="Username or {{username}}"
                value={auth.digest?.username || ''}
                onChange={(e) =>
                  onChange({
                    ...auth,
                    digest: { ...auth.digest, username: e.target.value }
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Password</label>
              <input
                type="password"
                placeholder="Password or {{password}}"
                value={auth.digest?.password || ''}
                onChange={(e) =>
                  onChange({
                    ...auth,
                    digest: { ...auth.digest, password: e.target.value }
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Realm (Optional)</label>
              <input
                type="text"
                placeholder="Realm"
                value={auth.digest?.realm || ''}
                onChange={(e) =>
                  onChange({
                    ...auth,
                    digest: { ...auth.digest, realm: e.target.value }
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Algorithm</label>
              <select
                value={auth.digest?.algorithm || 'MD5'}
                onChange={(e) =>
                  onChange({
                    ...auth,
                    digest: { ...auth.digest, algorithm: e.target.value }
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none"
              >
                <option value="MD5">MD5</option>
                <option value="SHA-256">SHA-256</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* OAuth 2.0 */}
      {auth.type === 'oauth2' && (
        <div className="space-y-3 border border-slate-800 rounded-lg p-3 bg-slate-900/60">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Sparkles size={14} className="text-yellow-400" />
              <span>OAuth 2.0 (PKCE & Client Credentials)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Grant Type</label>
              <select
                value={auth.oauth2?.grantType || 'client_credentials'}
                onChange={(e) =>
                  onChange({
                    ...auth,
                    oauth2: {
                      ...auth.oauth2,
                      grantType: e.target.value as any
                    }
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 outline-none"
              >
                <option value="client_credentials">Client Credentials</option>
                <option value="authorization_code">Authorization Code (with PKCE)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Access Token</label>
              <div className="flex items-center bg-slate-950 border border-slate-700 rounded px-2.5 py-1">
                <input
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Access Token or {{token}}"
                  value={auth.oauth2?.accessToken || ''}
                  onChange={(e) =>
                    onChange({
                      ...auth,
                      oauth2: { ...auth.oauth2, grantType: auth.oauth2?.grantType || 'client_credentials', accessToken: e.target.value }
                    })
                  }
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

            {auth.oauth2?.grantType === 'client_credentials' && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Token URL</label>
                  <input
                    type="text"
                    placeholder="https://oauth.example.com/oauth/token"
                    value={auth.oauth2?.tokenUrl || ''}
                    onChange={(e) =>
                      onChange({
                        ...auth,
                        oauth2: { ...auth.oauth2, grantType: 'client_credentials', tokenUrl: e.target.value }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Client ID</label>
                    <input
                      type="text"
                      placeholder="Client ID"
                      value={auth.oauth2?.clientId || ''}
                      onChange={(e) =>
                        onChange({
                          ...auth,
                          oauth2: { ...auth.oauth2, grantType: 'client_credentials', clientId: e.target.value }
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Client Secret</label>
                    <input
                      type="password"
                      placeholder="Client Secret"
                      value={auth.oauth2?.clientSecret || ''}
                      onChange={(e) =>
                        onChange({
                          ...auth,
                          oauth2: { ...auth.oauth2, grantType: 'client_credentials', clientSecret: e.target.value }
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFetchClientCredentialsToken}
                    disabled={isFetchingToken}
                    className="flex items-center gap-1.5 px-3 py-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white rounded font-medium shadow-sm"
                  >
                    <RefreshCw size={12} className={isFetchingToken ? 'animate-spin' : ''} />
                    <span>Get New Access Token</span>
                  </button>
                </div>
              </div>
            )}

            {auth.oauth2?.grantType === 'authorization_code' && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">PKCE Parameters (RFC 7636):</span>
                  <button
                    type="button"
                    onClick={handleGeneratePKCE}
                    className="flex items-center gap-1 px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px]"
                  >
                    <Sparkles size={11} />
                    <span>Generate PKCE</span>
                  </button>
                </div>
                {auth.oauth2?.codeChallenge && (
                  <div className="bg-slate-950 border border-slate-800 rounded p-2 text-[10px] space-y-1 font-mono text-slate-400">
                    <div>
                      <span className="text-slate-500">Challenge: </span>
                      <span className="text-blue-300">{auth.oauth2.codeChallenge}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Verifier: </span>
                      <span className="text-slate-400">{auth.oauth2.codeVerifier}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tokenMsg && (
              <div
                className={`p-2 rounded text-[11px] ${
                  tokenMsg.error ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {tokenMsg.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
