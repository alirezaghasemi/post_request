import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface VaultOptions {
  storagePath?: string;
  useNativeSafeStorage?: boolean;
}

export class VaultManager {
  private key: Buffer;
  private storagePath: string;
  private isFallback: boolean = true;

  constructor(options?: VaultOptions) {
    this.storagePath = options?.storagePath || path.join(process.cwd(), '.vault');
    this.key = this.loadOrGenerateKey();
  }

  private loadOrGenerateKey(): Buffer {
    if (!fs.existsSync(this.storagePath)) {
      try {
        fs.mkdirSync(this.storagePath, { recursive: true });
      } catch {
        // Fallback to in-memory key if cannot write to filesystem
        return crypto.randomBytes(32);
      }
    }

    const keyFilePath = path.join(this.storagePath, 'vault.key');
    if (fs.existsSync(keyFilePath)) {
      try {
        const stored = fs.readFileSync(keyFilePath);
        if (stored.length === 32) {
          return stored;
        }
      } catch {
        // Fall through to generate new key
      }
    }

    const newKey = crypto.randomBytes(32);
    try {
      fs.writeFileSync(keyFilePath, newKey, { mode: 0o600 });
    } catch {
      // Ignored
    }
    return newKey;
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Format: iv:authTag:ciphertext (hex-encoded)
   */
  public encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts ciphertext using AES-256-GCM and verifies authentication tag.
   */
  public decrypt(ciphertextWithMetadata: string): string {
    const parts = ciphertextWithMetadata.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid vault ciphertext format. Expected iv:authTag:ciphertext');
    }

    const [ivHex, authTagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const cipherData = Buffer.from(cipherHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(cipherData),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Masks secret for display in the UI (e.g. ••••••••cdef)
   */
  public mask(secret: string): string {
    if (!secret) return '';
    if (secret.length <= 6) {
      return '•'.repeat(secret.length);
    }
    const visibleSuffixLength = Math.min(4, Math.floor(secret.length / 4));
    const maskedLength = Math.min(12, secret.length - visibleSuffixLength);
    return '•'.repeat(maskedLength) + secret.slice(-visibleSuffixLength);
  }

  public isUsingFallback(): boolean {
    return this.isFallback;
  }
}
