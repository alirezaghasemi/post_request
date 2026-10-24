import { create } from 'zustand';
import type {
  Workspace,
  Collection,
  Folder,
  Environment,
  RequestItem,
  SystemStatus,
  AppSettings,
  HistoryItem,
  HttpRequestExecutionPayload,
  HttpResponseData
} from '@shared/types';

export interface TabItem {
  id: string;
  type: 'request' | 'overview' | 'settings';
  title: string;
  method?: string;
  url?: string;
  isDirty?: boolean;
  requestId?: string;
  preScript?: string;
  testScript?: string;
}

interface AppState {
  // Theme & Settings
  theme: 'dark' | 'light';
  settings: AppSettings | null;
  systemStatus: SystemStatus | null;
  loading: boolean;
  error: string | null;

  // Workspaces
  workspaces: Workspace[];
  activeWorkspaceId: string | null;

  // Collections & Requests
  collections: Collection[];
  foldersByCollection: Record<string, Folder[]>;
  requestsByCollection: Record<string, RequestItem[]>;

  // History
  history: HistoryItem[];

  // HTTP Execution State (per request tab)
  activeResponses: Record<string, HttpResponseData | null>;
  executingRequests: Record<string, boolean>;

  // Environments
  environments: Environment[];
  activeEnvironmentId: string | null;

  // Tabs
  tabs: TabItem[];
  activeTabId: string;

  // Actions
  init: () => Promise<void>;
  setTheme: (theme: 'dark' | 'light') => Promise<void>;
  setActiveWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<void>;
  createCollection: (name: string, description?: string) => Promise<void>;
  createFolder: (collectionId: string, name: string, parentFolderId?: string) => Promise<void>;
  createRequest: (data: Partial<RequestItem> & { name: string; method: string; url: string; collectionId?: string; folderId?: string }) => Promise<void>;
  setActiveEnvironment: (id: string | null) => Promise<void>;
  createEnvironment: (name: string) => Promise<void>;
  updateEnvironment: (id: string, data: Partial<Pick<Environment, 'name' | 'variables' | 'isActive'>>) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  importPostmanData: (json: any) => Promise<{ type: 'collection' | 'environment'; name: string }>;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  executeRequest: (payload: HttpRequestExecutionPayload) => Promise<HttpResponseData>;
  cancelRequest: (requestId: string) => Promise<boolean>;
  openTab: (tab: TabItem) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'dark',
  settings: null,
  systemStatus: null,
  loading: true,
  error: null,

  workspaces: [],
  activeWorkspaceId: null,

  collections: [],
  foldersByCollection: {},
  requestsByCollection: {},

  history: [],
  activeResponses: {},
  executingRequests: {},

  environments: [],
  activeEnvironmentId: null,

  tabs: [
    {
      id: 'tab-overview',
      type: 'overview',
      title: 'Overview'
    }
  ],
  activeTabId: 'tab-overview',

