import React from 'react';
import { Code, BookOpen } from 'lucide-react';

interface ScriptEditorProps {
  value: string;
  onChange: (code: string) => void;
  type: 'pre-request' | 'tests';
}

interface Snippet {
  title: string;
  description: string;
  code: string;
}

const PRE_REQUEST_SNIPPETS: Snippet[] = [
  {
    title: 'Set environment variable',
    description: 'Set a key-value pair in active environment',
    code: `pm.environment.set("timestamp", new Date().toISOString());\n`
  },
  {
    title: 'Get environment variable',
    description: 'Read a variable from active environment',
    code: `const token = pm.environment.get("token");\nconsole.log("Current token:", token);\n`
  },
  {
    title: 'Log message to console',
    description: 'Print message to DevPilot execution console',
    code: `console.log("Preparing request execution...");\n`
  }
];

const TEST_SNIPPETS: Snippet[] = [
  {
    title: 'Status code is 200',
    description: 'Verify HTTP status code is OK (200)',
    code: `pm.test("Status code is 200", () => {\n  pm.response.to.have.status(200);\n});\n`
  },
  {
    title: 'Response time is acceptable',
    description: 'Verify response time under 500ms',
    code: `pm.test("Response time is less than 500ms", () => {\n  pm.expect(pm.response.responseTime).to.be.below(500);\n});\n`
  },
  {
    title: 'Check JSON field value',
    description: 'Parse JSON response and assert property',
    code: `pm.test("User object has valid id", () => {\n  const data = pm.response.json();\n  pm.expect(data).to.have.property("id");\n});\n`
  },
  {
    title: 'Save token to environment',
    description: 'Extract token from response and save to environment',
    code: `pm.test("Extract and persist token", () => {\n  const data = pm.response.json();\n  if (data.token) {\n    pm.environment.set("authToken", data.token);\n  }\n});\n`
  }
];

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ value, onChange, type }) => {
  const snippets = type === 'pre-request' ? PRE_REQUEST_SNIPPETS : TEST_SNIPPETS;

  const insertSnippet = (code: string) => {
    const updated = value ? `${value.trimEnd()}\n\n${code}` : code;
    onChange(updated);
  };

  return (
    <div className="flex h-full text-xs">
      {/* Code Editor Area */}
      <div className="flex-1 flex flex-col border-r border-slate-800">
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Code size={13} className="text-blue-400" />
            <span>{type === 'pre-request' ? 'Pre-request Script (JavaScript)' : 'Post-response Tests (pm.test)'}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Isolated V8 Sandbox</span>
        </div>

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            type === 'pre-request'
              ? '// JavaScript code executed before sending the HTTP request\n// Example:\npm.environment.set("timestamp", Date.now());\nconsole.log("Ready");'
              : '// JavaScript test assertions executed after response is received\n// Example:\npm.test("Status is 200", () => {\n  pm.response.to.have.status(200);\n});'
          }
          className="flex-1 p-3 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed outline-none resize-none selection:bg-blue-600/30"
          spellCheck={false}
        />
      </div>

      {/* Snippets Sidebar */}
      <div className="w-64 bg-slate-900/60 flex flex-col">
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-800 text-slate-300 font-semibold">
          <BookOpen size={13} className="text-amber-400" />
          <span>Snippets</span>
        </div>

        <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
          {snippets.map((snip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => insertSnippet(snip.code)}
              className="w-full text-left p-2 rounded bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors group"
            >
              <div className="font-semibold text-slate-200 group-hover:text-blue-400 text-[11px]">
                {snip.title}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                {snip.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
