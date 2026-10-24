import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VaultManager } from '../src/main/vault/vault-manager';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('VaultManager (Local Secrets Vault & SafeStorage Fallback)', () => {
  let tempDir: string;
  let vault: VaultManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devpilot-vault-test-'));
    vault = new VaultManager({ storagePath: tempDir });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignored
    }
  });

  it('should encrypt and decrypt sensitive strings reliably', () => {
    const secret = 'super-secret-api-token-998877';
    const encrypted = vault.encrypt(secret);

    expect(encrypted).not.toBe(secret);
    expect(encrypted).toMatch(/^[a-f0-9:]+$/i); // Encrypted hex payload format

    const decrypted = vault.decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('should mask sensitive values for display', () => {
    expect(vault.mask('sk-proj-1234567890abcdef')).toBe('••••••••••••cdef');
    expect(vault.mask('short')).toBe('•••••');
  });

  it('should throw an informative error when decrypting tampered data', () => {
    const secret = 'original-secret';
    const encrypted = vault.encrypt(secret);
    const tampered = encrypted.substring(0, encrypted.length - 4) + '0000';

    expect(() => {
      vault.decrypt(tampered);
    }).toThrow();
  });
});