  init: async () => {
    set({ loading: true, error: null });
    try {
      if (!window.electronAPI) {
        console.warn('window.electronAPI not found (running in browser mode)');
        set({ loading: false });
        return;
      }

      const [status, settings, workspaces] = await Promise.all([
        window.electronAPI.system.getStatus(),
        window.electronAPI.system.getSettings(),
        window.electronAPI.workspaces.list()
      ]);

      const initialWorkspaceId = workspaces.length > 0 ? workspaces[0].id : null;
      let collections: Collection[] = [];
      let environments: Environment[] = [];

      if (initialWorkspaceId) {
        [collections, environments] = await Promise.all([
          window.electronAPI.collections.list(initialWorkspaceId),
          window.electronAPI.environments.list(initialWorkspaceId)
        ]);
      }

      const currentTheme = settings.theme === 'light' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', currentTheme === 'dark');
      document.documentElement.classList.toggle('light', currentTheme === 'light');

      let history: HistoryItem[] = [];
      if (initialWorkspaceId) {
        history = await window.electronAPI.history.list(initialWorkspaceId);
      }

      set({
        systemStatus: status,
        settings,
        theme: currentTheme,
        workspaces,
        activeWorkspaceId: initialWorkspaceId,
        collections,
        environments,
        history,
        loading: false
      });
    } catch (err) {
      console.error('Failed to initialize app state:', err);
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  setTheme: async (theme) => {
    set({ theme });
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');

    if (window.electronAPI) {
      await window.electronAPI.system.updateSettings({ theme });
    }
  },

  setActiveWorkspace: async (id) => {
    set({ activeWorkspaceId: id, loading: true });
    try {
      if (window.electronAPI) {
        const [collections, environments, history] = await Promise.all([
          window.electronAPI.collections.list(id),
          window.electronAPI.environments.list(id),
          window.electronAPI.history.list(id)
        ]);
        set({ collections, environments, history, loading: false });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false });
    }
  },

  createWorkspace: async (name, description) => {
    if (!window.electronAPI) return;
    const newWs = await window.electronAPI.workspaces.create({ name, description });
    set((state) => ({
      workspaces: [...state.workspaces, newWs],
      activeWorkspaceId: newWs.id
    }));
    await get().setActiveWorkspace(newWs.id);
  },

  createCollection: async (name, description) => {
    const { activeWorkspaceId } = get();
    if (!window.electronAPI || !activeWorkspaceId) return;

    const newCol = await window.electronAPI.collections.create({
      workspaceId: activeWorkspaceId,
      name,
      description
    });

    set((state) => ({
      collections: [...state.collections, newCol]
    }));
  },

  createFolder: async (collectionId, name, parentFolderId) => {
    if (!window.electronAPI) return;
    const folder = await window.electronAPI.folders.create({
      collectionId,
      name,
      parentFolderId
    });
    set((state) => ({
      foldersByCollection: {
        ...state.foldersByCollection,
        [collectionId]: [...(state.foldersByCollection[collectionId] || []), folder]
      }
    }));
  },

  setActiveEnvironment: async (id) => {
    set({ activeEnvironmentId: id });
    if (!window.electronAPI) return;
    const { environments } = get();
    for (const env of environments) {
      const isTarget = env.id === id;
      if (env.isActive !== isTarget) {
        await window.electronAPI.environments.update(env.id, { isActive: isTarget });
      }
    }
    set((state) => ({
      environments: state.environments.map((e) => ({
        ...e,
        isActive: e.id === id
      }))
    }));
  },

  createEnvironment: async (name) => {
    const { activeWorkspaceId } = get();
    if (!window.electronAPI || !activeWorkspaceId) return;
    const newEnv = await window.electronAPI.environments.create({
      workspaceId: activeWorkspaceId,
      name
    });
    set((state) => ({
      environments: [...state.environments, newEnv]
    }));
  },

  updateEnvironment: async (id, data) => {
    if (!window.electronAPI) return;
    const updated = await window.electronAPI.environments.update(id, data);
    set((state) => ({
      environments: state.environments.map((e) => (e.id === id ? updated : e))
    }));
  },

  deleteEnvironment: async (id) => {
    if (!window.electronAPI) return;
    await window.electronAPI.environments.delete(id);
    set((state) => ({
      environments: state.environments.filter((e) => e.id !== id),
      activeEnvironmentId: state.activeEnvironmentId === id ? null : state.activeEnvironmentId
    }));
  },

  importPostmanData: async (json) => {
    const { activeWorkspaceId } = get();
    if (!window.electronAPI || !activeWorkspaceId) {
      throw new Error('No active workspace selected');
    }

    if (json.info && (json.info.schema || json.item)) {
      // Collection import
      const report = await window.electronAPI.importExport.importCollection(json, activeWorkspaceId);
      await get().setActiveWorkspace(activeWorkspaceId);
      return { type: 'collection', name: report.collection.name };
    } else if (json.values || json._postman_variable_scope === 'environment') {
      // Environment import
      const env = await window.electronAPI.importExport.importEnvironment(json, activeWorkspaceId);
      await get().setActiveWorkspace(activeWorkspaceId);
      return { type: 'environment', name: env.name };
    } else {
      throw new Error('Unrecognized Postman data format (must be Collection v2.x or Environment)');
    }
  },

  createRequest: async (data) => {
    if (!window.electronAPI) return;
    const req = await window.electronAPI.requests.create(data);
    const colId = data.collectionId || 'unassigned';

    set((state) => ({
      requestsByCollection: {
        ...state.requestsByCollection,
        [colId]: [...(state.requestsByCollection[colId] || []), req]
      }
    }));

    get().openTab({
      id: `req-${req.id}`,
      type: 'request',
      title: req.name,
      method: req.method,
      url: req.url,
      requestId: req.id
    });
  },

  loadHistory: async () => {
    const { activeWorkspaceId } = get();
    if (!window.electronAPI || !activeWorkspaceId) return;
    try {
      const history = await window.electronAPI.history.list(activeWorkspaceId);
      set({ history });
    } catch (err) {
      console.warn('Failed to load history:', err);
    }
  },

  clearHistory: async () => {
    const { activeWorkspaceId } = get();
    if (!window.electronAPI || !activeWorkspaceId) return;
    await window.electronAPI.history.clear(activeWorkspaceId);
    set({ history: [] });
  },

  executeRequest: async (payload) => {
    const { activeWorkspaceId } = get();
    const requestId = payload.requestId;

    set((state) => ({
      executingRequests: { ...state.executingRequests, [requestId]: true },
      activeResponses: { ...state.activeResponses, [requestId]: null }
    }));

    try {
      const response = await window.electronAPI.http.execute({
        ...payload,
        workspaceId: activeWorkspaceId
      });

      set((state) => ({
        activeResponses: { ...state.activeResponses, [requestId]: response },
        executingRequests: { ...state.executingRequests, [requestId]: false }
      }));

      // Refresh history
      get().loadHistory();

      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorResponse: HttpResponseData = {
        requestId,
        status: 0,
        statusText: 'Error',
        timeMs: 0,
        sizeBytes: 0,
        headers: {},
        cookies: [],
        body: '',
        contentType: 'text/plain',
        isTruncated: false,
        error: errorMsg
      };

      set((state) => ({
        activeResponses: { ...state.activeResponses, [requestId]: errorResponse },
        executingRequests: { ...state.executingRequests, [requestId]: false }
      }));

      throw err;
    }
  },

  cancelRequest: async (requestId) => {
    if (!window.electronAPI) return false;
    const cancelled = await window.electronAPI.http.cancel(requestId);
    set((state) => ({
      executingRequests: { ...state.executingRequests, [requestId]: false }
    }));
    return cancelled;
  },

  openTab: (tab) => {
    const { tabs } = get();
    const existing = tabs.find((t) => t.id === tab.id);
    if (!existing) {
      set({ tabs: [...tabs, tab], activeTabId: tab.id });
    } else {
      set({ activeTabId: tab.id });
    }
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) return; // Keep at least one tab

    const newTabs = tabs.filter((t) => t.id !== tabId);
    let nextActiveId = activeTabId;

    if (activeTabId === tabId) {
      const closedIndex = tabs.findIndex((t) => t.id === tabId);
      const nextIndex = Math.max(0, closedIndex - 1);
      nextActiveId = newTabs[nextIndex].id;
    }

    set({ tabs: newTabs, activeTabId: nextActiveId });
  },

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
  }
}));
