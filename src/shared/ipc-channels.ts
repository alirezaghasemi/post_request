export const IPC_CHANNELS = {
  // System & Health
  SYSTEM_GET_STATUS: 'system:get-status',
  SYSTEM_GET_SETTINGS: 'system:get-settings',
  SYSTEM_UPDATE_SETTINGS: 'system:update-settings',

  // Workspaces
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_GET: 'workspace:get',
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_UPDATE: 'workspace:update',
  WORKSPACE_DELETE: 'workspace:delete',

  // Collections
  COLLECTION_LIST: 'collection:list',
  COLLECTION_GET: 'collection:get',
  COLLECTION_CREATE: 'collection:create',
  COLLECTION_UPDATE: 'collection:update',
  COLLECTION_DELETE: 'collection:delete',

  // Environments
  ENVIRONMENT_LIST: 'environment:list',
  ENVIRONMENT_GET: 'environment:get',
  ENVIRONMENT_CREATE: 'environment:create',
  ENVIRONMENT_UPDATE: 'environment:update',
  ENVIRONMENT_DELETE: 'environment:delete',

  // Requests
  REQUEST_LIST_BY_COLLECTION: 'request:list-by-collection',
  REQUEST_GET: 'request:get',
  REQUEST_CREATE: 'request:create',
  REQUEST_UPDATE: 'request:update',
  REQUEST_DELETE: 'request:delete',

  // Window Controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
