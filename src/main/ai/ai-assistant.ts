import { randomUUID } from 'node:crypto';
import type { RequestItem, KeyValuePair } from '../../shared/types';

export interface AiProviderConfig {
  provider: 'offline' | 'ollama' | 'openai';
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export class AiAssistant {
  private config: AiProviderConfig = {
    provider: 'offline',
    baseUrl: 'http://localhost:11434',
    model: 'llama3'
  };

  public setConfig(config: Partial<AiProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): AiProviderConfig {
    return { ...this.config };
  }

  public async buildRequestFromPrompt(
    prompt: string,
    _config?: AiProviderConfig
  ): Promise<Partial<RequestItem>> {
    // 1. Detect HTTP Method
    let method: any = 'GET';
    const upperPrompt = prompt.toUpperCase();
    if (upperPrompt.includes('POST') || prompt.toLowerCase().includes('create') || prompt.toLowerCase().includes('add ')) {
      method = 'POST';
    } else if (upperPrompt.includes('DELETE') || prompt.toLowerCase().includes('remove')) {
      method = 'DELETE';
    } else if (upperPrompt.includes('PUT') || prompt.toLowerCase().includes('replace')) {
      method = 'PUT';
    } else if (upperPrompt.includes('PATCH') || prompt.toLowerCase().includes('update')) {
      method = 'PATCH';
    }

    // 2. Extract URL
    let url = 'https://api.example.com';
    const urlMatch = prompt.match(/https?:\/\/[^\s"',]+/i);
    if (urlMatch) {
      url = urlMatch[0];
    } else {
      const pathMatch = prompt.match(/(?:to|endpoint|path)\s+([/\w.-]+)/i);
      if (pathMatch) {
        url = `https://api.example.com${pathMatch[1].startsWith('/') ? '' : '/'}${pathMatch[1]}`;
      }
    }

    // 3. Extract JSON Body fields if applicable
    let bodyJson = JSON.stringify({ type: 'none' });
    const payloadFields: Record<string, any> = {};

    // Pattern: email <value>
    const emailMatch = prompt.match(/email\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      payloadFields['email'] = emailMatch[1];
    }

    // Pattern: name <value>
    const nameMatch = prompt.match(/name\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)/i);
    if (nameMatch) {
      payloadFields['name'] = nameMatch[1];
    }

    // Pattern: quantity / qty <number>
    const qtyMatch = prompt.match(/(?:quantity|qty)\s+(\d+)/i);
    if (qtyMatch) {
      payloadFields['quantity'] = parseInt(qtyMatch[1], 10);
    }

    // Pattern: item / itemId <id>
    const itemMatch = prompt.match(/(?:item|itemId)\s+([A-Za-z0-9_-]+)/i);
    if (itemMatch && itemMatch[1].toLowerCase() !== 'and') {
      payloadFields['itemId'] = itemMatch[1];
    }

    if (Object.keys(payloadFields).length > 0 || method === 'POST' || method === 'PUT' || method === 'PATCH') {
      bodyJson = JSON.stringify({
        type: 'json',
        rawContent: JSON.stringify(Object.keys(payloadFields).length > 0 ? payloadFields : { sampleKey: 'sampleValue' }, null, 2)
      });
    }

    const headersList: KeyValuePair[] = [
      {
        id: randomUUID(),
        key: 'Content-Type',
        value: 'application/json',
        enabled: true
      },
      {
        id: randomUUID(),
        key: 'Accept',
        value: 'application/json',
        enabled: true
      }
    ];

    const now = new Date().toISOString();
    return {
      name: `AI: ${method} ${url}`,
      method,
      url,
      headers: JSON.stringify(headersList),
      params: JSON.stringify([]),
      body: bodyJson,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now
    };
  }

  public generateTestsFromResponse(response: {
    status: number;
    statusText?: string;
    timeMs?: number;
    bodyText: string;
  }): string {
    const lines: string[] = [];

    // Status Assertion
    lines.push(`pm.test("Status code is ${response.status}", function () {`);
    lines.push(`  pm.expect(pm.response.code).to.eql(${response.status});`);
    lines.push('});');
    lines.push('');

    // Response Time Assertion
    lines.push('pm.test("Response time is acceptable", function () {');
    lines.push('  pm.expect(pm.response.responseTime).to.be.below(1000);');
    lines.push('});');
    lines.push('');

    // Parse Body Assertions
    if (response.bodyText && response.bodyText.trim().length > 0) {
      try {
        const parsed = JSON.parse(response.bodyText);
        lines.push('pm.test("Response is valid JSON", function () {');
        lines.push('  var jsonData = pm.response.json();');
        lines.push('  pm.expect(jsonData).to.be.an("object");');
        lines.push('});');
        lines.push('');

        if (Array.isArray(parsed)) {
          lines.push('pm.test("Response is a non-empty array", function () {');
          lines.push('  var jsonData = pm.response.json();');
          lines.push('  pm.expect(Array.isArray(jsonData)).to.be.true;');
          lines.push('});');
        } else if (typeof parsed === 'object' && parsed !== null) {
          const keys = Object.keys(parsed);
          for (const key of keys.slice(0, 8)) {
            const val = parsed[key];
            const type = Array.isArray(val) ? 'array' : typeof val;
            lines.push(`pm.test("Response has ${key}", function () {`);
            lines.push('  var jsonData = pm.response.json();');
            lines.push(`  pm.expect(jsonData).to.have.property("${key}");`);
            lines.push(`  pm.expect(typeof jsonData.${key}).to.eql("${type}");`);
            lines.push('});');
            lines.push('');
          }
        }
      } catch {
        lines.push('pm.test("Response body is not empty", function () {');
        lines.push('  pm.expect(pm.response.text()).to.have.lengthOf.at.least(1);');
        lines.push('});');
      }
    }

    return lines.join('\n');
  }

  public generateDocumentation(
    request: RequestItem,
    exampleResponse?: { status: number; bodyText: string }
  ): string {
    const lines: string[] = [];
    lines.push(`# ${request.name}`);
    lines.push('');
    lines.push(`**Method:** \`${request.method}\`  `);
    lines.push(`**Endpoint URL:** \`${request.url}\``);
    lines.push('');

    // Headers
    let headers: KeyValuePair[] = [];
    try {
      headers = typeof request.headers === 'string' ? JSON.parse(request.headers) : (request.headers || []);
    } catch { headers = []; }

    if (headers.length > 0) {
      lines.push('### Headers');
      lines.push('| Header | Value |');
      lines.push('| :--- | :--- |');
      headers.filter((h) => h.enabled).forEach((h) => {
        lines.push(`| \`${h.key}\` | \`${h.value}\` |`);
      });
      lines.push('');
    }

    // Request Body
    if (request.body) {
      try {
        const bodyObj = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
        if (bodyObj.type === 'json' && bodyObj.rawContent) {
          lines.push('### Request Body (application/json)');
          lines.push('```json');
          lines.push(bodyObj.rawContent);
          lines.push('```');
          lines.push('');
        }
      } catch { /* ignored */ }
    }

    // Example Response
    if (exampleResponse && exampleResponse.bodyText) {
      lines.push(`### Example Response (${exampleResponse.status || 200})`);
      lines.push('```json');
      try {
        const formatted = JSON.stringify(JSON.parse(exampleResponse.bodyText), null, 2);
        lines.push(formatted);
      } catch {
        lines.push(exampleResponse.bodyText);
      }
      lines.push('```');
      lines.push('');
    }

    return lines.join('\n');
  }
}
