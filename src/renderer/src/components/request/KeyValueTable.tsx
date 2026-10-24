import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { KeyValuePair } from '@shared/types';

interface KeyValueTableProps {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export const KeyValueTable: React.FC<KeyValueTableProps> = ({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value'
}) => {
  const handleToggle = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    onChange(updated);
  };

  const handleChange = (index: number, field: 'key' | 'value' | 'description', val: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  const handleAdd = () => {
    const newItem: KeyValuePair = {
      id: `kv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      key: '',
      value: '',
      enabled: true,
      description: ''
    };
    onChange([...items, newItem]);
  };

  const handleDelete = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="w-full flex flex-col text-xs font-mono">
      {/* Table Header */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900/60 text-slate-400 py-1.5 px-3 font-semibold text-[11px] select-none">
        <div className="w-8 text-center">✓</div>
        <div className="flex-1 px-2">{keyPlaceholder}</div>
        <div className="flex-1 px-2">{valuePlaceholder}</div>
        <div className="flex-1 px-2 hidden md:block">Description</div>
        <div className="w-8 text-center"></div>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-4 text-center text-slate-500 font-sans text-xs">
            No items added yet. Click &ldquo;Add Row&rdquo; below.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center px-3 py-1 hover:bg-slate-800/40 transition-colors ${
                !item.enabled ? 'opacity-50' : ''
              }`}
            >
              <div className="w-8 flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={() => handleToggle(index)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex-1 px-2">
                <input
                  type="text"
                  placeholder={keyPlaceholder}
                  value={item.key}
                  onChange={(e) => handleChange(index, 'key', e.target.value)}
                  className="w-full bg-transparent text-slate-200 outline-none placeholder:text-slate-600 focus:bg-slate-800/50 rounded px-1.5 py-0.5"
                />
              </div>

              <div className="flex-1 px-2">
                <input
                  type="text"
                  placeholder={valuePlaceholder}
                  value={item.value}
                  onChange={(e) => handleChange(index, 'value', e.target.value)}
                  className="w-full bg-transparent text-slate-200 outline-none placeholder:text-slate-600 focus:bg-slate-800/50 rounded px-1.5 py-0.5"
                />
              </div>

              <div className="flex-1 px-2 hidden md:block">
                <input
                  type="text"
                  placeholder="Optional description"
                  value={item.description || ''}
                  onChange={(e) => handleChange(index, 'description', e.target.value)}
                  className="w-full bg-transparent text-slate-400 font-sans outline-none placeholder:text-slate-600 focus:bg-slate-800/50 rounded px-1.5 py-0.5"
                />
              </div>

              <div className="w-8 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  title="Remove row"
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Row Button */}
      <div className="p-2 border-t border-slate-800/60 bg-slate-950/40">
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-sans font-medium px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
        >
          <Plus size={13} />
          <span>Add Row</span>
        </button>
      </div>
    </div>
  );
};
