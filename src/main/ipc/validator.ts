import { IPC_CHANNELS, type IpcChannel } from '../../shared/ipc-channels';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateIpcPayload(channel: IpcChannel, payload: unknown): ValidationResult {
  const validChannels = Object.values(IPC_CHANNELS) as string[];
  if (!validChannels.includes(channel)) {
    return { valid: false, error: `Unknown channel: ${channel}` };
  }

  // System & Window channels need minimal/no payload
  if (
    channel === IPC_CHANNELS.SYSTEM_GET_STATUS ||
    channel === IPC_CHANNELS.SYSTEM_GET_SETTINGS ||
    channel === IPC_CHANNELS.WORKSPACE_LIST ||
    channel === IPC_CHANNELS.WINDOW_MINIMIZE ||
    channel === IPC_CHANNELS.WINDOW_MAXIMIZE ||
    channel === IPC_CHANNELS.WINDOW_CLOSE ||
    channel === IPC_CHANNELS.AUTH_OAUTH2_GENERATE_PKCE ||
    channel === IPC_CHANNELS.RUNNER_CANCEL
  ) {
    return { valid: true };
  }

  // Runner Start validation
  if (channel === IPC_CHANNELS.RUNNER_START) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object' };
    }
    const data = payload as { collectionId?: unknown };
    if (typeof data.collectionId !== 'string' || data.collectionId.trim().length === 0) {
      return { valid: false, error: 'collectionId is required' };
    }
    return { valid: true };
  }

  // Runner Data Parse & Export
  if (channel === IPC_CHANNELS.RUNNER_PARSE_DATA || channel === IPC_CHANNELS.RUNNER_EXPORT_REPORT) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object' };
    }
    return { valid: true };
  }

  // Script execution validation
  if (channel === IPC_CHANNELS.SCRIPT_RUN) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object with script string' };
    }
    return { valid: true };
  }

  // Vault operations
  if (
    channel === IPC_CHANNELS.VAULT_ENCRYPT ||
    channel === IPC_CHANNELS.VAULT_DECRYPT ||
    channel === IPC_CHANNELS.VAULT_MASK
  ) {
    if (typeof payload !== 'string') {
      return { valid: false, error: 'Payload must be a string' };
    }
    return { valid: true };
  }

  // Workspace creation
  if (channel === IPC_CHANNELS.WORKSPACE_CREATE) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object' };
    }
    const data = payload as { name?: unknown };
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      return { valid: false, error: 'Name is required and must be a non-empty string' };
    }
    return { valid: true };
  }

  // Collection creation
  if (channel === IPC_CHANNELS.COLLECTION_CREATE) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object' };
    }
    const data = payload as { workspaceId?: unknown; name?: unknown };
    if (typeof data.workspaceId !== 'string' || data.workspaceId.trim().length === 0) {
      return { valid: false, error: 'workspaceId is required' };
    }
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      return { valid: false, error: 'Name is required' };
    }
    return { valid: true };
  }

  // Request creation
  if (channel === IPC_CHANNELS.REQUEST_CREATE) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object' };
    }
    const data = payload as { name?: unknown; method?: unknown };
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      return { valid: false, error: 'Name is required' };
    }
    return { valid: true };
  }

  // HTTP Execution
  if (channel === IPC_CHANNELS.HTTP_EXECUTE) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object' };
    }
    const data = payload as { requestId?: unknown; method?: unknown; url?: unknown };
    if (typeof data.requestId !== 'string' || data.requestId.trim().length === 0) {
      return { valid: false, error: 'requestId is required' };
    }
    if (typeof data.method !== 'string' || data.method.trim().length === 0) {
      return { valid: false, error: 'method is required' };
    }
    if (typeof data.url !== 'string' || data.url.trim().length === 0) {
      return { valid: false, error: 'url is required' };
    }
    return { valid: true };
  }

  // String ID based actions (Cancel, History)
  if (
    channel === IPC_CHANNELS.HTTP_CANCEL ||
    channel === IPC_CHANNELS.HISTORY_LIST ||
    channel === IPC_CHANNELS.HISTORY_CLEAR
  ) {
    if (typeof payload !== 'string' || payload.trim().length === 0) {
      return { valid: false, error: 'Payload must be a non-empty string' };
    }
    return { valid: true };
  }

  // Generic object check for updates
  if (
    channel === IPC_CHANNELS.WORKSPACE_UPDATE ||
    channel === IPC_CHANNELS.COLLECTION_UPDATE ||
    channel === IPC_CHANNELS.SYSTEM_UPDATE_SETTINGS
  ) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object' };
    }
    return { valid: true };
  }

  // Folder creation
  if (channel === IPC_CHANNELS.FOLDER_CREATE) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object' };
    }
    const data = payload as { collectionId?: unknown; name?: unknown };
    if (typeof data.collectionId !== 'string' || data.collectionId.trim().length === 0) {
      return { valid: false, error: 'collectionId is required' };
    }
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      return { valid: false, error: 'Name is required' };
    }
    return { valid: true };
  }

  // Import operations
  if (
    channel === IPC_CHANNELS.IMPORT_POSTMAN_COLLECTION ||
    channel === IPC_CHANNELS.IMPORT_POSTMAN_ENVIRONMENT
  ) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object' };
    }
    return { valid: true };
  }

  // ID based lookups/deletions
  if (
    channel === IPC_CHANNELS.WORKSPACE_GET ||
    channel === IPC_CHANNELS.WORKSPACE_DELETE ||
    channel === IPC_CHANNELS.COLLECTION_GET ||
    channel === IPC_CHANNELS.COLLECTION_DELETE ||
    channel === IPC_CHANNELS.COLLECTION_LIST ||
    channel === IPC_CHANNELS.FOLDER_LIST ||
    channel === IPC_CHANNELS.FOLDER_DELETE ||
    channel === IPC_CHANNELS.ENVIRONMENT_LIST ||
    channel === IPC_CHANNELS.ENVIRONMENT_DELETE ||
    channel === IPC_CHANNELS.EXPORT_POSTMAN_COLLECTION ||
    channel === IPC_CHANNELS.EXPORT_POSTMAN_ENVIRONMENT ||
    channel === IPC_CHANNELS.REQUEST_LIST_BY_COLLECTION
  ) {
    if (typeof payload !== 'string' || payload.trim().length === 0) {
      return { valid: false, error: 'Payload must be a non-empty ID string' };
    }
    return { valid: true };
  }

  // Phase 6: OpenAPI & Mock & Docs
  if (channel === IPC_CHANNELS.IMPORT_OPENAPI) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object with workspaceId and content' };
    }
    const data = payload as { workspaceId?: unknown; content?: unknown };
    if (typeof data.workspaceId !== 'string' || !data.workspaceId.trim()) {
      return { valid: false, error: 'workspaceId is required' };
    }
    if (typeof data.content !== 'string' || !data.content.trim()) {
      return { valid: false, error: 'content is required' };
    }
    return { valid: true };
  }

  if (channel === IPC_CHANNELS.DOCS_GENERATE_HTML) {
    if (typeof payload !== 'string' && (!payload || typeof (payload as any).collectionId !== 'string')) {
      return { valid: false, error: 'collectionId is required' };
    }
    return { valid: true };
  }

  if (channel === IPC_CHANNELS.CODE_GENERATE_SNIPPET) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Payload must be an object' };
    }
    const data = payload as { request?: unknown; language?: unknown };
    if (!data.request || typeof data.request !== 'object') {
      return { valid: false, error: 'request is required' };
    }
    if (typeof data.language !== 'string') {
      return { valid: false, error: 'language is required' };
    }
    return { valid: true };
  }

  // Phase 7: GraphQL, WebSocket, MQTT
  if (channel === IPC_CHANNELS.GRAPHQL_EXECUTE) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Payload must be an object' };
    const data = payload as { url?: unknown; query?: unknown };
    if (typeof data.url !== 'string' || !data.url.trim()) return { valid: false, error: 'url is required' };
    if (typeof data.query !== 'string' || !data.query.trim()) return { valid: false, error: 'query is required' };
    return { valid: true };
  }

  if (channel === IPC_CHANNELS.GRAPHQL_INTROSPECT) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Payload must be an object' };
    const data = payload as { url?: unknown };
    if (typeof data.url !== 'string' || !data.url.trim()) return { valid: false, error: 'url is required' };
    return { valid: true };
  }

  if (channel === IPC_CHANNELS.WEBSOCKET_CONNECT) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Payload must be an object' };
    const data = payload as { connectionId?: unknown; url?: unknown };
    if (typeof data.connectionId !== 'string' || !data.connectionId.trim()) return { valid: false, error: 'connectionId is required' };
    if (typeof data.url !== 'string' || !data.url.trim()) return { valid: false, error: 'url is required' };
    return { valid: true };
  }

  if (channel === IPC_CHANNELS.WEBSOCKET_SEND) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Payload must be an object' };
    const data = payload as { connectionId?: unknown; data?: unknown };
    if (typeof data.connectionId !== 'string') return { valid: false, error: 'connectionId is required' };
    if (typeof data.data !== 'string') return { valid: false, error: 'data is required' };
    return { valid: true };
  }

  // Phase 9: Proxy
  if (channel === IPC_CHANNELS.PROXY_SAVE_TO_COLLECTION) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Payload must be an object' };
    const data = payload as { trafficId?: unknown; collectionId?: unknown };
    if (typeof data.trafficId !== 'string' || !data.trafficId.trim()) return { valid: false, error: 'trafficId is required' };
    if (typeof data.collectionId !== 'string' || !data.collectionId.trim()) return { valid: false, error: 'collectionId is required' };
    return { valid: true };
  }

  // Phase 9: Git Diff & Versioning
  if (channel === IPC_CHANNELS.GIT_DIFF_REQUESTS) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Payload must be an object' };
    const data = payload as { before?: unknown; after?: unknown };
    if (!data.before || typeof data.before !== 'object') return { valid: false, error: 'before request is required' };
    if (!data.after || typeof data.after !== 'object') return { valid: false, error: 'after request is required' };
    return { valid: true };
  }

  if (channel === IPC_CHANNELS.GIT_EXPORT_REPO) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Payload must be an object' };
    const data = payload as { collectionId?: unknown; outputDir?: unknown };
    if (typeof data.collectionId !== 'string' || !data.collectionId.trim()) return { valid: false, error: 'collectionId is required' };
    if (typeof data.outputDir !== 'string' || !data.outputDir.trim()) return { valid: false, error: 'outputDir is required' };
    return { valid: true };
  }

  // Phase 9: AI Assistant
  if (channel === IPC_CHANNELS.AI_BUILD_REQUEST) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Payload must be an object' };
    const data = payload as { prompt?: unknown };
    if (typeof data.prompt !== 'string' || !data.prompt.trim()) return { valid: false, error: 'prompt is required' };
    return { valid: true };
  }

  if (channel === IPC_CHANNELS.AI_GENERATE_TESTS) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Payload must be an object' };
    const data = payload as { response?: unknown };
    if (!data.response || typeof data.response !== 'object') return { valid: false, error: 'response object is required' };
    return { valid: true };
  }

  if (channel === IPC_CHANNELS.AI_GENERATE_DOCS) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Payload must be an object' };
    const data = payload as { request?: unknown };
    if (!data.request || typeof data.request !== 'object') return { valid: false, error: 'request object is required' };
    return { valid: true };
  }

  return { valid: true };
}
