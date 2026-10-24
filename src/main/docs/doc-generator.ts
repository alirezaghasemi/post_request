import type { Collection, RequestItem } from '../../shared/types';
import { generateCodeSnippet } from '../../shared/code-generator';

export function generateCollectionHtmlDocs(
  collection: Pick<Collection, 'id' | 'name' | 'description'>,
  requests: RequestItem[]
): string {
  const title = escapeHtml(collection.name || 'API Documentation');
  const description = escapeHtml(collection.description || '');

  const itemsHtml = requests
    .map((req, idx) => {
      const method = (req.method || 'GET').toUpperCase();
      const methodColor =
        method === 'GET'
          ? '#10b981'
          : method === 'POST'
          ? '#3b82f6'
          : method === 'PUT'
          ? '#f59e0b'
          : method === 'DELETE'
          ? '#ef4444'
          : '#8b5cf6';

      let headersList: Array<{ key: string; value: string }> = [];
      try {
        if (req.headers) {
          const parsed = JSON.parse(req.headers);
          if (Array.isArray(parsed)) {
            headersList = parsed.filter((h: any) => h.enabled !== false && h.key);
          }
        }
      } catch {}

      let paramsList: Array<{ key: string; value: string; description?: string }> = [];
      try {
        if (req.params) {
          const parsed = JSON.parse(req.params);
          if (Array.isArray(parsed)) {
            paramsList = parsed.filter((p: any) => p.enabled !== false && p.key);
          }
        }
      } catch {}

      let bodyContent = '';
      try {
        if (req.body) {
          const parsed = JSON.parse(req.body);
          if (parsed.type !== 'none' && parsed.rawContent) {
            bodyContent = parsed.rawContent;
          }
        }
      } catch {}

      const curlSnippet = generateCodeSnippet(req as any, 'curl');
      const jsSnippet = generateCodeSnippet(req as any, 'javascript');
      const pySnippet = generateCodeSnippet(req as any, 'python');

      return `
        <article id="req-${idx}" class="endpoint-card">
          <header class="endpoint-header">
            <span class="badge-method" style="background: ${methodColor}20; color: ${methodColor}; border: 1px solid ${methodColor}40;">${method}</span>
            <span class="endpoint-name">${escapeHtml(req.name)}</span>
            <span class="endpoint-url">${escapeHtml(req.url)}</span>
          </header>

          ${
            (req as any).description
              ? `<p class="endpoint-desc">${escapeHtml((req as any).description)}</p>`
              : ''
          }

          ${
            paramsList.length > 0
              ? `
            <div class="meta-section">
              <h4>Query Parameters</h4>
              <table class="meta-table">
                <thead><tr><th>Name</th><th>Value</th><th>Description</th></tr></thead>
                <tbody>
                  ${paramsList
                    .map(
                      (p) =>
                        `<tr><td><code>${escapeHtml(p.key)}</code></td><td>${escapeHtml(
                          p.value
                        )}</td><td>${escapeHtml(p.description || '')}</td></tr>`
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
              : ''
          }

          ${
            headersList.length > 0
              ? `
            <div class="meta-section">
              <h4>Headers</h4>
              <table class="meta-table">
                <thead><tr><th>Header</th><th>Value</th></tr></thead>
                <tbody>
                  ${headersList
                    .map(
                      (h) =>
                        `<tr><td><code>${escapeHtml(h.key)}</code></td><td>${escapeHtml(
                          h.value
                        )}</td></tr>`
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
              : ''
          }

          ${
            bodyContent
              ? `
            <div class="meta-section">
              <h4>Request Body</h4>
              <pre class="code-block"><code>${escapeHtml(bodyContent)}</code></pre>
            </div>`
              : ''
          }

          <div class="meta-section">
            <h4>Code Snippets</h4>
            <div class="snippets-container">
              <details open>
                <summary>cURL</summary>
                <pre class="code-block"><code>${escapeHtml(curlSnippet)}</code></pre>
              </details>
              <details>
                <summary>JavaScript (Fetch)</summary>
                <pre class="code-block"><code>${escapeHtml(jsSnippet)}</code></pre>
              </details>
              <details>
                <summary>Python (Requests)</summary>
                <pre class="code-block"><code>${escapeHtml(pySnippet)}</code></pre>
              </details>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — DevPilot API Docs</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #0f172a;
      --border: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #3b82f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.5;
      padding: 32px 20px;
    }
    .container {
      max-width: 1040px;
      margin: 0 auto;
    }
    header.doc-header {
      padding-bottom: 24px;
      margin-bottom: 32px;
      border-bottom: 1px solid var(--border);
    }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    p.lead { color: var(--text-muted); font-size: 15px; }
    .stats-bar {
      display: flex;
      gap: 16px;
      margin-top: 16px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .endpoint-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .endpoint-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .badge-method {
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .endpoint-name {
      font-size: 16px;
      font-weight: 600;
    }
    .endpoint-url {
      font-family: monospace;
      font-size: 13px;
      color: var(--text-muted);
      margin-left: auto;
      background: #0b1120;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #1e293b;
    }
    .endpoint-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    .meta-section {
      margin-top: 16px;
    }
    h4 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      background: #090e1c;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .meta-table th, .meta-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .meta-table th {
      background: #0e1526;
      color: var(--text-muted);
      font-weight: 600;
    }
    code {
      font-family: monospace;
      font-size: 12px;
      color: #38bdf8;
    }
    pre.code-block {
      background: #040711;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      font-size: 12px;
      font-family: monospace;
      color: #e2e8f0;
      margin-top: 4px;
    }
    details {
      background: #090e1c;
      border: 1px solid var(--border);
      border-radius: 6px;
      margin-bottom: 8px;
      padding: 8px 12px;
    }
    summary {
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
    }
    summary:hover {
      color: var(--text);
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="doc-header">
      <h1>${title}</h1>
      ${description ? `<p class="lead">${description}</p>` : ''}
      <div class="stats-bar">
        <span>Endpoints: <strong>${requests.length}</strong></span>
        <span>Generated with: <strong>DevPilot API Studio</strong></span>
        <span>Date: <strong>${new Date().toLocaleDateString()}</strong></span>
      </div>
    </header>

    <main>
      ${itemsHtml}
    </main>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
