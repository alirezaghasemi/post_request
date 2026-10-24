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

  // Folders
  FOLDER_LIST: 'folder:list',
  FOLDER_CREATE: 'folder:create',
  FOLDER_DELETE: 'folder:delete',

  // Environments
  ENVIRONMENT_LIST: 'environment:list',
  ENVIRONMENT_GET: 'environment:get',
  ENVIRONMENT_CREATE: 'environment:create',
  ENVIRONMENT_UPDATE: 'environment:update',
  ENVIRONMENT_DELETE: 'environment:delete',

  // Import / Export
  IMPORT_POSTMAN_COLLECTION: 'import:postman-collection',
  EXPORT_POSTMAN_COLLECTION: 'export:postman-collection',
  IMPORT_POSTMAN_ENVIRONMENT: 'import:postman-environment',
  EXPORT_POSTMAN_ENVIRONMENT: 'export:postman-environment',

  // Variables
  VARIABLE_RESOLVE: 'variable:resolve',

  // Requests
  REQUEST_LIST_BY_COLLECTION: 'request:list-by-collection',
  REQUEST_GET: 'request:get',
  REQUEST_CREATE: 'request:create',
  REQUEST_UPDATE: 'request:update',
  REQUEST_DELETE: 'request:delete',

  // HTTP Network Execution
  HTTP_EXECUTE: 'http:execute',
  HTTP_CANCEL: 'http:cancel',

  // History
  HISTORY_LIST: 'history:list',
  HISTORY_CLEAR: 'history:clear',

  // Scripting
  SCRIPT_RUN: 'script:run',

  // Advanced Auth
  AUTH_OAUTH2_GENERATE_PKCE: 'auth:oauth2:generate-pkce',
  AUTH_OAUTH2_GET_TOKEN: 'auth:oauth2:get-token',

  // Vault
  VAULT_ENCRYPT: 'vault:encrypt',
  VAULT_DECRYPT: 'vault:decrypt',
  VAULT_MASK: 'vault:mask',

  // Collection Runner
  RUNNER_START: 'runner:start',
  RUNNER_CANCEL: 'runner:cancel',
  RUNNER_PARSE_DATA: 'runner:parse-data',
  RUNNER_EXPORT_REPORT: 'runner:export-report',

  // OpenAPI Import
  IMPORT_OPENAPI: 'import:openapi',

  // Mock Server
  MOCK_SERVER_START: 'mock:server:start',
  MOCK_SERVER_STOP: 'mock:server:stop',
  MOCK_SERVER_STATUS: 'mock:server:status',
  MOCK_SERVER_SET_ROUTES: 'mock:server:set-routes',
  MOCK_SERVER_GET_LOGS: 'mock:server:get-logs',

  // Documentation & Code Snippets
  DOCS_GENERATE_HTML: 'docs:generate-html',
  CODE_GENERATE_SNIPPET: 'code:generate-snippet',

  // Phase 7: GraphQL
  GRAPHQL_EXECUTE: 'graphql:execute',
  GRAPHQL_INTROSPECT: 'graphql:introspect',

  // Phase 7: WebSocket
  WEBSOCKET_CONNECT: 'websocket:connect',
  WEBSOCKET_SEND: 'websocket:send',
  WEBSOCKET_DISCONNECT: 'websocket:disconnect',
  WEBSOCKET_GET_STATUS: 'websocket:get-status',
  WEBSOCKET_GET_HISTORY: 'websocket:get-history',
  WEBSOCKET_CLEAR_HISTORY: 'websocket:clear-history',

  // Phase 7: MQTT
  MQTT_CONNECT: 'mqtt:connect',
  MQTT_SUBSCRIBE: 'mqtt:subscribe',
  MQTT_UNSUBSCRIBE: 'mqtt:unsubscribe',
  MQTT_PUBLISH: 'mqtt:publish',
  MQTT_DISCONNECT: 'mqtt:disconnect',
  MQTT_GET_HISTORY: 'mqtt:get-history',

  // Phase 9: Proxy
  PROXY_START: 'proxy:start',
  PROXY_STOP: 'proxy:stop',
  PROXY_STATUS: 'proxy:status',
  PROXY_CLEAR: 'proxy:clear',
  PROXY_GET_TRAFFIC: 'proxy:get-traffic',
  PROXY_SAVE_TO_COLLECTION: 'proxy:save-to-collection',

  // Phase 9: Git Diff & Versioning
  GIT_DIFF_REQUESTS: 'git:diff-requests',
  GIT_EXPORT_REPO: 'git:export-repo',

  // Phase 9: AI Assistant
  AI_BUILD_REQUEST: 'ai:build-request',
  AI_GENERATE_TESTS: 'ai:generate-tests',
  AI_GENERATE_DOCS: 'ai:generate-docs',
  AI_GET_CONFIG: 'ai:get-config',
  AI_SET_CONFIG: 'ai:set-config',

  // Window Controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
