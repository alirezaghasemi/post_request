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
    channel === IPC_CHANNELS.WINDOW_CLOSE
  ) {
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

  // ID based lookups/deletions
  if (
    channel === IPC_CHANNELS.WORKSPACE_GET ||
    channel === IPC_CHANNELS.WORKSPACE_DELETE ||
    channel === IPC_CHANNELS.COLLECTION_GET ||
    channel === IPC_CHANNELS.COLLECTION_DELETE ||
    channel === IPC_CHANNELS.COLLECTION_LIST ||
    channel === IPC_CHANNELS.ENVIRONMENT_LIST ||
    channel === IPC_CHANNELS.REQUEST_LIST_BY_COLLECTION
  ) {
    if (typeof payload !== 'string' || payload.trim().length === 0) {
      return { valid: false, error: 'Payload must be a non-empty ID string' };
    }
    return { valid: true };
  }

  return { valid: true };
}
