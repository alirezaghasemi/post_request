import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { DigestAuthHandler } from '../auth/digest';
import type {
  HttpRequestExecutionPayload,
  HttpResponseData,
  HttpResponseCookie
} from '../../shared/types';

export class HttpClientEngine {
  private activeControllers = new Map<string, { abort: (reason?: string) => void }>();
  private defaultTimeoutMs = 30000;
  private maxResponseSizeBytes = 10 * 1024 * 1024; // 10MB limit for in-memory response

  public cancel(requestId: string): boolean {
    const controller = this.activeControllers.get(requestId);
    if (controller) {
      controller.abort('Request was cancelled by user');
      this.activeControllers.delete(requestId);
      return true;
    }
    return false;
  }

  public async execute(payload: HttpRequestExecutionPayload): Promise<HttpResponseData> {
    const startTime = performance.now();
    const timeoutMs = payload.timeoutMs || this.defaultTimeoutMs;

    // 1. Prepare Target URL & Query Parameters
    let targetUrl: URL;
    try {
      targetUrl = new URL(payload.url);
    } catch {
      throw new Error(`Invalid URL: "${payload.url}"`);
    }

    if (payload.params && Array.isArray(payload.params)) {
      for (const param of payload.params) {
        if (param.enabled && param.key.trim().length > 0) {
          targetUrl.searchParams.append(param.key, param.value);
        }
      }
    }

    // 2. Prepare Headers
    const headers: Record<string, string> = {};
    if (payload.headers && Array.isArray(payload.headers)) {
      for (const h of payload.headers) {
        if (h.enabled && h.key.trim().length > 0) {
          headers[h.key] = h.value;
        }
      }
    }

    // 3. Prepare Authentication
    if (payload.auth) {
      if (payload.auth.type === 'bearer' && payload.auth.bearerToken) {
        headers['Authorization'] = `Bearer ${payload.auth.bearerToken}`;
      } else if (payload.auth.type === 'basic') {
        const credentials = `${payload.auth.basicUsername || ''}:${payload.auth.basicPassword || ''}`;
        headers['Authorization'] = `Basic ${Buffer.from(credentials).toString('base64')}`;
      } else if (payload.auth.type === 'apikey' && payload.auth.apiKeyName && payload.auth.apiKeyValue) {
        if (payload.auth.apiKeyAddTo === 'query') {
          targetUrl.searchParams.append(payload.auth.apiKeyName, payload.auth.apiKeyValue);
        } else {
          headers[payload.auth.apiKeyName] = payload.auth.apiKeyValue;
        }
      } else if (payload.auth.type === 'oauth2' && payload.auth.oauth2?.accessToken) {
        if (payload.auth.oauth2.addTokenTo === 'query') {
          targetUrl.searchParams.append('access_token', payload.auth.oauth2.accessToken);
        } else {
          headers['Authorization'] = `${payload.auth.oauth2.tokenType || 'Bearer'} ${payload.auth.oauth2.accessToken}`;
        }
      } else if (payload.auth.type === 'digest' && payload.auth.digest?.username && payload.auth.digest?.password) {
        const digestHandler = new DigestAuthHandler();
        const digestHeader = digestHandler.generateDigestHeader({
          username: payload.auth.digest.username,
          password: payload.auth.digest.password,
          method: (payload.method || 'GET').toUpperCase(),
          uri: `${targetUrl.pathname}${targetUrl.search}`,
          challengeHeader: payload.auth.digest.nonce
            ? `Digest realm="${payload.auth.digest.realm || ''}", nonce="${payload.auth.digest.nonce}", qop="${payload.auth.digest.qop || 'auth'}", algorithm="${payload.auth.digest.algorithm || 'MD5'}"`
            : ''
        });
        headers['Authorization'] = digestHeader;
      }
    }

    // 4. Prepare Body
    let bodyBuffer: Buffer | null = null;
    const method = (payload.method || 'GET').toUpperCase();

    if (payload.body) {
      if (payload.body.type === 'json' && payload.body.rawContent) {
        bodyBuffer = Buffer.from(payload.body.rawContent, 'utf-8');
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else if (payload.body.type === 'urlencoded' && payload.body.urlencodedData) {
        const formParams = new URLSearchParams();
        for (const item of payload.body.urlencodedData) {
          if (item.enabled && item.key.trim().length > 0) {
            formParams.append(item.key, item.value);
          }
        }
        bodyBuffer = Buffer.from(formParams.toString(), 'utf-8');
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      } else if (payload.body.rawContent && payload.body.type !== 'none') {
        bodyBuffer = Buffer.from(payload.body.rawContent, 'utf-8');
      }
    }

    if (bodyBuffer && bodyBuffer.length > 0) {
      headers['Content-Length'] = String(bodyBuffer.length);
    }

    // 5. Send Request with Native Transport (HTTP/HTTPS)
    return new Promise<HttpResponseData>((resolve, reject) => {
      const isHttps = targetUrl.protocol === 'https:';
      const transport = isHttps ? https : http;

      const requestOptions: http.RequestOptions = {
        method,
        protocol: targetUrl.protocol,
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: `${targetUrl.pathname}${targetUrl.search}`,
        headers
      };

      let timer: NodeJS.Timeout | null = null;
      let isDone = false;

      const cleanup = () => {
        isDone = true;
        if (timer) clearTimeout(timer);
        this.activeControllers.delete(payload.requestId);
      };

      const req = transport.request(requestOptions, (res) => {
        const chunks: Buffer[] = [];
        let totalSize = 0;
        let isTruncated = false;

        res.on('data', (chunk: Buffer) => {
          totalSize += chunk.length;
          if (totalSize <= this.maxResponseSizeBytes) {
            chunks.push(chunk);
          } else {
            isTruncated = true;
          }
        });

        res.on('end', () => {
          if (isDone) return;
          cleanup();

          const timeMs = Math.round(performance.now() - startTime);
          const fullBuffer = Buffer.concat(chunks);
          const bodyText = fullBuffer.toString('utf-8');

          const responseHeaders: Record<string, string | string[]> = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (value !== undefined) {
              responseHeaders[key] = value;
            }
          }

          const rawCookies = res.headers['set-cookie'] || [];
          const cookies = this.parseCookies(Array.isArray(rawCookies) ? rawCookies : [rawCookies]);

          resolve({
            requestId: payload.requestId,
            status: res.statusCode || 200,
            statusText: res.statusMessage || 'OK',
            timeMs,
            sizeBytes: totalSize,
            headers: responseHeaders,
            cookies,
            body: bodyText,
            contentType: (res.headers['content-type'] as string) || 'text/plain',
            isTruncated
          });
        });
      });

      // Timeout handler
      timer = setTimeout(() => {
        if (isDone) return;
        cleanup();
        req.destroy(new Error(`Request timeout after ${timeoutMs}ms`));
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // Register cancellation controller
      this.activeControllers.set(payload.requestId, {
        abort: (reason) => {
          if (isDone) return;
          cleanup();
          req.destroy(new Error(reason || 'Request aborted'));
          reject(new Error(reason || 'Request aborted'));
        }
      });

      req.on('error', (err) => {
        if (isDone) return;
        cleanup();
        reject(err);
      });

      if (bodyBuffer) {
        req.write(bodyBuffer);
      }
      req.end();
    });
  }

  private parseCookies(cookieHeaders: string[]): HttpResponseCookie[] {
    const cookies: HttpResponseCookie[] = [];

    for (const header of cookieHeaders) {
      if (!header) continue;
      const parts = header.split(';').map((p) => p.trim());
      const [nameVal, ...attrs] = parts;
      const equalsIndex = nameVal.indexOf('=');

      if (equalsIndex !== -1) {
        const name = nameVal.slice(0, equalsIndex).trim();
        const value = nameVal.slice(equalsIndex + 1).trim();

        const cookie: HttpResponseCookie = { name, value };

        for (const attr of attrs) {
          const lower = attr.toLowerCase();
          if (lower.startsWith('domain=')) cookie.domain = attr.slice(7);
          else if (lower.startsWith('path=')) cookie.path = attr.slice(5);
          else if (lower.startsWith('expires=')) cookie.expires = attr.slice(8);
          else if (lower === 'httponly') cookie.httpOnly = true;
          else if (lower === 'secure') cookie.secure = true;
        }

        cookies.push(cookie);
      }
    }

    return cookies;
  }
}
