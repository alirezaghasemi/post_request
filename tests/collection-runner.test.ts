import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CollectionRunner } from '../src/main/runner/collection-runner';
import { parseDataFile } from '../src/main/runner/data-parser';
import { exportReportToHtml } from '../src/main/runner/report-exporter';
import { DatabaseManager } from '../src/main/database/database-manager';
import { HttpClientEngine } from '../src/main/network/http-client';
import { ScriptSandbox } from '../src/main/scripting/sandbox';
import { VariableResolver } from '../src/main/variables/resolver';

describe('CollectionRunner Engine & Automation (Phase 5)', () => {
  let db: DatabaseManager;
  let runner: CollectionRunner;
  let workspaceId: string;
  let collectionId: string;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.init();

    const ws = db.createWorkspace({ name: 'Runner Workspace' });
    workspaceId = ws.id;

    const col = db.createCollection({ workspaceId, name: 'Users Test Suite' });
    collectionId = col.id;

    const httpClient = new HttpClientEngine();
    const scriptSandbox = new ScriptSandbox();
    const variableResolver = new VariableResolver();

    runner = new CollectionRunner({
      dbManager: db,
      httpClient,
      scriptSandbox,
      variableResolver
    });
  });

  afterEach(() => {
    db.close();
  });

  it('should parse CSV and JSON iteration data files accurately', () => {
    const csvContent = `userId,role,expectedCode\n1,admin,200\n2,editor,200\n3,viewer,403`;
    const parsedCsv = parseDataFile(csvContent, 'csv');

    expect(parsedCsv.length).toBe(3);
    expect(parsedCsv[0]).toEqual({ userId: '1', role: 'admin', expectedCode: '200' });
    expect(parsedCsv[2].role).toBe('viewer');

    const jsonContent = JSON.stringify([
      { id: 101, username: 'alice' },
      { id: 102, username: 'bob' }
    ]);
    const parsedJson = parseDataFile(jsonContent, 'json');

    expect(parsedJson.length).toBe(2);
    expect(parsedJson[0].username).toBe('alice');
    expect(parsedJson[1].id).toBe(102);
  });

  it('should execute collection requests sequentially and report per-assertion results', async () => {
    // Seed 2 requests in the collection
    db.createRequest({
      collectionId,
      name: 'Get Todo 1',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      testScript: `
        pm.test('Status is 200', () => {
          pm.response.to.have.status(200);
        });
        pm.test('Todo has id 1', () => {
          const body = pm.response.json();
          pm.expect(body.id).to.equal(1);
        });
      `
    });

    db.createRequest({
      collectionId,
      name: 'Get Todo 2',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/2',
      testScript: `
        pm.test('Status is 200', () => {
          pm.response.to.have.status(200);
        });
      `
    });

    const report = await runner.run({
      collectionId,
      iterations: 1,
      delayMs: 10
    });

    expect(report.status).toBe('completed');
    expect(report.totalRequests).toBe(2);
    expect(report.results.length).toBe(2);
    expect(report.totalPassed).toBeGreaterThanOrEqual(3);
    expect(report.totalFailed).toBe(0);
    expect(report.results[0].tests.length).toBe(2);
    expect(report.results[1].tests.length).toBe(1);
  });

  it('should support data-driven iterations using pm.iterationData', async () => {
    db.createRequest({
      collectionId,
      name: 'Parametrized User Check',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/{{todoId}}',
      testScript: `
        pm.test('Todo ID matches iteration data', () => {
          const body = pm.response.json();
          const expectedId = parseInt(pm.iterationData.get('todoId'));
          pm.expect(body.id).to.equal(expectedId);
        });
      `
    });

    const iterationData = [
      { todoId: '1' },
      { todoId: '2' }
    ];

    const report = await runner.run({
      collectionId,
      iterations: 2,
      iterationData
    });

    expect(report.status).toBe('completed');
    expect(report.results.length).toBe(2);
    expect(report.results[0].iteration).toBe(1);
    expect(report.results[1].iteration).toBe(2);
    expect(report.totalPassed).toBe(2);
    expect(report.totalFailed).toBe(0);
  });

  it('should support dynamic request chaining via postman.setNextRequest', async () => {
    const req1 = db.createRequest({
      collectionId,
      name: 'Step 1 - Login',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      testScript: `
        // Skip step 2 and jump directly to step 3
        postman.setNextRequest('Step 3 - Finalize');
      `
    });

    db.createRequest({
      collectionId,
      name: 'Step 2 - Should Be Skipped',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/2'
    });

    const req3 = db.createRequest({
      collectionId,
      name: 'Step 3 - Finalize',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/3',
      testScript: `
        // Finish execution
        postman.setNextRequest(null);
      `
    });

    const report = await runner.run({
      collectionId,
      iterations: 1
    });

    expect(report.status).toBe('completed');
    expect(report.results.length).toBe(2); // Step 1 and Step 3 only
    expect(report.results[0].requestId).toBe(req1.id);
    expect(report.results[1].requestId).toBe(req3.id);
  });

  it('should allow aborting collection run in-flight', async () => {
    db.createRequest({
      collectionId,
      name: 'Long Task 1',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/1'
    });

    db.createRequest({
      collectionId,
      name: 'Long Task 2',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/todos/2'
    });

    // Start execution and cancel immediately
    const runPromise = runner.run({
      collectionId,
      iterations: 10,
      delayMs: 100
    });

    setTimeout(() => {
      runner.cancel();
    }, 50);

    const report = await runPromise;
    expect(report.status).toBe('cancelled');
  });

  it('should generate standalone HTML test reports with summary and details', () => {
    const mockReport = {
      id: 'run-123',
      collectionId: 'col-1',
      collectionName: 'Authentication Tests',
      totalRequests: 2,
      totalPassed: 3,
      totalFailed: 1,
      totalTimeMs: 340,
      status: 'completed' as const,
      iterations: 1,
      results: [
        {
          requestId: 'r1',
          requestName: 'Login API',
          method: 'POST',
          url: 'https://example.com/login',
          status: 200,
          timeMs: 120,
          sizeBytes: 450,
          iteration: 1,
          tests: [{ name: 'Status 200', passed: true }],
          logs: []
        },
        {
          requestId: 'r2',
          requestName: 'Get Profile',
          method: 'GET',
          url: 'https://example.com/profile',
          status: 401,
          timeMs: 90,
          sizeBytes: 120,
          iteration: 1,
          tests: [
            { name: 'Profile status', passed: false, error: 'Expected 200 but received 401' }
          ],
          logs: []
        }
      ],
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    const html = exportReportToHtml(mockReport);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Authentication Tests');
    expect(html).toContain('Login API');
    expect(html).toContain('Expected 200 but received 401');
    expect(html).toContain('75% Passing');
  });
});
