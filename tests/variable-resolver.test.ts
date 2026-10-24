import { describe, it, expect } from 'vitest';
import { VariableResolver } from '../src/main/variables/resolver';
import type { EnvironmentVariable } from '../src/shared/types';

describe('VariableResolver Engine', () => {
  const resolver = new VariableResolver();

  it('should resolve simple variable in string', () => {
    const context = {
      environment: [
        { key: 'baseUrl', value: 'https://api.example.com', type: 'default', enabled: true }
      ] as EnvironmentVariable[]
    };

    const result = resolver.resolveString('{{baseUrl}}/users', context);
    expect(result).toBe('https://api.example.com/users');
  });

  it('should enforce deterministic precedence: request > environment > collection > global', () => {
    const context = {
      global: [
        { key: 'host', value: 'global.com', type: 'default', enabled: true },
        { key: 'port', value: '80', type: 'default', enabled: true }
      ] as EnvironmentVariable[],
      collection: [
        { key: 'host', value: 'collection.com', type: 'default', enabled: true },
        { key: 'port', value: '8080', type: 'default', enabled: true }
      ] as EnvironmentVariable[],
      environment: [
        { key: 'host', value: 'environment.com', type: 'default', enabled: true }
      ] as EnvironmentVariable[],
      request: [
        { key: 'host', value: 'request.com', type: 'default', enabled: true }
      ] as EnvironmentVariable[]
    };

    // 'host' is present in all 4 -> request wins
    expect(resolver.resolveString('{{host}}', context)).toBe('request.com');

    // 'port' is present in global and collection -> collection wins
    expect(resolver.resolveString('{{port}}', context)).toBe('8080');
  });

  it('should ignore disabled variables', () => {
    const context = {
      environment: [
        { key: 'apiUrl', value: 'https://disabled.com', type: 'default', enabled: false }
      ] as EnvironmentVariable[],
      global: [
        { key: 'apiUrl', value: 'https://fallback.com', type: 'default', enabled: true }
      ] as EnvironmentVariable[]
    };

    const result = resolver.resolveString('{{apiUrl}}/v1', context);
    expect(result).toBe('https://fallback.com/v1');
  });

  it('should keep unresolved variables intact and list them', () => {
    const context = {
      environment: [
        { key: 'known', value: 'hello', type: 'default', enabled: true }
      ] as EnvironmentVariable[]
    };

    const { resolved, unresolved } = resolver.resolveWithDiagnostics('{{known}} to {{unknown_var}}', context);
    expect(resolved).toBe('hello to {{unknown_var}}');
    expect(unresolved).toEqual(['unknown_var']);
  });

  it('should resolve variables inside entire HTTP payload object', () => {
    const context = {
      environment: [
        { key: 'domain', value: 'myservice.dev', type: 'default', enabled: true },
        { key: 'apiKey', value: 'secret-token-123', type: 'secret', enabled: true },
        { key: 'userId', value: '42', type: 'default', enabled: true }
      ] as EnvironmentVariable[]
    };

    const payload = {
      url: 'https://{{domain}}/api/user/{{userId}}',
      headers: [
        { id: '1', key: 'Authorization', value: 'Bearer {{apiKey}}', enabled: true }
      ],
      params: [
        { id: '2', key: 'uid', value: '{{userId}}', enabled: true }
      ],
      body: {
        type: 'json' as const,
        rawContent: '{"user": {{userId}}}'
      }
    };

    const resolvedPayload = resolver.resolvePayload(payload, context);

    expect(resolvedPayload.url).toBe('https://myservice.dev/api/user/42');
    expect(resolvedPayload.headers[0].value).toBe('Bearer secret-token-123');
    expect(resolvedPayload.params[0].value).toBe('42');
    expect(resolvedPayload.body.rawContent).toBe('{"user": 42}');
  });
});
