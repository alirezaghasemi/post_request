export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | string;

export type VariableType = 'default' | 'secret';

export interface EnvironmentVariable {
  key: string;
  value: string;
  type: VariableType;
  enabled: boolean;
  description?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  authConfig?: string;
  variables?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  collectionId: string;
  parentFolderId?: string | null;
  name: string;
  authConfig?: string;
  sortOrder: number;
}

export interface RequestItem {
  id: string;
  collectionId?: string | null;
  folderId?: string | null;
  name: string;
  method: HttpMethod;
  url: string;
  headers?: string;
  params?: string;
  body?: string;
  authConfig?: string;
  preScript?: string;
  testScript?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export type BodyType = 'none' | 'json' | 'text' | 'xml' | 'html' | 'urlencoded';

export interface RequestBodyConfig {
  type: BodyType;
  rawContent?: string;
  urlencodedData?: KeyValuePair[];
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey' | 'digest' | 'oauth2';

export interface DigestAuthConfig {
  username?: string;
  password?: string;
  realm?: string;
  nonce?: string;
  algorithm?: string;
  qop?: string;
}

export interface OAuth2Config {
  grantType: 'authorization_code' | 'client_credentials';
  authUrl?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  state?: string;
  codeVerifier?: string;
  codeChallenge?: string;
  accessToken?: string;
  tokenType?: string;
  addTokenTo?: 'header' | 'query';
}

export interface AuthConfig {
  type: AuthType;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyAddTo?: 'header' | 'query';
  digest?: DigestAuthConfig;
  oauth2?: OAuth2Config;
}

export interface ScriptLog {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface ScriptTestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface HttpRequestExecutionPayload {
  requestId: string;
  method: string;
  url: string;
  params: KeyValuePair[];
  headers: KeyValuePair[];
  body: RequestBodyConfig;
  auth: AuthConfig;
  preScript?: string;
  testScript?: string;
  timeoutMs?: number;
  followRedirects?: boolean;
  workspaceId?: string;
  collectionId?: string;
  localVariables?: EnvironmentVariable[];
}

export interface HttpResponseCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
}

export interface HttpResponseData {
  requestId: string;
  status: number;
  statusText: string;
  timeMs: number;
  sizeBytes: number;
  headers: Record<string, string | string[]>;
  cookies: HttpResponseCookie[];
  body: string;
  contentType: string;
  isTruncated: boolean;
  error?: string;
  tests?: ScriptTestResult[];
  logs?: ScriptLog[];
}

export interface HistoryItem {
  id: string;
  workspaceId: string;
  method: string;
  url: string;
  statusCode: number;
  timeMs: number;
  sizeBytes: number;
  executedAt: string;
}

export interface Environment {
  id: string;
  workspaceId: string;
  name: string;
  variables: EnvironmentVariable[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  fontSize: number;
  timeoutMs: number;
  maxResponseSizeBytes: number;
  followRedirects: boolean;
  strictSSL: boolean;
}

export interface SystemStatus {
  version: string;
  platform: string;
  databaseConnected: boolean;
  databasePath: string;
  nodeVersion: string;
  electronVersion: string;
}

export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
