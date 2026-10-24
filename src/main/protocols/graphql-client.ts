import http from 'node:http';
import https from 'node:https';

export interface GraphQLRequestOptions {
  url: string;
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export interface GraphQLResponse {
  data?: any;
  errors?: Array<{ message: string; locations?: any[]; path?: string[] }>;
  status: number;
}

export async function executeGraphQL(options: GraphQLRequestOptions): Promise<GraphQLResponse> {
  const urlObj = new URL(options.url);
  const isHttps = urlObj.protocol === 'https:';
  const transport = isHttps ? https : http;

  const payload = JSON.stringify({
    query: options.query,
    variables: options.variables || {},
    operationName: options.operationName || undefined
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, multipart/mixed',
    'Connection': 'close',
    'Content-Length': Buffer.byteLength(payload).toString(),
    ...(options.headers || {})
  };

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port ? parseInt(urlObj.port, 10) : isHttps ? 443 : 80,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers,
        agent: false,
        timeout: options.timeoutMs || 30000
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseBody);
            resolve({
              data: parsed.data,
              errors: parsed.errors,
              status: res.statusCode || 200
            });
          } catch {
            resolve({
              data: null,
              errors: [{ message: responseBody || 'Invalid JSON response from GraphQL server' }],
              status: res.statusCode || 500
            });
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`GraphQL request timed out after ${options.timeoutMs || 30000}ms`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

export function buildIntrospectionQuery(): string {
  return `
    query IntrospectionQuery {
      __schema {
        queryType { name }
        mutationType { name }
        subscriptionType { name }
        types {
          kind
          name
          description
          fields(includeDeprecated: true) {
            name
            description
            args {
              name
              description
              type {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
              defaultValue
            }
            type {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  `;
}
