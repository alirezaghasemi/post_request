import * as crypto from 'node:crypto';

export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

export interface AuthUrlOptions {
  authUrl: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

export interface ClientCredentialsOptions {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
}

export interface OAuth2TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  refreshToken?: string;
  scope?: string;
}

export class OAuth2Engine {
  /**
   * Generates cryptographically secure PKCE code verifier and S256 challenge (RFC 7636)
   */
  public generatePKCE(): PKCEPair {
    // Verifier must be between 43 and 128 characters
    const verifier = crypto
      .randomBytes(48)
      .toString('base64url')
      .slice(0, 64);

    const challenge = this.calculateCodeChallenge(verifier);

    return {
      codeVerifier: verifier,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256'
    };
  }

  /**
   * Calculates Base64URL-encoded SHA-256 hash of code_verifier
   */
  public calculateCodeChallenge(codeVerifier: string): string {
    return crypto
      .createHash('sha256')
      .update(codeVerifier, 'ascii')
      .digest('base64url');
  }

  /**
   * Constructs the browser authorization redirect URL
   */
  public buildAuthorizationUrl(options: AuthUrlOptions): string {
    const url = new URL(options.authUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', options.clientId);
    url.searchParams.set('redirect_uri', options.redirectUri);

    if (options.scope) {
      url.searchParams.set('scope', options.scope);
    }
    if (options.state) {
      url.searchParams.set('state', options.state);
    }
    if (options.codeChallenge) {
      url.searchParams.set('code_challenge', options.codeChallenge);
      url.searchParams.set('code_challenge_method', options.codeChallengeMethod || 'S256');
    }

    return url.toString();
  }

  /**
   * Executes Client Credentials grant token request
   */
  public async requestClientCredentialsToken(options: ClientCredentialsOptions): Promise<OAuth2TokenResponse> {
    const body = new URLSearchParams();
    body.set('grant_type', 'client_credentials');
    body.set('client_id', options.clientId);
    body.set('client_secret', options.clientSecret);
    if (options.scope) {
      body.set('scope', options.scope);
    }

    const response = await fetch(options.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OAuth2 token request failed (${response.status}): ${errText}`);
    }

    const data = await response.json() as any;
    return {
      accessToken: data.access_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in,
      refreshToken: data.refresh_token,
      scope: data.scope
    };
  }
}
