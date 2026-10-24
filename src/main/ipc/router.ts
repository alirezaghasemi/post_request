import { ipcMain, type BrowserWindow, app } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { IpcResponse, SystemStatus } from '../../shared/types';
import { validateIpcPayload } from './validator';
import type { DatabaseManager } from '../database/database-manager';
import { HttpClientEngine } from '../network/http-client';
import { VariableResolver } from '../variables/resolver';
import { PostmanImporter } from '../importers/postman-importer';
import { PostmanExporter } from '../exporters/postman-exporter';

export function registerIpcHandlers(
  dbManager: DatabaseManager,
  httpClient: HttpClientEngine,
  getMainWindow: () => BrowserWindow | null
): void {
  const variableResolver = new VariableResolver();
  const postmanImporter = new PostmanImporter();
  const postmanExporter = new PostmanExporter();
  // Helper to wrap handlers in try/catch and payload validation
  function handle<TPayload, TResult>(
    channel: string,
    handler: (payload: TPayload) => Promise<TResult> | TResult
  ): void {
    ipcMain.handle(channel, async (_event, payload: TPayload): Promise<IpcResponse<TResult>> => {
      try {
        const validation = validateIpcPayload(channel as any, payload);
        if (!validation.valid) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: validation.error || 'Invalid payload'
            }
          };
        }

        const data = await handler(payload);
        return {
          success: true,
          data
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[IPC Error] [${channel}]:`, message);
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message
          }
        };
      }
    });
  }

  // System & Status
  handle(IPC_CHANNELS.SYSTEM_GET_STATUS, (): SystemStatus => {
    return {
      version: app.getVersion() || '0.1.0',
      platform: process.platform,
      databaseConnected: dbManager.isConnected(),
      databasePath: dbManager.getDatabasePath(),
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron
    };
  });

  handle(IPC_CHANNELS.SYSTEM_GET_SETTINGS, () => {
    return dbManager.getSettings();
  });

  handle(IPC_CHANNELS.SYSTEM_UPDATE_SETTINGS, (settings: Record<string, string>) => {
    for (const [key, value] of Object.entries(settings)) {
      dbManager.updateSetting(key, String(value));
    }
    return dbManager.getSettings();
  });

  // Workspaces
  handle(IPC_CHANNELS.WORKSPACE_LIST, () => {
    return dbManager.getWorkspaces();
  });

  handle(IPC_CHANNELS.WORKSPACE_GET, (id: string) => {
    return dbManager.getWorkspace(id);
  });

  handle(IPC_CHANNELS.WORKSPACE_CREATE, (data: { name: string; description?: string }) => {
    return dbManager.createWorkspace(data);
  });

  handle(IPC_CHANNELS.WORKSPACE_UPDATE, ({ id, ...data }: { id: string; name?: string; description?: string }) => {
    return dbManager.updateWorkspace(id, data);
  });

  handle(IPC_CHANNELS.WORKSPACE_DELETE, (id: string) => {
    return dbManager.deleteWorkspace(id);
  });

  // Collections
  handle(IPC_CHANNELS.COLLECTION_LIST, (workspaceId: string) => {
    return dbManager.getCollections(workspaceId);
  });

  handle(IPC_CHANNELS.COLLECTION_CREATE, (data: {
    workspaceId: string;
    name: string;
    description?: string;
  }) => {
    return dbManager.createCollection(data);
  });

  handle(IPC_CHANNELS.COLLECTION_DELETE, (id: string) => {
    return dbManager.deleteCollection(id);
  });

  // Folders
  handle(IPC_CHANNELS.FOLDER_LIST, (collectionId: string) => {
    return dbManager.getFolders(collectionId);
  });

  handle(IPC_CHANNELS.FOLDER_CREATE, (data: { collectionId: string; parentFolderId?: string; name: string }) => {
    return dbManager.createFolder(data);
  });

  handle(IPC_CHANNELS.FOLDER_DELETE, (id: string) => {
    return dbManager.deleteFolder(id);
  });

  // Environments
  handle(IPC_CHANNELS.ENVIRONMENT_LIST, (workspaceId: string) => {
    return dbManager.getEnvironments(workspaceId);
  });

  handle(IPC_CHANNELS.ENVIRONMENT_CREATE, (data: { workspaceId: string; name: string }) => {
    return dbManager.createEnvironment(data);
  });

  handle(IPC_CHANNELS.ENVIRONMENT_UPDATE, ({ id, ...data }: any) => {
    return dbManager.updateEnvironment(id, data);
  });

  handle(IPC_CHANNELS.ENVIRONMENT_DELETE, (id: string) => {
    return dbManager.deleteEnvironment(id);
  });

  // Import / Export Postman
  handle(IPC_CHANNELS.IMPORT_POSTMAN_COLLECTION, ({ json, workspaceId }: { json: any; workspaceId: string }) => {
    const report = postmanImporter.importCollection(json, workspaceId);
    dbManager.saveImportedCollection(report.collection, report.folders, report.requests);
    return report;
  });

  handle(IPC_CHANNELS.EXPORT_POSTMAN_COLLECTION, (collectionId: string) => {
    const collection = dbManager.getCollection(collectionId);
    if (!collection) throw new Error('Collection not found');
    const folders = dbManager.getFolders(collectionId);
    const requests = dbManager.getRequestsByCollection(collectionId);
    return postmanExporter.exportCollection(collection, folders, requests);
  });

  handle(IPC_CHANNELS.IMPORT_POSTMAN_ENVIRONMENT, ({ json, workspaceId }: { json: any; workspaceId: string }) => {
    const env = postmanImporter.importEnvironment(json, workspaceId);
    return dbManager.createEnvironment({
      workspaceId,
      name: env.name,
      variables: env.variables
    });
  });

  handle(IPC_CHANNELS.EXPORT_POSTMAN_ENVIRONMENT, (environmentId: string) => {
    const env = dbManager.getEnvironment(environmentId);
    if (!env) throw new Error('Environment not found');
    return postmanExporter.exportEnvironment(env);
  });

  // Variable Resolution Helper
  handle(IPC_CHANNELS.VARIABLE_RESOLVE, ({ template, context }: { template: string; context: any }) => {
    return variableResolver.resolveWithDiagnostics(template, context);
  });

  // Requests
  handle(IPC_CHANNELS.REQUEST_LIST_BY_COLLECTION, (collectionId: string) => {
    return dbManager.getRequestsByCollection(collectionId);
  });

  handle(IPC_CHANNELS.REQUEST_CREATE, (data: any) => {
    return dbManager.createRequest(data);
  });

  // HTTP Execution Engine with Variable Resolution
  handle(IPC_CHANNELS.HTTP_EXECUTE, async (payload: any) => {
    // 1. Resolve variables in payload using active environment and collection variables
    let effectivePayload = payload;
    if (payload.workspaceId) {
      const environments = dbManager.getEnvironments(payload.workspaceId);
      const activeEnv = environments.find((e) => e.isActive);

      let collectionVars: any[] = [];
      if (payload.collectionId) {
        const col = dbManager.getCollection(payload.collectionId);
        if (col?.variables) {
          try {
            collectionVars = JSON.parse(col.variables);
          } catch {
            // Ignored
          }
        }
      }

      effectivePayload = variableResolver.resolvePayload(payload, {
        environment: activeEnv?.variables || [],
        collection: collectionVars,
        request: payload.localVariables || []
      });
    }

    const response = await httpClient.execute(effectivePayload);

    // Record in history
    if (payload.workspaceId) {
      try {
        dbManager.addHistoryEntry({
          workspaceId: payload.workspaceId,
          method: effectivePayload.method,
          url: effectivePayload.url,
          statusCode: response.status,
          timeMs: response.timeMs,
          sizeBytes: response.sizeBytes
        });
      } catch (err) {
        console.warn('Failed to record request history:', err);
      }
    }
    return response;
  });

  handle(IPC_CHANNELS.HTTP_CANCEL, (requestId: string) => {
    return httpClient.cancel(requestId);
  });

  // History
  handle(IPC_CHANNELS.HISTORY_LIST, (workspaceId: string) => {
    return dbManager.getHistory(workspaceId);
  });

  handle(IPC_CHANNELS.HISTORY_CLEAR, (workspaceId: string) => {
    return dbManager.clearHistory(workspaceId);
  });

  // Window Controls
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    const win = getMainWindow();
    if (win?.isMinimizable()) win.minimize();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    const win = getMainWindow();
    if (win?.isMaximizable()) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    const win = getMainWindow();
    if (win) win.close();
  });
}
