function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateJunitXml(report: any): string {
  const collectionName = report.collectionName || report.name || 'DevPilot Collection';
  const steps: any[] = report.steps || report.results || [];
  const durationSec = ((report.totalDurationMs || report.totalTimeMs || 0) / 1000).toFixed(3);

  let totalTests = 0;
  let totalFailures = 0;
  const testcaseXmls: string[] = [];

  for (const step of steps) {
    const assertions: any[] = step.assertions || step.tests || [];
    const reqName = step.requestName || step.name || 'Unnamed Request';
    const stepTimeSec = ((step.responseTimeMs || step.timeMs || 0) / 1000).toFixed(3);

    if (assertions.length === 0) {
      // Record step itself as a testcase
      totalTests++;
      const isFailed = step.error || (step.statusCode && step.statusCode >= 400 && step.statusCode !== 404);
      if (isFailed) totalFailures++;
      testcaseXmls.push(
        `    <testcase name="${escapeXml(reqName)}" classname="${escapeXml(collectionName)}" time="${stepTimeSec}">${
          isFailed
            ? `\n      <failure message="${escapeXml(step.error || `HTTP ${step.statusCode}`)}" type="Error">${escapeXml(
                step.error || `HTTP ${step.statusCode}`
              )}</failure>\n    `
            : ''
        }</testcase>`
      );
    } else {
      for (const a of assertions) {
        totalTests++;
        const testName = `${reqName}: ${a.name}`;
        const passed = a.passed === true;
        if (!passed) totalFailures++;
        const errMsg = a.errorMessage || a.error || 'Assertion failed';

        testcaseXmls.push(
          `    <testcase name="${escapeXml(testName)}" classname="${escapeXml(collectionName)}" time="${stepTimeSec}">${
            !passed
              ? `\n      <failure message="${escapeXml(errMsg)}" type="AssertionError">${escapeXml(errMsg)}</failure>\n    `
              : ''
          }</testcase>`
        );
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${escapeXml(collectionName)}" tests="${totalTests}" failures="${totalFailures}" errors="0" time="${durationSec}">
  <testsuite name="${escapeXml(collectionName)}" tests="${totalTests}" failures="${totalFailures}" errors="0" time="${durationSec}">
${testcaseXmls.join('\n')}
  </testsuite>
</testsuites>
`;
}

export function generateJsonReport(report: any): string {
  const steps = report.steps || report.results || [];
  const totalPassed = report.summary?.totalPassed ?? report.totalPassed ?? 0;
  const totalFailed = report.summary?.totalFailed ?? report.totalFailed ?? 0;
  const totalRequests = report.summary?.totalRequests ?? report.totalRequests ?? steps.length;
  const iterations = report.summary?.iterations ?? report.iterations ?? 1;

  const standardReport = {
    runId: report.runId || report.id || 'devpilot-run',
    collectionName: report.collectionName || 'DevPilot Collection',
    status: report.status || (totalFailed > 0 ? 'failed' : 'completed'),
    startedAt: report.startedAt || new Date().toISOString(),
    completedAt: report.completedAt || new Date().toISOString(),
    totalDurationMs: report.totalDurationMs || report.totalTimeMs || 0,
    summary: {
      totalRequests,
      totalPassed,
      totalFailed,
      iterations
    },
    steps
  };

  return JSON.stringify(standardReport, null, 2);
}

export function generateCliTable(report: any): string {
  const collectionName = report.collectionName || 'DevPilot API Suite';
  const steps: any[] = report.steps || report.results || [];
  const totalPassed = report.summary?.totalPassed ?? report.totalPassed ?? 0;
  const totalFailed = report.summary?.totalFailed ?? report.totalFailed ?? 0;
  const totalRequests = report.summary?.totalRequests ?? report.totalRequests ?? steps.length;
  const durationMs = report.totalDurationMs || report.totalTimeMs || 0;

  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const green = '\x1b[32m';
  const red = '\x1b[31m';
  const yellow = '\x1b[33m';
  const cyan = '\x1b[36m';
  const gray = '\x1b[90m';

  const lines: string[] = [];
  lines.push('');
  lines.push(`${bold}${cyan}======================================================================${reset}`);
  lines.push(`${bold} DevPilot API Studio — Headless CLI Runner${reset}`);
  lines.push(`${gray} Collection: ${bold}${collectionName}${reset}`);
  lines.push(`${bold}${cyan}======================================================================${reset}`);
  lines.push('');

  steps.forEach((step, idx) => {
    const iter = step.iteration ? `[Iter ${step.iteration}] ` : '';
    const reqName = step.requestName || step.name || 'Request';
    const method = step.method || 'GET';
    const code = step.statusCode ?? step.status ?? 0;
    const time = step.responseTimeMs ?? step.timeMs ?? 0;
    const statusColor = code >= 200 && code < 300 ? green : code >= 400 ? red : yellow;

    lines.push(
      `  ${gray}#${idx + 1}${reset} ${iter}${bold}${cyan}${method}${reset} ${reqName} ${gray}—${reset} ${statusColor}${code}${reset} ${gray}(${time}ms)${reset}`
    );

    const assertions = step.assertions || step.tests || [];
    for (const a of assertions) {
      if (a.passed) {
        lines.push(`     ${green}✓${reset} ${gray}${a.name}${reset}`);
      } else {
        const err = a.errorMessage || a.error || 'Failed';
        lines.push(`     ${red}✗ ${a.name}${reset}`);
        lines.push(`       ${red}↳ ${err}${reset}`);
      }
    }
  });

  lines.push('');
  lines.push(`${bold}----------------------------------------------------------------------${reset}`);
  lines.push(`${bold} Execution Summary:${reset}`);
  lines.push(`   Total Requests:    ${bold}${totalRequests}${reset}`);
  lines.push(`   Passed Assertions: ${green}${bold}${totalPassed}${reset}`);
  lines.push(`   Failed Assertions: ${totalFailed > 0 ? red : green}${bold}${totalFailed}${reset}`);
  lines.push(`   Total Duration:    ${gray}${durationMs} ms${reset}`);
  lines.push(
    `   Overall Status:    ${
      totalFailed > 0 ? `${bold}${red}FAILED${reset}` : `${bold}${green}PASSED${reset}`
    }`
  );
  lines.push(`${bold}----------------------------------------------------------------------${reset}`);
  lines.push('');

  return lines.join('\n');
}
