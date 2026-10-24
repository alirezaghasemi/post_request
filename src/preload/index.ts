import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type {
  IpcResponse,
  SystemStatus,
  AppSettings,
  Workspace,
  Collection,
  Folder,
  Environment,
  RequestItem
} from '../shared/types';

// Helper to wrap ipcRenderer.invoke with typed response unwrapping
async function invoke<TResult, TPayload = unknown>(channel: string, payload?: TPayload): Promise<TResult> {
  const response: IpcResponse<TResult> = await ipcRenderer.invoke(channel, payload);
  if (!response.success) {
    throw new Error(response.error?.message || `IPC invocation failed on channel ${channel}`);
  }
  return response.data as TResult;
}

export const electronAPI = {
  // System & Health
  system: {
    getStatus: (): Promise<SystemStatus> => invoke(IPC_CHANNELS.SYSTEM_GET_STATUS),
    getSettings: (): Promise<AppSettings> => invoke(IPC_CHANNELS.SYSTEM_GET_SETTINGS),
    updateSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
      invoke(IPC_CHANNELS.SYSTEM_UPDATE_SETTINGS, settings)
  },

  // Workspaces
  workspaces: {
    list: (): Promise<Workspace[]> => invoke(IPC_CHANNELS.WORKSPACE_LIST),
    get: (id: string): Promise<Workspace | null> => invoke(IPC_CHANNELS.WORKSPACE_GET, id),
    create: (data: { name: string; description?: string }): Promise<Workspace> =>
      invoke(IPC_CHANNELS.WORKSPACE_CREATE, data),
    update: (id: string, data: Partial<Pick<Workspace, 'name' | 'description'>>): Promise<Workspace> =>
      invoke(IPC_CHANNELS.WORKSPACE_UPDATE, { id, ...data }),
    delete: (id: string): Promise<boolean> => invoke(IPC_CHANNELS.WORKSPACE_DELETE, id)
  },

  // Collections
  collections: {
    list: (workspaceId: string): Promise<Collection[]> =>
      invoke(IPC_CHANNELS.COLLECTION_LIST, workspaceId),
    create: (data: { workspaceId: string; name: string; description?: string }): Promise<Collection> =>
      invoke(IPC_CHANNELS.COLLECTION_CREATE, data),
    delete: (id: string): Promise<boolean> => invoke(IPC_CHANNELS.COLLECTION_DELETE, id)
  },

  // Folders
  folders: {
    list: (collectionId: string): Promise<Folder[]> =>
      invoke(IPC_CHANNELS.FOLDER_LIST, collectionId),
    create: (data: { collectionId: string; parentFolderId?: string; name: string }): Promise<Folder> =>
      invoke(IPC_CHANNELS.FOLDER_CREATE, data),
    delete: (id: string): Promise<boolean> => invoke(IPC_CHANNELS.FOLDER_DELETE, id)
  },

  // Environments
  environments: {
    list: (workspaceId: string): Promise<Environment[]> =>
      invoke(IPC_CHANNELS.ENVIRONMENT_LIST, workspaceId),
    create: (data: { workspaceId: string; name: string }): Promise<Environment> =>
      invoke(IPC_CHANNELS.ENVIRONMENT_CREATE, data),
    update: (id: string, data: Partial<Pick<Environment, 'name' | 'variables' | 'isActive'>>): Promise<Environment> =>
      invoke(IPC_CHANNELS.ENVIRONMENT_UPDATE, { id, ...data }),
    delete: (id: string): Promise<boolean> => invoke(IPC_CHANNELS.ENVIRONMENT_DELETE, id)
  },

  // Import / Export
  importExport: {
    importCollection: (json: any, workspaceId: string): Promise<any> =>
      invoke(IPC_CHANNELS.IMPORT_POSTMAN_COLLECTION, { json, workspaceId }),
    exportCollection: (collectionId: string): Promise<any> =>
      invoke(IPC_CHANNELS.EXPORT_POSTMAN_COLLECTION, collectionId),
    importEnvironment: (json: any, workspaceId: string): Promise<any> =>
      invoke(IPC_CHANNELS.IMPORT_POSTMAN_ENVIRONMENT, { json, workspaceId }),
    exportEnvironment: (environmentId: string): Promise<any> =>
      invoke(IPC_CHANNELS.EXPORT_POSTMAN_ENVIRONMENT, environmentId),
    importOpenApi: (workspaceId: string, content: string): Promise<any> =>
      invoke(IPC_CHANNELS.IMPORT_OPENAPI, { workspaceId, content })
  },

  // Requests
  requests: {
    listByCollection: (collectionId: string): Promise<RequestItem[]> =>
      invoke(IPC_CHANNELS.REQUEST_LIST_BY_COLLECTION, collectionId),
    create: (data: Partial<RequestItem> & { name: string; method: string; url: string }): Promise<RequestItem> =>
      invoke(IPC_CHANNELS.REQUEST_CREATE, data)
  },

  // HTTP Network Execution
  http: {
    execute: (payload: any): Promise<any> => invoke(IPC_CHANNELS.HTTP_EXECUTE, payload),
    cancel: (requestId: string): Promise<boolean> => invoke(IPC_CHANNELS.HTTP_CANCEL, requestId)
  },

  // History
  history: {
    list: (workspaceId: string): Promise<any[]> => invoke(IPC_CHANNELS.HISTORY_LIST, workspaceId),
    clear: (workspaceId: string): Promise<boolean> => invoke(IPC_CHANNELS.HISTORY_CLEAR, workspaceId)
  },

  // Scripting
  scripting: {
    run: (script: string, context?: any): Promise<any> =>
      invoke(IPC_CHANNELS.SCRIPT_RUN, { script, context })
  },

  // Advanced Auth
  auth: {
    generatePKCE: (): Promise<{ codeVerifier: string; codeChallenge: string; codeChallengeMethod: string }> =>
      invoke(IPC_CHANNELS.AUTH_OAUTH2_GENERATE_PKCE),
    getOAuth2Token: (options: any): Promise<any> =>
      invoke(IPC_CHANNELS.AUTH_OAUTH2_GET_TOKEN, options)
  },

  // Vault
  vault: {
    encrypt: (plaintext: string): Promise<string> => invoke(IPC_CHANNELS.VAULT_ENCRYPT, plaintext),
    decrypt: (ciphertext: string): Promise<string> => invoke(IPC_CHANNELS.VAULT_DECRYPT, ciphertext),
    mask: (secret: string): Promise<string> => invoke(IPC_CHANNELS.VAULT_MASK, secret)
  },

  // Collection Runner
  runner: {
    start: (config: any): Promise<any> => invoke(IPC_CHANNELS.RUNNER_START, config),
    cancel: (): Promise<boolean> => invoke(IPC_CHANNELS.RUNNER_CANCEL),
    parseData: (content: string, format: 'json' | 'csv'): Promise<Record<string, any>[]> =>
      invoke(IPC_CHANNELS.RUNNER_PARSE_DATA, { content, format }),
    exportReport: (report: any, format: 'json' | 'html'): Promise<string> =>
      invoke(IPC_CHANNELS.RUNNER_EXPORT_REPORT, { report, format })
  },

  // Mock Server
  mockServer: {
    start: (port?: number): Promise<{ isRunning: boolean; port: number }> =>
      invoke(IPC_CHANNELS.MOCK_SERVER_START, { port }),
    stop: (): Promise<{ isRunning: boolean }> => invoke(IPC_CHANNELS.MOCK_SERVER_STOP),
    status: (): Promise<{ isRunning: boolean; port: number; routesCount: number }> =>
      invoke(IPC_CHANNELS.MOCK_SERVER_STATUS),
    setRoutes: (routes: any[]): Promise<boolean> =>
      invoke(IPC_CHANNELS.MOCK_SERVER_SET_ROUTES, routes),
    getLogs: (): Promise<any[]> => invoke(IPC_CHANNELS.MOCK_SERVER_GET_LOGS),
    onRequest: (callback: (log: any) => void): (() => void) => {
      const listener = (_event: any, log: any) => callback(log);
      ipcRenderer.on('mock:server:request', listener);
      return () => ipcRenderer.removeListener('mock:server:request', listener);
    }
  },

  // Documentation & Code Snippets
  docs: {
    generateHtml: (collectionId: string): Promise<string> =>
      invoke(IPC_CHANNELS.DOCS_GENERATE_HTML, { collectionId })
  },
  code: {
    generateSnippet: (request: any, language: string): Promise<string> =>
      invoke(IPC_CHANNELS.CODE_GENERATE_SNIPPET, { request, language })
  },

  // Phase 7: GraphQL
  graphql: {
    execute: (payload: any): Promise<any> => invoke(IPC_CHANNELS.GRAPHQL_EXECUTE, payload),
    introspect: (url: string, headers?: Record<string, string>): Promise<any> =>
      invoke(IPC_CHANNELS.GRAPHQL_INTROSPECT, { url, headers })
  },

  // Phase 7: WebSocket
  websocket: {
    connect: (connectionId: string, url: string, headers?: Record<string, string>): Promise<any> =>
      invoke(IPC_CHANNELS.WEBSOCKET_CONNECT, { connectionId, url, headers }),
    send: (connectionId: string, data: string): Promise<boolean> =>
      invoke(IPC_CHANNELS.WEBSOCKET_SEND, { connectionId, data }),
    disconnect: (connectionId: string): Promise<any> =>
      invoke(IPC_CHANNELS.WEBSOCKET_DISCONNECT, { connectionId }),
    getStatus: (connectionId: string): Promise<string> =>
      invoke(IPC_CHANNELS.WEBSOCKET_GET_STATUS, { connectionId }),
    getHistory: (connectionId: string): Promise<any[]> =>
      invoke(IPC_CHANNELS.WEBSOCKET_GET_HISTORY, { connectionId }),
    clearHistory: (connectionId: string): Promise<boolean> =>
      invoke(IPC_CHANNELS.WEBSOCKET_CLEAR_HISTORY, { connectionId }),
    onMessage: (callback: (payload: { connectionId: string; entry: any }) => void): (() => void) => {
      const listener = (_event: any, payload: any) => callback(payload);
      ipcRenderer.on('websocket:message', listener);
      return () => ipcRenderer.removeListener('websocket:message', listener);
    },
    onStatus: (callback: (payload: { connectionId: string; status: string }) => void): (() => void) => {
      const listener = (_event: any, payload: any) => callback(payload);
      ipcRenderer.on('websocket:status', listener);
      return () => ipcRenderer.removeListener('websocket:status', listener);
    }
  },

  // Phase 7: MQTT
  mqtt: {
    connect: (clientId: string, brokerUrl: string, options?: any): Promise<any> =>
      invoke(IPC_CHANNELS.MQTT_CONNECT, { clientId, brokerUrl, options }),
    subscribe: (clientId: string, topic: string, qos?: 0 | 1 | 2): Promise<any> =>
      invoke(IPC_CHANNELS.MQTT_SUBSCRIBE, { clientId, topic, qos }),
    unsubscribe: (clientId: string, topic: string): Promise<any> =>
      invoke(IPC_CHANNELS.MQTT_UNSUBSCRIBE, { clientId, topic }),
    publish: (clientId: string, topic: string, message: string, qos?: 0 | 1 | 2): Promise<any> =>
      invoke(IPC_CHANNELS.MQTT_PUBLISH, { clientId, topic, message, qos }),
    disconnect: (clientId: string): Promise<any> =>
      invoke(IPC_CHANNELS.MQTT_DISCONNECT, { clientId }),
    getHistory: (clientId: string): Promise<any[]> =>
      invoke(IPC_CHANNELS.MQTT_GET_HISTORY, { clientId }),
    onMessage: (callback: (payload: { clientId: string; entry: any }) => void): (() => void) => {
      const listener = (_event: any, payload: any) => callback(payload);
      ipcRenderer.on('mqtt:message', listener);
      return () => ipcRenderer.removeListener('mqtt:message', listener);
    }
  },

  // Phase 9: Proxy
  proxy: {
    start: (port?: number): Promise<{ isRunning: boolean; port: number }> =>
      invoke(IPC_CHANNELS.PROXY_START, { port }),
    stop: (): Promise<{ isRunning: boolean }> =>
      invoke(IPC_CHANNELS.PROXY_STOP),
    getStatus: (): Promise<{ isRunning: boolean; port: number }> =>
      invoke(IPC_CHANNELS.PROXY_STATUS),
    clear: (): Promise<{ cleared: boolean }> =>
      invoke(IPC_CHANNELS.PROXY_CLEAR),
    getTraffic: (): Promise<any[]> =>
      invoke(IPC_CHANNELS.PROXY_GET_TRAFFIC),
    saveToCollection: (trafficId: string, collectionId: string, name?: string): Promise<any> =>
      invoke(IPC_CHANNELS.PROXY_SAVE_TO_COLLECTION, { trafficId, collectionId, name }),
    onTraffic: (callback: (item: any) => void): (() => void) => {
      const listener = (_event: any, payload: any) => callback(payload);
      ipcRenderer.on('proxy:traffic', listener);
      return () => ipcRenderer.removeListener('proxy:traffic', listener);
    }
  },

  // Phase 9: Git Diff & Versioning
  git: {
    diffRequests: (before: any, after: any): Promise<any> =>
      invoke(IPC_CHANNELS.GIT_DIFF_REQUESTS, { before, after }),
    exportRepo: (collectionId: string, outputDir: string): Promise<any> =>
      invoke(IPC_CHANNELS.GIT_EXPORT_REPO, { collectionId, outputDir })
  },

  // Phase 9: AI Assistant
  ai: {
    buildRequest: (prompt: string): Promise<any> =>
      invoke(IPC_CHANNELS.AI_BUILD_REQUEST, { prompt }),
    generateTests: (response: any): Promise<string> =>
      invoke(IPC_CHANNELS.AI_GENERATE_TESTS, { response }),
    generateDocs: (request: any, exampleResponse?: any): Promise<string> =>
      invoke(IPC_CHANNELS.AI_GENERATE_DOCS, { request, exampleResponse }),
    getConfig: (): Promise<any> =>
      invoke(IPC_CHANNELS.AI_GET_CONFIG),
    setConfig: (config: any): Promise<any> =>
      invoke(IPC_CHANNELS.AI_SET_CONFIG, config)
  },

  // Window Controls
  window: {
    minimize: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE)
  }
};

export type ElectronAPI = typeof electronAPI;

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
