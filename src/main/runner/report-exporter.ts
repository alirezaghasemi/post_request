import type { RunnerStepResult, CollectionRunReport } from '../../shared/types';
export type { RunnerStepResult, CollectionRunReport };

export function exportReportToJson(report: CollectionRunReport): string {
  return JSON.stringify(report, null, 2);
}

export function exportReportToHtml(report: CollectionRunReport): string {
  const totalAssertions = report.totalPassed + report.totalFailed;
  const passPercentage = totalAssertions > 0 ? Math.round((report.totalPassed / totalAssertions) * 100) : 100;

  const rowsHtml = report.results
    .map((r, i) => {
      const testsHtml = r.tests
        .map(
          (t) => `
          <div style="margin: 4px 0; padding: 6px 10px; border-radius: 4px; font-size: 12px; background: ${
            t.passed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
          }; border: 1px solid ${t.passed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}">
            <span style="font-weight: bold; color: ${t.passed ? '#10b981' : '#ef4444'}">${
            t.passed ? '✓ PASS' : '✗ FAIL'
          }:</span>
            <span style="color: #e2e8f0; margin-left: 6px;">${escapeHtml(t.name)}</span>
            ${
              !t.passed && t.error
                ? `<div style="margin-top: 4px; padding: 4px 8px; background: #0f172a; border-radius: 3px; font-family: monospace; font-size: 11px; color: #fca5a5;">${escapeHtml(
                    t.error
                  )}</div>`
                : ''
            }
          </div>
        `
        )
        .join('');

      return `
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 12px 16px; font-family: monospace; color: #94a3b8;">#${i + 1} (Iter ${r.iteration})</td>
          <td style="padding: 12px 16px;">
            <span style="padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; font-family: monospace; background: #1e293b; color: #38bdf8;">${escapeHtml(
              r.method
            )}</span>
            <span style="font-weight: 600; color: #f1f5f9; margin-left: 8px;">${escapeHtml(r.requestName)}</span>
            <div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 2px;">${escapeHtml(
              r.url
            )}</div>
          </td>
          <td style="padding: 12px 16px; font-family: monospace;">
            <span style="color: ${r.status >= 200 && r.status < 300 ? '#10b981' : '#f59e0b'}; font-weight: bold;">${
        r.status
      }</span>
            <span style="color: #64748b; margin-left: 8px;">${r.timeMs}ms</span>
          </td>
          <td style="padding: 12px 16px;">
            ${r.tests.length > 0 ? testsHtml : '<span style="color: #64748b; font-size: 11px;">No tests</span>'}
            ${
              r.error
                ? `<div style="color: #ef4444; font-size: 11px; margin-top: 4px;">Error: ${escapeHtml(r.error)}</div>`
                : ''
            }
          </td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevPilot API Studio — ${escapeHtml(report.collectionName)} Test Report</title>
  <style>
    body {
      margin: 0;
      padding: 32px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f17;
      color: #e2e8f0;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #334155;
      margin-bottom: 24px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 8px 0;
    }
    .meta {
      font-size: 13px;
      color: #94a3b8;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      padding: 16px;
      border-radius: 8px;
    }
    .card-label {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .card-value {
      font-size: 28px;
      font-weight: 700;
    }
    .table-container {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 8px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      background: #1f2937;
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">DevPilot API Studio — Test Execution Report</div>
      <div class="meta">
        Collection: <strong style="color: #38bdf8;">${escapeHtml(report.collectionName)}</strong> |
        Iterations: <strong>${report.iterations}</strong> |
        Status: <strong style="color: ${report.status === 'completed' ? '#10b981' : '#ef4444'};">${escapeHtml(
    report.status.toUpperCase()
  )}</strong> |
        Date: ${new Date(report.startedAt).toLocaleString()}
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-label">Pass Rate</div>
        <div class="card-value" style="color: ${passPercentage >= 90 ? '#10b981' : '#f59e0b'};">${passPercentage}% Passing</div>
      </div>
      <div class="card">
        <div class="card-label">Passed Assertions</div>
        <div class="card-value" style="color: #10b981;">${report.totalPassed}</div>
      </div>
      <div class="card">
        <div class="card-label">Failed Assertions</div>
        <div class="card-value" style="color: ${report.totalFailed > 0 ? '#ef4444' : '#9ca3af'};">${report.totalFailed}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Time</div>
        <div class="card-value" style="color: #38bdf8;">${report.totalTimeMs} ms</div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 120px;">Execution</th>
            <th>Request Details</th>
            <th style="width: 160px;">Response</th>
            <th>Test Assertions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
