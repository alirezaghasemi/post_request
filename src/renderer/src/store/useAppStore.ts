import { create } from 'zustand';
import type {
  Workspace,
  Collection,
  Environment,
  RequestItem,
  SystemStatus,
  AppSettings
} from '@shared/types';

export interface TabItem {
  id: string;
  type: 'request' | 'overview' | 'settings';
  title: string;
  method?: string;
  isDirty?: boolean;
  requestId?: string;
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
  requestsByCollection: Record<string, RequestItem[]>;

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
  createRequest: (data: { name: string; method: string; url: string; collectionId?: string }) => Promise<void>;
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
  requestsByCollection: {},

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

      set({
        systemStatus: status,
        settings,
        theme: currentTheme,
        workspaces,
        activeWorkspaceId: initialWorkspaceId,
        collections,
        environments,
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
        const [collections, environments] = await Promise.all([
          window.electronAPI.collections.list(id),
          window.electronAPI.environments.list(id)
        ]);
        set({ collections, environments, loading: false });
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
      requestId: req.id
    });
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
