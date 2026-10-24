import { describe, it, expect } from 'vitest';
import { validateIpcPayload } from '../src/main/ipc/validator';

describe('IPC Payload Validator', () => {
  it('should validate workspace creation payload', () => {
    const valid = { name: 'Production', description: 'Prod APIs' };
    const result = validateIpcPayload('workspace:create', valid);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject workspace creation without name or with empty name', () => {
    const invalidEmpty = { name: '   ' };
    const result1 = validateIpcPayload('workspace:create', invalidEmpty);
    expect(result1.valid).toBe(false);
    expect(result1.error).toContain('Name');

    const invalidType = { name: 123 };
    const result2 = validateIpcPayload('workspace:create', invalidType);
    expect(result2.valid).toBe(false);
  });

  it('should validate collection creation payload', () => {
    const valid = { workspaceId: 'ws-123', name: 'Users API' };
    const result = validateIpcPayload('collection:create', valid);
    expect(result.valid).toBe(true);

    const invalid = { name: 'Users API' }; // missing workspaceId
    const resultMissing = validateIpcPayload('collection:create', invalid);
    expect(resultMissing.valid).toBe(false);
  });

  it('should reject unknown channels', () => {
    const result = validateIpcPayload('unknown:channel' as any, {});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unknown channel');
  });
});
