import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'node:http';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { parseCliArgs, CliRunner, runCli } from '../src/cli/cli-engine';
import { generateJunitXml, generateJsonReport, generateCliTable } from '../src/cli/reporters';
import { generateGitHubActionsWorkflow } from '../src/cli/ci-generator';
import type { CollectionRunReport } from '../src/main/runner/report-exporter';

describe('DevPilot Headless CLI & CI/CD Automation (Phase 8)', () => {
  let server: http.Server;
  let serverPort: number = 0;
  let testDir: string;

  beforeAll(async () => {
    testDir = path.join(__dirname, 'tmp-cli-test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Connection', 'close');
      if (req.url === '/test-pass') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', value: 42 }));
      } else if (req.url === '/test-fail') {
        res.writeHead(500);
        res.end(JSON.stringify({ status: 'error', message: 'Internal Server Error' }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('1. CLI Argument Parsing', () => {
    it('should parse standard run arguments and flags correctly', () => {
      const args = [
        'run',
        './my-collection.json',
        '-e',
        './my-env.json',
        '-d',
        './data.csv',
        '-n',
        '3',
        '--delay-request',
        '100',
        '--bail',
        '--reporters',
        'cli,junit,json',
        '--reporter-junit-export',
        './reports/junit.xml',
        '--reporter-json-export',
        './reports/run.json'
      ];

      const parsed = parseCliArgs(args);
      expect(parsed.command).toBe('run');
      expect(parsed.collectionPath).toBe('./my-collection.json');
      expect(parsed.environmentPath).toBe('./my-env.json');
      expect(parsed.dataPath).toBe('./data.csv');
      expect(parsed.iterations).toBe(3);
      expect(parsed.delayRequestMs).toBe(100);
      expect(parsed.bail).toBe(true);
      expect(parsed.reporters).toEqual(['cli', 'junit', 'json']);
      expect(parsed.junitExportPath).toBe('./reports/junit.xml');
      expect(parsed.jsonExportPath).toBe('./reports/run.json');
    });

    it('should supply default options when optional flags are omitted', () => {
      const args = ['run', 'collection.json'];
      const parsed = parseCliArgs(args);
      expect(parsed.command).toBe('run');
      expect(parsed.collectionPath).toBe('collection.json');
      expect(parsed.iterations).toBe(1);
      expect(parsed.delayRequestMs).toBe(0);
      expect(parsed.bail).toBe(false);
      expect(parsed.reporters).toEqual(['cli']);
    });
  });

  describe('2. Headless Collection Execution & Exit Codes', () => {
    it('should execute collection, pass all assertions, and exit with code 0', async () => {
      const collectionFile = path.join(testDir, 'passing-collection.json');
      const collectionData = {
        info: {
          name: 'Passing Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Check Server Pass',
            request: {
              method: 'GET',
              url: `http://127.0.0.1:${serverPort}/test-pass`
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status is 200", function () {',
                    '  pm.expect(pm.response.code).to.eql(200);',
                    '});',
                    'pm.test("Value is 42", function () {',
                    '  var data = pm.response.json();',
                    '  pm.expect(data.value).to.eql(42);',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };
      fs.writeFileSync(collectionFile, JSON.stringify(collectionData, null, 2));

      const runner = new CliRunner();
      const result = await runner.execute({
        collectionPath: collectionFile,
        iterations: 1,
        reporters: ['json']
      });

      expect(result.exitCode).toBe(0);
      expect(result.report.summary.totalRequests).toBe(1);
      expect(result.report.summary.totalPassed).toBe(2);
      expect(result.report.summary.totalFailed).toBe(0);
      expect(result.report.status).toBe('completed');
    });

    it('should exit with code 1 when test assertions fail', async () => {
      const collectionFile = path.join(testDir, 'failing-collection.json');
      const collectionData = {
        info: {
          name: 'Failing Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Expect 200 but got 500',
            request: {
              method: 'GET',
              url: `http://127.0.0.1:${serverPort}/test-fail`
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status must be 200", function () {',
                    '  pm.expect(pm.response.code).to.eql(200);',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };
      fs.writeFileSync(collectionFile, JSON.stringify(collectionData, null, 2));

      const runner = new CliRunner();
      const result = await runner.execute({
        collectionPath: collectionFile,
        iterations: 1,
        reporters: ['json']
      });

      expect(result.exitCode).toBe(1);
      expect(result.report.summary.totalFailed).toBeGreaterThan(0);
    });

    it('should exit with code 2 on file not found or invalid args', async () => {
      const runner = new CliRunner();
      const result = await runner.execute({
        collectionPath: path.join(testDir, 'non-existent-collection.json'),
        iterations: 1,
        reporters: ['cli']
      });

      expect(result.exitCode).toBe(2);
      expect(result.errorMessage).toBeDefined();
    });
  });

  describe('3. Reporters (JUnit XML, JSON, ANSI Table)', () => {
    const sampleReport: CollectionRunReport = {
      runId: 'test-run-123',
      collectionName: 'Sample API Suite',
      startedAt: '2026-10-24T12:00:00.000Z',
      completedAt: '2026-10-24T12:00:02.000Z',
      totalDurationMs: 2000,
      status: 'failed',
      summary: {
        totalRequests: 2,
        totalPassed: 1,
        totalFailed: 1,
        iterations: 1
      },
      steps: [
        {
          stepIndex: 1,
          requestId: 'req-1',
          requestName: 'Get Users',
          method: 'GET',
          url: 'https://api.example.com/users',
          statusCode: 200,
          statusText: 'OK',
          responseTimeMs: 120,
          responseSizeBytes: 450,
          iteration: 1,
          assertions: [
            { name: 'Status is 200', passed: true }
          ]
        },
        {
          stepIndex: 2,
          requestId: 'req-2',
          requestName: 'Create User',
          method: 'POST',
          url: 'https://api.example.com/users',
          statusCode: 400,
          statusText: 'Bad Request',
          responseTimeMs: 95,
          responseSizeBytes: 120,
          iteration: 1,
          assertions: [
            { name: 'User created', passed: false, errorMessage: 'Expected status 201 but got 400' }
          ]
        }
      ]
    };

    it('should generate valid JUnit XML format', () => {
      const xml = generateJunitXml(sampleReport);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<testsuites');
      expect(xml).toContain('<testsuite name="Sample API Suite"');
      expect(xml).toContain('<testcase name="Get Users: Status is 200"');
      expect(xml).toContain('<failure message="Expected status 201 but got 400"');
    });

    it('should generate valid JSON format with all metadata', () => {
      const json = generateJsonReport(sampleReport);
      const parsed = JSON.parse(json);
      expect(parsed.collectionName).toBe('Sample API Suite');
      expect(parsed.summary.totalPassed).toBe(1);
      expect(parsed.summary.totalFailed).toBe(1);
      expect(parsed.steps).toHaveLength(2);
    });

    it('should generate human-readable ANSI CLI table with summary', () => {
      const table = generateCliTable(sampleReport);
      expect(table).toContain('Sample API Suite');
      expect(table).toContain('Get Users');
      expect(table).toContain('Create User');
      expect(table).toContain('Total Requests');
      expect(table).toContain('Passed Assertions');
      expect(table).toContain('Failed Assertions');
    });
  });

  describe('4. GitHub Actions Workflow Generation', () => {
    it('should generate a valid YAML workflow for DevPilot CLI in CI', () => {
      const workflowYaml = generateGitHubActionsWorkflow({
        workflowName: 'DevPilot API Tests',
        collectionFile: 'tests/e2e-collection.json',
        environmentFile: 'tests/staging.env.json',
        dataFile: 'tests/users.csv',
        iterations: 2,
        bail: true
      });

      expect(workflowYaml).toContain('name: DevPilot API Tests');
      expect(workflowYaml).toContain('on:');
      expect(workflowYaml).toContain('pull_request:');
      expect(workflowYaml).toContain('actions/setup-node@v4');
      expect(workflowYaml).toContain('devpilot run tests/e2e-collection.json');
      expect(workflowYaml).toContain('-e tests/staging.env.json');
      expect(workflowYaml).toContain('-d tests/users.csv');
      expect(workflowYaml).toContain('-n 2');
      expect(workflowYaml).toContain('--bail');
      expect(workflowYaml).toContain('--reporters cli,junit');
    });
  });
});
