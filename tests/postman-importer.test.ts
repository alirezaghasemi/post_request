import { describe, it, expect } from 'vitest';
import { PostmanImporter } from '../src/main/importers/postman-importer';
import { PostmanExporter } from '../src/main/exporters/postman-exporter';

describe('Postman Importer & Exporter', () => {
  const importer = new PostmanImporter();
  const exporter = new PostmanExporter();

  const samplePostmanCollection = {
    info: {
      _postman_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      name: 'Sample Users API',
      description: 'API for user tests',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [
      {
        name: 'Get User List',
        request: {
          method: 'GET',
          header: [
            { key: 'Accept', value: 'application/json' }
          ],
          url: {
            raw: 'https://{{baseUrl}}/users?page=1',
            host: ['https:', '', '{{baseUrl}}'],
            path: ['users'],
            query: [
              { key: 'page', value: '1' }
            ]
          }
        }
      },
      {
        name: 'Users Folder',
        item: [
          {
            name: 'Create User',
            request: {
              method: 'POST',
              header: [
                { key: 'Content-Type', value: 'application/json' }
              ],
              body: {
                mode: 'raw',
                raw: '{"name": "Alice"}'
              },
              url: {
                raw: 'https://{{baseUrl}}/users'
              }
            }
          }
        ]
      }
    ],
    variable: [
      { key: 'baseUrl', value: 'api.example.com', type: 'string' }
    ]
  };

  const samplePostmanEnvironment = {
    id: 'env-12345',
    name: 'Production Environment',
    values: [
      { key: 'baseUrl', value: 'prod.example.com', enabled: true, type: 'default' },
      { key: 'apiKey', value: 'secret-xyz', enabled: true, type: 'secret' }
    ]
  };

  it('should import a Postman v2.1 collection and preserve tree hierarchy', () => {
    const report = importer.importCollection(samplePostmanCollection, 'ws-test-1');

    expect(report.success).toBe(true);
    expect(report.collection.name).toBe('Sample Users API');
    expect(report.requests.length).toBe(2);
    expect(report.folders.length).toBe(1);
    expect(report.folders[0].name).toBe('Users Folder');

    const getReq = report.requests.find((r) => r.name === 'Get User List');
    expect(getReq).toBeDefined();
    expect(getReq?.method).toBe('GET');
    expect(getReq?.url).toBe('https://{{baseUrl}}/users?page=1');

    const postReq = report.requests.find((r) => r.name === 'Create User');
    expect(postReq).toBeDefined();
    expect(postReq?.folderId).toBe(report.folders[0].id);
    expect(postReq?.method).toBe('POST');
  });

  it('should import Postman environment format', () => {
    const environment = importer.importEnvironment(samplePostmanEnvironment, 'ws-test-1');

    expect(environment.name).toBe('Production Environment');
    expect(environment.variables.length).toBe(2);
    expect(environment.variables[0].key).toBe('baseUrl');
    expect(environment.variables[1].type).toBe('secret');
  });

  it('should export collection back into Postman v2.1.0 compatible schema', () => {
    const imported = importer.importCollection(samplePostmanCollection, 'ws-test-1');

    const exported = exporter.exportCollection(imported.collection, imported.folders, imported.requests);

    expect(exported.info.name).toBe('Sample Users API');
    expect(exported.info.schema).toContain('v2.1.0');
    expect(exported.item.length).toBeGreaterThan(0);
  });
});
