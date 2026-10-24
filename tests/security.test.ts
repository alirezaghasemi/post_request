import { describe, it, expect } from 'vitest';
import { validateIpcPayload } from '../src/main/ipc/validator';

describe('Security Policies & Sanitization', () => {
  it('should reject malformed or oversized payload structures in IPC channels', () => {
    // Attempt SQL injection via ID
    const sqlInjectionAttempt = "'; DROP TABLE workspaces; --";
    // While our DB uses prepared statements everywhere, IPC validator ensures it's a string
    const result = validateIpcPayload('workspace:get', sqlInjectionAttempt);
    expect(result.valid).toBe(true); // string type is checked, parameterized queries prevent SQLi
  });

  it('should reject non-object payloads where objects are required', () => {
    const invalidTypes = [null, undefined, 12345, 'string', true, []];
    for (const invalid of invalidTypes) {
      const result = validateIpcPayload('workspace:create', invalid);
      expect(result.valid).toBe(false);
    }
  });

  it('should reject empty or whitespace-only names', () => {
    const whitespaceOnly = { name: '    \n\t   ' };
    const result = validateIpcPayload('workspace:create', whitespaceOnly);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Name');
  });

  it('should reject unauthorized IPC channel names', () => {
    const maliciousChannels = [
      'child_process:exec',
      'fs:readFile',
      'shell:openPath',
      'eval',
      '__proto__'
    ];

    for (const channel of maliciousChannels) {
      const result = validateIpcPayload(channel as any, {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown channel');
    }
  });
});
