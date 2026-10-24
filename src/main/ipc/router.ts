import { ipcMain, type BrowserWindow, app } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { IpcResponse, SystemStatus } from '../../shared/types';
import { validateIpcPayload } from './validator';
import type { DatabaseManager } from '../database/database-manager';

export function registerIpcHandlers(dbManager: DatabaseManager, getMainWindow: () => BrowserWindow | null): void {
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

  // Environments
  handle(IPC_CHANNELS.ENVIRONMENT_LIST, (workspaceId: string) => {
    return dbManager.getEnvironments(workspaceId);
  });

  handle(IPC_CHANNELS.ENVIRONMENT_CREATE, (data: { workspaceId: string; name: string }) => {
    return dbManager.createEnvironment(data);
  });

  // Requests
  handle(IPC_CHANNELS.REQUEST_LIST_BY_COLLECTION, (collectionId: string) => {
    return dbManager.getRequestsByCollection(collectionId);
  });

  handle(IPC_CHANNELS.REQUEST_CREATE, (data: any) => {
    return dbManager.createRequest(data);
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
