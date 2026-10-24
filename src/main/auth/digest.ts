import * as crypto from 'node:crypto';

export interface DigestOptions {
  username: string;
  password: string;
  method: string;
  uri: string;
  challengeHeader: string;
  nc?: string;
  cnonce?: string;
}

export interface DigestChallenge {
  realm?: string;
  nonce?: string;
  qop?: string;
  opaque?: string;
  algorithm?: string;
  stale?: string;
}

export class DigestAuthHandler {
  /**
   * Parses standard WWW-Authenticate challenge header
   * Example: Digest realm="users@host.com", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", qop="auth"
   */
  public static parseChallenge(header: string): DigestChallenge {
    const challenge: DigestChallenge = {};
    if (!header || !header.toLowerCase().includes('digest')) {
      return challenge;
    }

    const regex = /(\w+)=["']?([^"',]+)["']?/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(header)) !== null) {
      const key = match[1].toLowerCase();
      const val = match[2];
      if (key === 'realm') challenge.realm = val;
      if (key === 'nonce') challenge.nonce = val;
      if (key === 'qop') challenge.qop = val;
      if (key === 'opaque') challenge.opaque = val;
      if (key === 'algorithm') challenge.algorithm = val;
      if (key === 'stale') challenge.stale = val;
    }

    return challenge;
  }

  private hash(algorithm: string, data: string): string {
    const algo = algorithm?.toLowerCase() === 'sha-256' ? 'sha256' : 'md5';
    return crypto.createHash(algo).update(data, 'utf8').digest('hex');
  }

  /**
   * Generates standard Authorization: Digest header according to RFC 2617 & RFC 7616
   */
  public generateDigestHeader(options: DigestOptions): string {
    const challenge = DigestAuthHandler.parseChallenge(options.challengeHeader);
    const algorithm = challenge.algorithm || 'MD5';
    const realm = challenge.realm || '';
    const nonce = challenge.nonce || '';
    const qop = challenge.qop ? challenge.qop.split(',')[0].trim() : undefined;
    const nc = options.nc || '00000001';
    const cnonce = options.cnonce || crypto.randomBytes(8).toString('hex');

    // HA1 = MD5(username:realm:password)
    const ha1 = this.hash(algorithm, `${options.username}:${realm}:${options.password}`);

    // HA2 = MD5(method:digestURI)
    const ha2 = this.hash(algorithm, `${options.method.toUpperCase()}:${options.uri}`);

    // Response
    let response: string;
    if (qop) {
      // response = MD5(HA1:nonce:nc:cnonce:qop:HA2)
      response = this.hash(algorithm, `${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    } else {
      // response = MD5(HA1:nonce:HA2)
      response = this.hash(algorithm, `${ha1}:${nonce}:${ha2}`);
    }

    const parts = [
      `username="${options.username}"`,
      `realm="${realm}"`,
      `nonce="${nonce}"`,
      `uri="${options.uri}"`,
      `response="${response}"`,
      `algorithm=${algorithm}`
    ];

    if (qop) {
      parts.push(`qop=${qop}`);
      parts.push(`nc=${nc}`);
      parts.push(`cnonce="${cnonce}"`);
    }

    if (challenge.opaque) {
      parts.push(`opaque="${challenge.opaque}"`);
    }

    return `Digest ${parts.join(', ')}`;
  }
}
