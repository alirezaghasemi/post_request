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
