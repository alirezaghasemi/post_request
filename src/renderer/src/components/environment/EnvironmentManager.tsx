import React, { useState } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Download,
  CheckCircle2
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { EnvironmentVariable } from '@shared/types';

interface EnvironmentManagerProps {
  onClose?: () => void;
}

export const EnvironmentManager: React.FC<EnvironmentManagerProps> = () => {
  const {
    environments,
    activeEnvironmentId,
    setActiveEnvironment,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment
  } = useAppStore();

  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(
    activeEnvironmentId || (environments.length > 0 ? environments[0].id : null)
  );

  const [newEnvName, setNewEnvName] = useState('');
  const [showNewEnvInput, setShowNewEnvInput] = useState(false);
  const [showSecretMap, setShowSecretMap] = useState<Record<number, boolean>>({});

  const currentEnv = environments.find((e) => e.id === selectedEnvId);

  const handleCreateEnv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvName.trim()) return;
    await createEnvironment(newEnvName.trim());
    setNewEnvName('');
    setShowNewEnvInput(false);
  };

  const handleVariableChange = (
    index: number,
    field: keyof EnvironmentVariable,
    val: any
  ) => {
    if (!currentEnv) return;
    const updatedVars = [...currentEnv.variables];
    updatedVars[index] = { ...updatedVars[index], [field]: val };
    updateEnvironment(currentEnv.id, { variables: updatedVars });
  };

  const handleAddVariable = () => {
    if (!currentEnv) return;
    const newVar: EnvironmentVariable = {
      key: '',
      value: '',
      type: 'default',
      enabled: true
    };
    updateEnvironment(currentEnv.id, {
      variables: [...currentEnv.variables, newVar]
    });
  };

  const handleDeleteVariable = (index: number) => {
    if (!currentEnv) return;
    const updatedVars = currentEnv.variables.filter((_, i) => i !== index);
    updateEnvironment(currentEnv.id, { variables: updatedVars });
  };

  const handleExportEnv = async () => {
    if (!currentEnv || !window.electronAPI) return;
    try {
      const exported = await window.electronAPI.importExport.exportEnvironment(currentEnv.id);
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentEnv.name.toLowerCase().replace(/\s+/g, '-')}.postman_environment.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export environment:', err);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-900/60 text-xs">
      {/* Left List of Environments */}
      <div className="w-56 border-r border-slate-800 bg-slate-900/90 flex flex-col p-2 select-none">
        <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <span>Environments</span>
          <button
            onClick={() => setShowNewEnvInput(true)}
            title="Create Environment"
            className="text-slate-400 hover:text-blue-400"
          >
            <Plus size={14} />
          </button>
        </div>

        {showNewEnvInput && (
          <form onSubmit={handleCreateEnv} className="my-2 p-1 bg-slate-800 rounded border border-slate-700">
            <input
              type="text"
              placeholder="e.g. Production"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              autoFocus
              className="w-full bg-slate-950 px-2 py-1 rounded text-slate-200 outline-none text-[11px] mb-1.5"
            />
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={() => setShowNewEnvInput(false)}
                className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-2 py-0.5 rounded text-[10px] bg-blue-600 text-white font-medium hover:bg-blue-500"
              >
                Save
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto space-y-1 mt-1">
          {environments.length === 0 ? (
            <div className="p-3 text-center text-slate-500 text-[11px]">
              No environments. Click + to add one.
            </div>
          ) : (
            environments.map((env) => {
              const isSelected = env.id === selectedEnvId;
              const isActive = env.id === activeEnvironmentId;

              return (
                <div
                  key={env.id}
                  onClick={() => setSelectedEnvId(env.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-800 text-slate-100 font-medium' : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Globe size={13} className={isActive ? 'text-emerald-400' : 'text-slate-500'} />
                    <span className="truncate">{env.name}</span>
                  </div>
                  {isActive && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-mono">
                      Active
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Variable Editor Table */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/40">
        {currentEnv ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header Details */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between select-none">
              <div>
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Globe size={16} className="text-blue-400" />
                  <span>{currentEnv.name}</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Variables can be referenced in URLs, headers, and bodies using <code className="text-blue-400 font-mono">&#123;&#123;var_name&#125;&#125;</code>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveEnvironment(currentEnv.id === activeEnvironmentId ? null : currentEnv.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    currentEnv.id === activeEnvironmentId
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <CheckCircle2 size={13} />
                  <span>{currentEnv.id === activeEnvironmentId ? 'Active Environment' : 'Set as Active'}</span>
                </button>

                <button
                  onClick={handleExportEnv}
                  title="Export to Postman Environment JSON"
                  className="p-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <Download size={14} />
                </button>

                <button
                  onClick={() => deleteEnvironment(currentEnv.id)}
                  title="Delete Environment"
                  className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Variable Table */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center border-b border-slate-800 bg-slate-900/40 text-slate-400 py-1.5 px-3 font-semibold text-[11px] select-none">
                <div className="w-8 text-center">✓</div>
                <div className="w-48 px-2">Variable Name</div>
                <div className="w-28 px-2">Type</div>
                <div className="flex-1 px-2">Current Value</div>
                <div className="w-8 text-center"></div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 font-mono">
                {currentEnv.variables.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-sans">
                    No variables defined in this environment. Click &ldquo;Add Variable&rdquo; below.
                  </div>
                ) : (
                  currentEnv.variables.map((item, index) => {
                    const isSecret = item.type === 'secret';
                    const showSecret = Boolean(showSecretMap[index]);

                    return (
                      <div
                        key={index}
                        className={`flex items-center px-3 py-1 hover:bg-slate-800/40 transition-colors ${
                          !item.enabled ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="w-8 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={(e) => handleVariableChange(index, 'enabled', e.target.checked)}
                            className="rounded border-slate-700 bg-slate-900 text-blue-500 cursor-pointer"
                          />
                        </div>

                        <div className="w-48 px-2">
                          <input
                            type="text"
                            placeholder="Variable key"
                            value={item.key}
                            onChange={(e) => handleVariableChange(index, 'key', e.target.value)}
                            className="w-full bg-transparent text-blue-400 outline-none focus:bg-slate-800/50 rounded px-1.5 py-0.5"
                          />
                        </div>

                        <div className="w-28 px-2">
                          <select
                            value={item.type}
                            onChange={(e) => handleVariableChange(index, 'type', e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 text-[11px] outline-none"
                          >
                            <option value="default">default</option>
                            <option value="secret">secret</option>
                          </select>
                        </div>

                        <div className="flex-1 px-2 flex items-center gap-1">
                          <input
                            type={isSecret && !showSecret ? 'password' : 'text'}
                            placeholder="Value"
                            value={item.value}
                            onChange={(e) => handleVariableChange(index, 'value', e.target.value)}
                            className="flex-1 bg-transparent text-slate-200 outline-none focus:bg-slate-800/50 rounded px-1.5 py-0.5"
                          />
                          {isSecret && (
                            <button
                              type="button"
                              onClick={() => setShowSecretMap({ ...showSecretMap, [index]: !showSecret })}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                            >
                              {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          )}
                        </div>

                        <div className="w-8 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteVariable(index)}
                            className="text-slate-500 hover:text-red-400 p-0.5"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Variable Button */}
              <div className="p-2 border-t border-slate-800 bg-slate-900/60">
                <button
                  type="button"
                  onClick={handleAddVariable}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-sans font-medium px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                >
                  <Plus size={13} />
                  <span>Add Variable</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 select-none">
            Select or create an environment from the sidebar.
          </div>
        )}
      </div>
    </div>
  );
};
