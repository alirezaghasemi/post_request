import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { parseOpenApiSpec } from '../src/main/importers/openapi-importer';
import { LocalMockServer } from '../src/main/mock/mock-server';
import { generateCodeSnippet } from '../src/shared/code-generator';
import { generateCollectionHtmlDocs } from '../src/main/docs/doc-generator';

describe('OpenAPI 3.x Importer, Local Mock Server & Docs Generator (Phase 6)', () => {
  describe('OpenAPI & Swagger Importer', () => {
    it('should parse OpenAPI 3.0 JSON spec into collection, folders, and request items', () => {
      const openApiJson = JSON.stringify({
        openapi: '3.0.0',
        info: {
          title: 'Petstore API',
          version: '1.0.0',
          description: 'A sample pet store service'
        },
        servers: [{ url: 'https://api.petstore.io/v1' }],
        paths: {
          '/pets': {
            get: {
              summary: 'List all pets',
              tags: ['Pets'],
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
                  required: false,
                  schema: { type: 'integer' }
                }
              ],
              responses: {
                '200': {
                  description: 'A paged array of pets',
                  content: {
                    'application/json': {
                      example: [{ id: 1, name: 'Fido' }]
                    }
                  }
                }
              }
            },
            post: {
              summary: 'Create a pet',
              tags: ['Pets'],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    example: { name: 'Mittens', tag: 'cat' }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'Null response'
                }
              }
            }
          },
          '/pets/{petId}': {
            get: {
              summary: 'Info for a specific pet',
              tags: ['Pets'],
              parameters: [
                {
                  name: 'petId',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' }
                }
              ]
            }
          }
        }
      });

      const result = parseOpenApiSpec(openApiJson);
      expect(result.collection.name).toBe('Petstore API');
      expect(result.collection.description).toBe('A sample pet store service');
      expect(result.variables).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'baseUrl', value: 'https://api.petstore.io/v1' })
        ])
      );

      // Check requests generated
      expect(result.requests.length).toBe(3);

      const listPets = result.requests.find((r) => r.method === 'GET' && r.url.endsWith('/pets'));
      expect(listPets).toBeDefined();
      expect(listPets?.name).toBe('List all pets');
      expect(listPets?.params).toContain('limit');

      const createPet = result.requests.find((r) => r.method === 'POST');
      expect(createPet).toBeDefined();
      expect(createPet?.body).toContain('Mittens');

      const getPetById = result.requests.find((r) => r.url.includes(':petId') || r.url.includes('{{petId}}'));
      expect(getPetById).toBeDefined();
      expect(getPetById?.name).toBe('Info for a specific pet');
    });

    it('should parse OpenAPI 3.x YAML spec into collection accurately', () => {
      const openApiYaml = `
openapi: 3.0.2
info:
  title: Users Service
  version: 2.1.0
  description: YAML user manager
servers:
  - url: http://localhost:8080/api
paths:
  /users:
    get:
      summary: Get all users
      tags:
        - Users
      responses:
        '200':
          description: Success
`;

      const result = parseOpenApiSpec(openApiYaml);
      expect(result.collection.name).toBe('Users Service');
      expect(result.requests.length).toBe(1);
      expect(result.requests[0].method).toBe('GET');
      expect(result.requests[0].url).toBe('{{baseUrl}}/users');
    });
  });

  describe('Local Mock Server', () => {
    let mockServer: LocalMockServer;
    const testPort = 4455;

    beforeEach(async () => {
      mockServer = new LocalMockServer();
    });

    afterEach(async () => {
      if (mockServer.isRunning()) {
        await mockServer.stop();
      }
    });

    it('should start, match configured routes with dynamic params, and return mock responses', async () => {
      mockServer.registerRoutes([
        {
          id: 'route-1',
          method: 'GET',
          path: '/api/v1/users/:id',
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'X-Custom-Mock': 'DevPilot' },
          body: JSON.stringify({ id: 42, username: 'devpilot_user', status: 'active' }),
          delayMs: 20
        },
        {
          id: 'route-2',
          method: 'POST',
          path: '/api/v1/orders',
          statusCode: 201,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: 'ord-999', created: true })
        }
      ]);

      await mockServer.start(testPort);
      expect(mockServer.isRunning()).toBe(true);
      expect(mockServer.getPort()).toBe(testPort);

      // Make request to mock server route 1
      const res1 = await makeRequest(`http://127.0.0.1:${testPort}/api/v1/users/42`);
      expect(res1.status).toBe(200);
      expect(res1.headers['x-custom-mock']).toBe('DevPilot');
      const data1 = JSON.parse(res1.body);
      expect(data1.username).toBe('devpilot_user');

      // Make request to mock server route 2
      const res2 = await makeRequest(`http://127.0.0.1:${testPort}/api/v1/orders`, 'POST');
      expect(res2.status).toBe(201);
      const data2 = JSON.parse(res2.body);
      expect(data2.orderId).toBe('ord-999');

      // Unmatched route should return 404
      const res404 = await makeRequest(`http://127.0.0.1:${testPort}/unknown/route`);
      expect(res404.status).toBe(404);

      // Stop server
      await mockServer.stop();
      expect(mockServer.isRunning()).toBe(false);
    });
  });

  describe('Code Snippet Generator', () => {
    it('should generate valid cURL, JavaScript, Python, Go, and Rust snippets', () => {
      const sampleReq = {
        method: 'POST',
        url: 'https://api.example.com/items?filter=active',
        headers: [{ id: '1', key: 'Authorization', value: 'Bearer token123', enabled: true }],
        params: [{ id: '2', key: 'filter', value: 'active', enabled: true }],
        body: {
          type: 'json' as const,
          rawContent: JSON.stringify({ name: 'Gadget', price: 99.9 })
        }
      };

      const curl = generateCodeSnippet(sampleReq, 'curl');
      expect(curl).toContain('curl -X POST');
      expect(curl).toContain('https://api.example.com/items?filter=active');
      expect(curl).toContain('-H "Authorization: Bearer token123"');
      expect(curl).toContain('-d \'{"name":"Gadget","price":99.9}\'');

      const js = generateCodeSnippet(sampleReq, 'javascript');
      expect(js).toContain('fetch("https://api.example.com/items?filter=active"');
      expect(js).toContain('"method": "POST"');
      expect(js).toContain('"Authorization": "Bearer token123"');

      const py = generateCodeSnippet(sampleReq, 'python');
      expect(py).toContain('import requests');
      expect(py).toContain('requests.post');

      const go = generateCodeSnippet(sampleReq, 'go');
      expect(go).toContain('http.NewRequest("POST"');

      const rust = generateCodeSnippet(sampleReq, 'rust');
      expect(rust).toContain('reqwest::Client::new()');
      expect(rust).toContain('.post(');
    });
  });

  describe('Documentation Generator', () => {
    it('should render interactive HTML documentation with endpoints and code snippets', () => {
      const collection = {
        id: 'col-doc',
        name: 'Documentation Test Collection',
        description: 'Testing HTML doc generation'
      };

      const requests = [
        {
          id: 'req-1',
          name: 'Get User Profile',
          method: 'GET',
          url: 'https://api.example.com/users/me',
          headers: JSON.stringify([{ key: 'Accept', value: 'application/json', enabled: true }]),
          description: 'Retrieves current logged in user profile'
        },
        {
          id: 'req-2',
          name: 'Update Preferences',
          method: 'PUT',
          url: 'https://api.example.com/users/preferences',
          body: JSON.stringify({ type: 'json', rawContent: '{"theme":"dark"}' })
        }
      ];

      const html = generateCollectionHtmlDocs(collection, requests as any);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Documentation Test Collection');
      expect(html).toContain('Testing HTML doc generation');
      expect(html).toContain('Get User Profile');
      expect(html).toContain('Update Preferences');
      expect(html).toContain('GET');
      expect(html).toContain('PUT');
      expect(html).toContain('curl -X GET');
    });
  });
});

// Helper for testing local HTTP requests
function makeRequest(
  urlStr: string,
  method = 'GET',
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body
          });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}
