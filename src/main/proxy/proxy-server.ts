import * as http from 'node:http';
import * as net from 'node:net';
import * as url from 'node:url';
import { randomUUID } from 'node:crypto';
import type { RequestItem, KeyValuePair } from '../../shared/types';

export interface CapturedTrafficItem {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  protocol: 'http:' | 'https:';
  headers: Record<string, string | string[] | undefined>;
  requestBody: string;
  statusCode: number;
  statusText: string;
  responseHeaders: Record<string, string | string[] | undefined>;
  responseBody: string;
  timeMs: number;
}

export class InterceptingProxyServer {
  private server: http.Server | null = null;
  private captured: CapturedTrafficItem[] = [];
  private onTrafficCaptured?: (item: CapturedTrafficItem) => void;
  private listeningPort: number = 0;

  constructor(onTrafficCaptured?: (item: CapturedTrafficItem) => void) {
    this.onTrafficCaptured = onTrafficCaptured;
  }

  public isRunning(): boolean {
    return this.server !== null && this.server.listening;
  }

  public getPort(): number {
    return this.listeningPort;
  }

  public getCapturedTraffic(): CapturedTrafficItem[] {
    return [...this.captured];
  }

  public clearTraffic(): void {
    this.captured = [];
  }

  public async start(port: number = 8080): Promise<number> {
    if (this.isRunning()) {
      return this.listeningPort;
    }

    this.server = http.createServer((clientReq, clientRes) => {
      this.handleHttpRequest(clientReq, clientRes);
    });

    // Handle HTTPS CONNECT Tunneling
    this.server.on('connect', (req, clientSocket, head) => {
      this.handleHttpsConnect(req, clientSocket, head);
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(port, '127.0.0.1', () => {
        const addr = this.server!.address() as any;
        this.listeningPort = addr.port;
        resolve(this.listeningPort);
      });

      this.server!.on('error', (err) => {
        reject(err);
      });
    });
  }

  public async stop(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve) => {
      this.server!.closeAllConnections?.();
      this.server!.close(() => {
        this.server = null;
        this.listeningPort = 0;
        resolve();
      });
    });
  }

  private handleHttpRequest(clientReq: http.IncomingMessage, clientRes: http.ServerResponse): void {
    const startTime = Date.now();
    const reqChunks: Buffer[] = [];

    clientReq.on('data', (chunk) => reqChunks.push(chunk));

    clientReq.on('end', () => {
      const requestBody = Buffer.concat(reqChunks).toString('utf-8');

      // Parse destination target
      let targetUrlStr = clientReq.url || '';
      if (!targetUrlStr.startsWith('http://') && !targetUrlStr.startsWith('https://')) {
        const hostHeader = clientReq.headers['host'] || 'localhost';
        targetUrlStr = `http://${hostHeader}${targetUrlStr}`;
      }

      let parsedUrl: url.UrlWithStringQuery;
      try {
        parsedUrl = url.parse(targetUrlStr);
      } catch {
        clientRes.writeHead(400, { 'Content-Type': 'text/plain' });
        clientRes.end('DevPilot Proxy: Bad URL format');
        return;
      }

      const forwardHeaders = { ...clientReq.headers };
      // Remove proxy headers if present
      delete forwardHeaders['proxy-connection'];

      const options: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.path,
        method: clientReq.method,
        headers: forwardHeaders,
        agent: false
      };

      const proxyReq = http.request(options, (targetRes) => {
        const resChunks: Buffer[] = [];

        targetRes.on('data', (c) => resChunks.push(c));

        targetRes.on('end', () => {
          const responseBody = Buffer.concat(resChunks).toString('utf-8');
          const duration = Date.now() - startTime;

          // Send response back to original client
          clientRes.writeHead(targetRes.statusCode || 200, targetRes.headers);
          clientRes.end(Buffer.concat(resChunks));

          // Capture traffic item
          const item: CapturedTrafficItem = {
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            method: (clientReq.method || 'GET').toUpperCase(),
            url: targetUrlStr,
            protocol: 'http:',
            headers: clientReq.headers as Record<string, string | string[]>,
            requestBody,
            statusCode: targetRes.statusCode || 200,
            statusText: targetRes.statusMessage || 'OK',
            responseHeaders: targetRes.headers as Record<string, string | string[]>,
            responseBody,
            timeMs: duration
          };

          this.captured.unshift(item);
          if (this.onTrafficCaptured) {
            this.onTrafficCaptured(item);
          }
        });
      });

      proxyReq.on('error', (err) => {
        clientRes.writeHead(502, { 'Content-Type': 'text/plain' });
        clientRes.end(`DevPilot Proxy Gateway Error: ${err.message}`);
      });

      if (reqChunks.length > 0) {
        proxyReq.write(Buffer.concat(reqChunks));
      }
      proxyReq.end();
    });
  }

  private handleHttpsConnect(req: http.IncomingMessage, clientSocket: any, head: Buffer): void {
    const startTime = Date.now();
    const parts = (req.url || '').split(':');
    const targetHost = parts[0];
    const targetPort = parseInt(parts[1], 10) || 443;

    const serverSocket = net.connect(targetPort, targetHost, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\nProxy-agent: DevPilot-Studio-Proxy\r\n\r\n');
      if (head.length > 0) {
        serverSocket.write(head);
      }
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);

      // Log CONNECT Tunnel
      const item: CapturedTrafficItem = {
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        method: 'CONNECT',
        url: `https://${targetHost}:${targetPort}`,
        protocol: 'https:',
        headers: req.headers as Record<string, string | string[]>,
        requestBody: '',
        statusCode: 200,
        statusText: 'Tunnel Established',
        responseHeaders: {},
        responseBody: '',
        timeMs: Date.now() - startTime
      };

      this.captured.unshift(item);
      if (this.onTrafficCaptured) {
        this.onTrafficCaptured(item);
      }
    });

    serverSocket.on('error', () => {
      clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      clientSocket.end();
    });

    clientSocket.on('error', () => {
      serverSocket.end();
    });
  }

  public convertToRequestItem(
    trafficId: string,
    collectionId: string,
    customName?: string
  ): RequestItem | null {
    const item = this.captured.find((c) => c.id === trafficId);
    if (!item) return null;

    const headersList: KeyValuePair[] = Object.entries(item.headers).map(([key, val]) => ({
      id: randomUUID(),
      key,
      value: Array.isArray(val) ? val.join(', ') : String(val || ''),
      enabled: true
    }));

    // Detect body format
    let bodyJson = JSON.stringify({ type: 'none' });
    if (item.requestBody && item.requestBody.trim().length > 0) {
      try {
        JSON.parse(item.requestBody);
        bodyJson = JSON.stringify({
          type: 'json',
          rawContent: item.requestBody
        });
      } catch {
        bodyJson = JSON.stringify({
          type: 'text',
          rawContent: item.requestBody
        });
      }
    }

    // Default request name from URL path
    let defaultName = customName;
    if (!defaultName) {
      try {
        const u = new URL(item.url);
        defaultName = `${item.method} ${u.pathname}`;
      } catch {
        defaultName = `${item.method} ${item.url}`;
      }
    }

    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      collectionId,
      name: defaultName,
      method: (item.method as any) || 'GET',
      url: item.url,
      headers: JSON.stringify(headersList),
      params: JSON.stringify([]),
      body: bodyJson,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now
    };
  }
}
