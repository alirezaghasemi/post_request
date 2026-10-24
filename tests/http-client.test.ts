import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { HttpClientEngine } from '../src/main/network/http-client';
import type { HttpRequestExecutionPayload } from '../src/shared/types';

describe('HttpClientEngine (Real Network Execution)', () => {
  let server: http.Server;
  let serverUrl: string;
  let client: HttpClientEngine;

  beforeAll(async () => {
    client = new HttpClientEngine();

    // Setup local test HTTP server
    server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      if (url.pathname === '/delay') {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ delayed: true }));
        }, 800);
        return;
      }

      if (url.pathname === '/echo') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'X-Custom-Echo': req.headers['x-custom-test'] || '',
            'Set-Cookie': 'sessionId=devpilot-xyz; Path=/; HttpOnly'
          });
          res.end(
            JSON.stringify({
              method: req.method,
              query: Object.fromEntries(url.searchParams.entries()),
              headers: req.headers,
              body: body
            })
          );
        });
        return;
      }

      if (url.pathname === '/status/404') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Resource Not Found');
        return;
      }

      // Default 200 OK
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'DevPilot Server Ready' }));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        serverUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should execute a GET request with query params and custom headers', async () => {
    const payload: HttpRequestExecutionPayload = {
      requestId: 'req-get-1',
      method: 'GET',
      url: `${serverUrl}/echo`,
      params: [{ id: 'p1', key: 'filter', value: 'active', enabled: true }],
      headers: [{ id: 'h1', key: 'X-Custom-Test', value: 'DevPilot-Header', enabled: true }],
      body: { type: 'none' },
      auth: { type: 'none' }
    };

    const response = await client.execute(payload);

    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(response.timeMs).toBeGreaterThan(0);
    expect(response.sizeBytes).toBeGreaterThan(0);
    expect(response.cookies.length).toBeGreaterThan(0);
    expect(response.cookies[0].name).toBe('sessionId');

    const parsedBody = JSON.parse(response.body);
    expect(parsedBody.method).toBe('GET');
    expect(parsedBody.query.filter).toBe('active');
    expect(parsedBody.headers['x-custom-test']).toBe('DevPilot-Header');
  });

  it('should execute a POST request with JSON body', async () => {
    const payload: HttpRequestExecutionPayload = {
      requestId: 'req-post-1',
      method: 'POST',
      url: `${serverUrl}/echo`,
      params: [],
      headers: [],
      body: {
        type: 'json',
        rawContent: JSON.stringify({ name: 'DevPilot API', active: true })
      },
      auth: { type: 'none' }
    };

    const response = await client.execute(payload);

    expect(response.status).toBe(200);
    const parsed = JSON.parse(response.body);
    expect(parsed.method).toBe('POST');
    const receivedBody = JSON.parse(parsed.body);
    expect(receivedBody.name).toBe('DevPilot API');
  });

  it('should execute a request with Bearer Token auth', async () => {
    const payload: HttpRequestExecutionPayload = {
      requestId: 'req-auth-bearer',
      method: 'GET',
      url: `${serverUrl}/echo`,
      params: [],
      headers: [],
      body: { type: 'none' },
      auth: {
        type: 'bearer',
        bearerToken: 'secret-token-xyz'
      }
    };

    const response = await client.execute(payload);
    const parsed = JSON.parse(response.body);
    expect(parsed.headers.authorization).toBe('Bearer secret-token-xyz');
  });

  it('should execute a request with Basic Auth', async () => {
    const payload: HttpRequestExecutionPayload = {
      requestId: 'req-auth-basic',
      method: 'GET',
      url: `${serverUrl}/echo`,
      params: [],
      headers: [],
      body: { type: 'none' },
      auth: {
        type: 'basic',
        basicUsername: 'admin',
        basicPassword: 'password123'
      }
    };

    const response = await client.execute(payload);
    const parsed = JSON.parse(response.body);
    const expectedAuth = `Basic ${Buffer.from('admin:password123').toString('base64')}`;
    expect(parsed.headers.authorization).toBe(expectedAuth);
  });

  it('should handle HTTP error status correctly (e.g. 404)', async () => {
    const payload: HttpRequestExecutionPayload = {
      requestId: 'req-404',
      method: 'GET',
      url: `${serverUrl}/status/404`,
      params: [],
      headers: [],
      body: { type: 'none' },
      auth: { type: 'none' }
    };

    const response = await client.execute(payload);
    expect(response.status).toBe(404);
    expect(response.body).toBe('Resource Not Found');
  });

  it('should cancel an in-flight request when cancel() is invoked', async () => {
    const payload: HttpRequestExecutionPayload = {
      requestId: 'req-cancel-1',
      method: 'GET',
      url: `${serverUrl}/delay`,
      params: [],
      headers: [],
      body: { type: 'none' },
      auth: { type: 'none' }
    };

    const executePromise = client.execute(payload);

    // Cancel after 100ms while server delays 800ms
    setTimeout(() => {
      client.cancel('req-cancel-1');
    }, 100);

    await expect(executePromise).rejects.toThrow(/cancelled|aborted/i);
  });

  it('should timeout when request exceeds timeoutMs', async () => {
    const payload: HttpRequestExecutionPayload = {
      requestId: 'req-timeout-1',
      method: 'GET',
      url: `${serverUrl}/delay`,
      params: [],
      headers: [],
      body: { type: 'none' },
      auth: { type: 'none' },
      timeoutMs: 200 // server delays 800ms
    };

    await expect(client.execute(payload)).rejects.toThrow(/timeout/i);
  });
});
