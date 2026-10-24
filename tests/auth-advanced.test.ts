import { describe, it, expect } from 'vitest';
import { DigestAuthHandler } from '../src/main/auth/digest';
import { OAuth2Engine } from '../src/main/auth/oauth2';

describe('Advanced Authentication: Digest Auth & OAuth 2.0', () => {
  describe('DigestAuthHandler (RFC 7616 / RFC 2617)', () => {
    it('should calculate valid Digest authorization header for MD5', () => {
      const challenge = 'Digest realm="testrealm@host.com", qop="auth,auth-int", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41"';
      
      const handler = new DigestAuthHandler();
      const authHeader = handler.generateDigestHeader({
        username: 'Mufasa',
        password: 'CircleOfLife',
        method: 'GET',
        uri: '/dir/index.html',
        challengeHeader: challenge,
        nc: '00000001',
        cnonce: '0a4f113b'
      });

      expect(authHeader).toContain('Digest username="Mufasa"');
      expect(authHeader).toContain('realm="testrealm@host.com"');
      expect(authHeader).toContain('nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093"');
      expect(authHeader).toContain('uri="/dir/index.html"');
      expect(authHeader).toContain('response="');
      expect(authHeader).toContain('qop=auth');
      expect(authHeader).toContain('cnonce="0a4f113b"');
    });

    it('should parse WWW-Authenticate challenge header parameters correctly', () => {
      const header = 'Digest realm="secure-api", nonce="xyz789", qop="auth", algorithm="MD5"';
      const parsed = DigestAuthHandler.parseChallenge(header);

      expect(parsed.realm).toBe('secure-api');
      expect(parsed.nonce).toBe('xyz789');
      expect(parsed.qop).toBe('auth');
      expect(parsed.algorithm).toBe('MD5');
    });
  });

  describe('OAuth2Engine (PKCE & Client Credentials)', () => {
    const oauth2 = new OAuth2Engine();

    it('should generate cryptographically secure PKCE code verifier and challenge (S256)', () => {
      const pkce = oauth2.generatePKCE();

      expect(pkce.codeVerifier).toBeDefined();
      expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(pkce.codeVerifier.length).toBeLessThanOrEqual(128);

      expect(pkce.codeChallenge).toBeDefined();
      expect(pkce.codeChallengeMethod).toBe('S256');

      // Verify that code challenge is Base64URL-encoded SHA256 of code verifier
      const calculatedChallenge = oauth2.calculateCodeChallenge(pkce.codeVerifier);
      expect(calculatedChallenge).toBe(pkce.codeChallenge);
    });

    it('should construct authorization URL with PKCE parameters', () => {
      const url = oauth2.buildAuthorizationUrl({
        authUrl: 'https://auth.example.com/oauth/authorize',
        clientId: 'my-client-app',
        redirectUri: 'http://localhost:5000/callback',
        scope: 'read write openid',
        state: 'xyz_random_state',
        codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
        codeChallengeMethod: 'S256'
      });

      expect(url).toContain('https://auth.example.com/oauth/authorize');
      expect(url).toContain('client_id=my-client-app');
      expect(url).toContain('response_type=code');
      expect(url).toContain('code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
      expect(url).toContain('code_challenge_method=S256');
    });
  });
});
