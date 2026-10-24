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
      invoke(IPC_CHANNELS.EXPORT_POSTMAN_ENVIRONMENT, environmentId)
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

  // Window Controls
  window: {
    minimize: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: (): void => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE)
  }
};

export type ElectronAPI = typeof electronAPI;

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
