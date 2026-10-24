import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'node:http';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { InterceptingProxyServer } from '../src/main/proxy/proxy-server';
import { VersioningEngine } from '../src/main/git/versioning-engine';
import { AiAssistant } from '../src/main/ai/ai-assistant';
import type { RequestItem } from '../src/shared/types';

describe('Phase 9: Advanced Features (Proxy, Git Diff, AI Assistant)', () => {
  let backendServer: http.Server;
  let backendPort: number = 0;
  let testDir: string;

  beforeAll(async () => {
    testDir = path.join(__dirname, 'tmp-phase9-test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    backendServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Connection', 'close');
        if (req.url === '/api/orders' && req.method === 'POST') {
          res.writeHead(201);
          res.end(JSON.stringify({ orderId: 'ord-999', received: body ? JSON.parse(body) : null }));
        } else {
          res.writeHead(200);
          res.end(JSON.stringify({ message: 'Backend Response OK', url: req.url }));
        }
      });
    });

    await new Promise<void>((resolve) => {
      backendServer.listen(0, '127.0.0.1', () => {
        const addr = backendServer.address() as any;
        backendPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (backendServer) {
      backendServer.closeAllConnections?.();
      await new Promise<void>((resolve) => backendServer.close(() => resolve()));
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('1. Local Intercepting Forward Proxy', () => {
    it('should start proxy, intercept forwarded HTTP request and response, and capture traffic', async () => {
      const proxy = new InterceptingProxyServer();
      const proxyPort = await proxy.start(0);
      expect(proxyPort).toBeGreaterThan(0);
      expect(proxy.isRunning()).toBe(true);

      const targetUrl = `http://127.0.0.1:${backendPort}/api/orders`;
      const postData = JSON.stringify({ item: 'Widget', qty: 2 });

      // Send request through the forward proxy
      const responseData = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = http.request(
          targetUrl,
          {
            host: '127.0.0.1',
            port: proxyPort,
            path: targetUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'Connection': 'close'
            }
          },
          (res) => {
            let resBody = '';
            res.on('data', (c) => { resBody += c; });
            res.on('end', () => {
              resolve({ status: res.statusCode || 0, body: resBody });
            });
          }
        );

        req.on('error', reject);
        req.write(postData);
        req.end();
      });

      expect(responseData.status).toBe(201);
      const parsedRes = JSON.parse(responseData.body);
      expect(parsedRes.orderId).toBe('ord-999');

      // Check proxy traffic capture
      const captured = proxy.getCapturedTraffic();
      expect(captured.length).toBeGreaterThanOrEqual(1);

      const last = captured[captured.length - 1];
      expect(last.method).toBe('POST');
      expect(last.url).toBe(targetUrl);
      expect(last.statusCode).toBe(201);
      expect(last.requestBody).toContain('Widget');
      expect(last.responseBody).toContain('ord-999');

      // Convert captured item to RequestItem
      const convertedRequest = proxy.convertToRequestItem(last.id, 'col-test-123');
      expect(convertedRequest).toBeDefined();
      expect(convertedRequest?.method).toBe('POST');
      expect(convertedRequest?.url).toBe(targetUrl);
      expect(convertedRequest?.collectionId).toBe('col-test-123');

      await proxy.stop();
      expect(proxy.isRunning()).toBe(false);
    });
  });

  describe('2. Git Diff & Versioning Engine', () => {
    const versioning = new VersioningEngine();

    const baseRequest: RequestItem = {
      id: 'req-1',
      collectionId: 'col-1',
      name: 'Get User Profile',
      method: 'GET',
      url: 'https://api.example.com/v1/users/42',
      headers: JSON.stringify([{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }]),
      params: JSON.stringify([]),
      body: JSON.stringify({ type: 'none' }),
      preScript: 'console.log("old pre");',
      testScript: 'pm.test("Status 200", () => pm.expect(pm.response.code).to.eql(200));',
      sortOrder: 0,
      createdAt: '2026-10-24T10:00:00.000Z',
      updatedAt: '2026-10-24T10:00:00.000Z'
    };

    const modifiedRequest: RequestItem = {
      ...baseRequest,
      method: 'POST',
      url: 'https://api.example.com/v2/users/42',
      headers: JSON.stringify([
        { id: 'h1', key: 'Accept', value: 'application/json', enabled: true },
        { id: 'h2', key: 'Authorization', value: 'Bearer token123', enabled: true }
      ]),
      body: JSON.stringify({ type: 'json', rawContent: '{"role":"admin"}' }),
      testScript: 'pm.test("Status 201", () => pm.expect(pm.response.code).to.eql(201));'
    };

    it('should accurately detect field-by-field differences between two requests', () => {
      const diff = versioning.diffRequests(baseRequest, modifiedRequest);
      expect(diff.hasDifferences).toBe(true);

      const methodDiff = diff.fieldDiffs.find((f) => f.field === 'method');
      expect(methodDiff?.diffType).toBe('modified');
      expect(methodDiff?.before).toBe('GET');
      expect(methodDiff?.after).toBe('POST');

      const urlDiff = diff.fieldDiffs.find((f) => f.field === 'url');
      expect(urlDiff?.diffType).toBe('modified');
      expect(urlDiff?.before).toContain('v1');
      expect(urlDiff?.after).toContain('v2');

      const headersDiff = diff.fieldDiffs.find((f) => f.field === 'headers');
      expect(headersDiff?.hasChanges).toBe(true);

      const testScriptDiff = diff.fieldDiffs.find((f) => f.field === 'testScript');
      expect(testScriptDiff?.diffType).toBe('modified');
      expect(testScriptDiff?.before).toContain('200');
      expect(testScriptDiff?.after).toContain('201');
    });

    it('should export collection as clean Git repository structure', () => {
      const exportDir = path.join(testDir, 'git-repo');
      const exportResult = versioning.exportToGitDirectory(
        {
          collection: {
            id: 'col-1',
            workspaceId: 'ws-1',
            name: 'Production Payments API',
            description: 'Core payment endpoints',
            variables: JSON.stringify([{ key: 'baseUrl', value: 'https://api.payments.com' }]),
            createdAt: '2026-10-24T12:00:00.000Z',
            updatedAt: '2026-10-24T12:00:00.000Z'
          },
          requests: [baseRequest, modifiedRequest]
        },
        exportDir
      );

      expect(exportResult.success).toBe(true);
      expect(fs.existsSync(path.join(exportDir, 'collection.json'))).toBe(true);
      expect(fs.existsSync(path.join(exportDir, 'requests/req-1.json'))).toBe(true);
      expect(fs.existsSync(path.join(exportDir, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(exportDir, '.gitignore'))).toBe(true);
    });
  });

  describe('3. AI Assistant (Request Builder, Tests & Docs)', () => {
    const ai = new AiAssistant();

    it('should generate structured RequestItem from natural language prompt', async () => {
      const prompt = 'Create a POST request to https://api.stripe.com/v1/customers with email alice@example.com and name Alice Smith';
      const result = await ai.buildRequestFromPrompt(prompt);

      expect(result.method).toBe('POST');
      expect(result.url).toBe('https://api.stripe.com/v1/customers');
      expect(result.body).toBeDefined();

      const parsedBody = JSON.parse(result.body || '{}');
      expect(parsedBody.type).toBe('json');
      expect(parsedBody.rawContent).toContain('alice@example.com');
      expect(parsedBody.rawContent).toContain('Alice Smith');
    });

    it('should automatically generate Postman test assertions from response payload', () => {
      const responsePayload = {
        status: 200,
        statusText: 'OK',
        timeMs: 145,
        bodyText: JSON.stringify({
          userId: 'usr_456',
          email: 'test@example.com',
          isActive: true,
          roles: ['editor', 'admin']
        })
      };

      const testScript = ai.generateTestsFromResponse(responsePayload);
      expect(testScript).toContain('pm.test("Status code is 200"');
      expect(testScript).toContain('pm.expect(pm.response.code).to.eql(200)');
      expect(testScript).toContain('pm.test("Response time is acceptable"');
      expect(testScript).toContain('pm.test("Response has userId"');
      expect(testScript).toContain('pm.test("Response has email"');
      expect(testScript).toContain('pm.test("Response has isActive"');
    });

    it('should generate Markdown API documentation from request and response', () => {
      const request: RequestItem = {
        id: 'r1',
        collectionId: 'c1',
        name: 'Create Stripe Customer',
        method: 'POST',
        url: 'https://api.stripe.com/v1/customers',
        headers: JSON.stringify([{ id: 'h1', key: 'Content-Type', value: 'application/json', enabled: true }]),
        body: JSON.stringify({ type: 'json', rawContent: '{"email":"alice@example.com"}' }),
        sortOrder: 0,
        createdAt: '2026-10-24T12:00:00.000Z',
        updatedAt: '2026-10-24T12:00:00.000Z'
      };

      const docMarkdown = ai.generateDocumentation(request, {
        status: 200,
        bodyText: JSON.stringify({ id: 'cus_123', email: 'alice@example.com' })
      });

      expect(docMarkdown).toContain('# Create Stripe Customer');
      expect(docMarkdown).toContain('`POST`');
      expect(docMarkdown).toContain('https://api.stripe.com/v1/customers');
      expect(docMarkdown).toContain('### Request Body');
      expect(docMarkdown).toContain('### Example Response');
      expect(docMarkdown).toContain('cus_123');
    });
  });
});
