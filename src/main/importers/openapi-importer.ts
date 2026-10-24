import { load as yamlLoad } from 'js-yaml';
import type { RequestItem, KeyValuePair, EnvironmentVariable } from '../../shared/types';

export interface OpenApiImportResult {
  collection: {
    id: string;
    name: string;
    description?: string;
  };
  variables: EnvironmentVariable[];
  folders: Array<{ id: string; name: string }>;
  requests: Array<Partial<RequestItem> & { name: string; method: string; url: string }>;
}

export function parseOpenApiSpec(content: string): OpenApiImportResult {
  let spec: any;

  // Try parsing JSON first, then YAML
  try {
    spec = JSON.parse(content);
  } catch {
    try {
      spec = yamlLoad(content);
    } catch (yamlErr: any) {
      throw new Error(`Invalid OpenAPI document: Failed to parse as JSON or YAML (${yamlErr.message})`);
    }
  }

  if (!spec || typeof spec !== 'object') {
    throw new Error('Invalid OpenAPI document: Root must be an object.');
  }

  const isSwagger2 = spec.swagger?.startsWith('2.');
  const isOpenApi3 = spec.openapi?.startsWith('3.');

  if (!isSwagger2 && !isOpenApi3) {
    throw new Error('Unsupported specification format. Must be OpenAPI 3.x or Swagger 2.0.');
  }

  const collectionId = `col-${Date.now()}`;
  const title = spec.info?.title || 'OpenAPI Import';
  const description = spec.info?.description || (spec.info?.version ? `Version: ${spec.info.version}` : '');

  // Extract Base URL
  let baseUrl = '';
  if (isOpenApi3 && Array.isArray(spec.servers) && spec.servers.length > 0) {
    baseUrl = spec.servers[0].url || '';
  } else if (isSwagger2) {
    const scheme = (spec.schemes && spec.schemes[0]) || 'https';
    const host = spec.host || 'localhost';
    const basePath = spec.basePath || '';
    baseUrl = `${scheme}://${host}${basePath}`.replace(/\/$/, '');
  }

  const variables: EnvironmentVariable[] = [];
  if (baseUrl) {
    variables.push({
      key: 'baseUrl',
      value: baseUrl,
      type: 'default',
      enabled: true,
      description: 'Default base URL from OpenAPI specification'
    });
  }

  const foldersMap = new Map<string, string>(); // Tag name -> folderId
  const folders: Array<{ id: string; name: string }> = [];

  const requests: Array<Partial<RequestItem> & { name: string; method: string; url: string }> = [];

  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  const paths = spec.paths || {};

  for (const [rawPath, pathItemObj] of Object.entries(paths)) {
    if (!pathItemObj || typeof pathItemObj !== 'object') continue;
    const pathItem = pathItemObj as any;

    // Convert OpenAPI {param} syntax to :param
    const convertedPath = rawPath.replace(/\{([^}]+)\}/g, ':$1');

    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation) continue;

      const reqName =
        operation.summary ||
        operation.operationId ||
        `${method.toUpperCase()} ${convertedPath}`;

      // Handle Tag / Folder
      let folderId: string | undefined;
      const tag = Array.isArray(operation.tags) && operation.tags.length > 0 ? operation.tags[0] : null;
      if (tag) {
        if (!foldersMap.has(tag)) {
          const newFolderId = `fld-${Date.now()}-${foldersMap.size}`;
          foldersMap.set(tag, newFolderId);
          folders.push({ id: newFolderId, name: tag });
        }
        folderId = foldersMap.get(tag);
      }

      // Parameters
      const allParams = [
        ...(Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
        ...(Array.isArray(operation.parameters) ? operation.parameters : [])
      ];

      const queryParams: KeyValuePair[] = [];
      const headers: KeyValuePair[] = [];

      for (const p of allParams) {
        if (!p || !p.name) continue;
        if (p.in === 'query') {
          queryParams.push({
            id: `param-${queryParams.length}`,
            key: p.name,
            value: p.example !== undefined ? String(p.example) : (p.schema?.default !== undefined ? String(p.schema.default) : ''),
            enabled: p.required !== false,
            description: p.description
          });
        } else if (p.in === 'header') {
          headers.push({
            id: `hdr-${headers.length}`,
            key: p.name,
            value: p.example !== undefined ? String(p.example) : '',
            enabled: p.required !== false,
            description: p.description
          });
        }
      }

      // Body extraction
      let bodyConfig: any = { type: 'none' };
      if (isOpenApi3 && operation.requestBody?.content) {
        const jsonContent = operation.requestBody.content['application/json'];
        const formContent = operation.requestBody.content['application/x-www-form-urlencoded'];

        if (jsonContent) {
          headers.push({
            id: `hdr-ct`,
            key: 'Content-Type',
            value: 'application/json',
            enabled: true
          });
          let exampleBody = '';
          if (jsonContent.example) {
            exampleBody = JSON.stringify(jsonContent.example, null, 2);
          } else if (jsonContent.examples) {
            const firstEx = Object.values(jsonContent.examples)[0] as any;
            exampleBody = JSON.stringify(firstEx?.value || firstEx, null, 2);
          } else if (jsonContent.schema) {
            exampleBody = JSON.stringify(generateSampleFromSchema(jsonContent.schema), null, 2);
          }
          bodyConfig = {
            type: 'json',
            rawContent: exampleBody
          };
        } else if (formContent) {
          headers.push({
            id: `hdr-ct`,
            key: 'Content-Type',
            value: 'application/x-www-form-urlencoded',
            enabled: true
          });
          bodyConfig = {
            type: 'urlencoded',
            urlencodedData: []
          };
        }
      } else if (isSwagger2) {
        const bodyParam = allParams.find((p) => p.in === 'body');
        if (bodyParam) {
          headers.push({
            id: `hdr-ct`,
            key: 'Content-Type',
            value: 'application/json',
            enabled: true
          });
          const example = bodyParam.schema?.example ? JSON.stringify(bodyParam.schema.example, null, 2) : '{}';
          bodyConfig = {
            type: 'json',
            rawContent: example
          };
        }
      }

      // Full URL
      const fullUrl = baseUrl ? `{{baseUrl}}${convertedPath.startsWith('/') ? '' : '/'}${convertedPath}` : convertedPath;

      requests.push({
        id: `req-${Date.now()}-${requests.length}`,
        collectionId,
        folderId,
        name: reqName,
        method: method.toUpperCase(),
        url: fullUrl,
        params: JSON.stringify(queryParams),
        headers: JSON.stringify(headers),
        body: JSON.stringify(bodyConfig),
        sortOrder: requests.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  return {
    collection: {
      id: collectionId,
      name: title,
      description
    },
    variables,
    folders,
    requests
  };
}

function generateSampleFromSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return {};
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  if (schema.type === 'object' || schema.properties) {
    const obj: Record<string, any> = {};
    if (schema.properties) {
      for (const [key, prop] of Object.entries<any>(schema.properties)) {
        obj[key] = generateSampleFromSchema(prop);
      }
    }
    return obj;
  }

  if (schema.type === 'array') {
    return [generateSampleFromSchema(schema.items || {})];
  }

  if (schema.type === 'string') {
    if (schema.format === 'date-time') return new Date().toISOString();
    if (schema.format === 'email') return 'user@example.com';
    return 'string';
  }

  if (schema.type === 'integer' || schema.type === 'number') {
    return 0;
  }

  if (schema.type === 'boolean') {
    return true;
  }

  return {};
}
