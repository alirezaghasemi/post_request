import http from 'node:http';
import { EventEmitter } from 'node:events';

export interface MockRoute {
  id: string;
  method: string;
  path: string; // e.g. /api/users or /api/users/:id
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
  delayMs?: number;
}

export interface MockRequestLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  matchedRouteId?: string;
  statusCode: number;
  durationMs: number;
}

export class LocalMockServer extends EventEmitter {
  private server: http.Server | null = null;
  private port: number = 0;
  private routes: MockRoute[] = [];
  private logs: MockRequestLog[] = [];

  constructor() {
    super();
  }

  public registerRoutes(routes: MockRoute[]): void {
    this.routes = [...routes];
  }

  public addRoute(route: MockRoute): void {
    this.routes.push(route);
  }

  public clearRoutes(): void {
    this.routes = [];
  }

  public getRoutes(): MockRoute[] {
    return [...this.routes];
  }

  public getLogs(): MockRequestLog[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public isRunning(): boolean {
    return this.server !== null && this.server.listening;
  }

  public getPort(): number {
    return this.port;
  }

  public async start(port = 3001): Promise<void> {
    if (this.isRunning()) {
      if (this.port === port) return;
      await this.stop();
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));

      this.server.on('error', (err) => {
        this.emit('error', err);
        reject(err);
      });

      this.server.listen(port, '0.0.0.0', () => {
        this.port = port;
        this.emit('started', port);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve, reject) => {
      this.server?.close((err) => {
        this.server = null;
        this.port = 0;
        this.emit('stopped');
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const startTime = Date.now();
    const reqMethod = (req.method || 'GET').toUpperCase();
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;

    // Standard CORS headers for developer convenience
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');

    // Handle preflight OPTIONS
    if (reqMethod === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Match route
    const matched = this.matchRoute(reqMethod, pathname);

    if (!matched) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      const errBody = JSON.stringify({
        error: 'Not Found',
        message: `No mock route found for ${reqMethod} ${pathname}`,
        availableRoutes: this.routes.map((r) => `${r.method} ${r.path}`)
      });
      res.end(errBody);

      this.recordLog(reqMethod, pathname, undefined, 404, Date.now() - startTime);
      return;
    }

    // Artificial delay if configured
    if (matched.delayMs && matched.delayMs > 0) {
      await new Promise((r) => setTimeout(r, matched.delayMs));
    }

    // Apply headers
    if (matched.headers) {
      for (const [key, val] of Object.entries(matched.headers)) {
        res.setHeader(key, val);
      }
    }

    if (!res.hasHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json');
    }

    res.statusCode = matched.statusCode || 200;
    const bodyResponse = matched.body !== undefined ? matched.body : '';
    res.end(bodyResponse);

    this.recordLog(reqMethod, pathname, matched.id, res.statusCode, Date.now() - startTime);
  }

  private matchRoute(reqMethod: string, pathname: string): MockRoute | null {
    for (const route of this.routes) {
      if (route.method.toUpperCase() !== reqMethod && route.method !== '*') continue;

      if (this.pathMatches(route.path, pathname)) {
        return route;
      }
    }
    return null;
  }

  private pathMatches(routePattern: string, actualPath: string): boolean {
    if (routePattern === actualPath || routePattern === '*') return true;

    // Convert :param to regex pattern
    const patternRegex = new RegExp(
      '^' +
        routePattern
          .replace(/\/$/, '')
          .replace(/:[a-zA-Z0-9_]+/g, '([^/]+)') +
        '/?$'
    );

    return patternRegex.test(actualPath.replace(/\/$/, ''));
  }

  private recordLog(
    method: string,
    path: string,
    matchedRouteId: string | undefined,
    statusCode: number,
    durationMs: number
  ): void {
    const log: MockRequestLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      method,
      path,
      matchedRouteId,
      statusCode,
      durationMs
    };

    this.logs.unshift(log);
    if (this.logs.length > 100) {
      this.logs.pop();
    }

    this.emit('request', log);
  }
}
