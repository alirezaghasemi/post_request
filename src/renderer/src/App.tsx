import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { TabBar } from './components/layout/TabBar';
import { StatusBar } from './components/layout/StatusBar';
import { WelcomeView } from './components/dashboard/WelcomeView';
import { RequestEditor } from './components/request/RequestEditor';
import { SettingsView } from './components/settings/SettingsView';
import { EnvironmentManager } from './components/environment/EnvironmentManager';

export const App: React.FC = () => {
  const { init, tabs, activeTabId, loading, error } = useAppStore();

  useEffect(() => {
    init();
  }, [init]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* 1. Custom TitleBar with window controls */}
      <TitleBar />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Center/Right Workspace Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/30">
          <TabBar />

          <main className="flex-1 flex overflow-hidden">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading DevPilot Studio...</span>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center text-xs text-red-400 p-4">
                <span>Initialization Error: {error}</span>
              </div>
            ) : activeTab?.id === 'tab-environments' ? (
              <EnvironmentManager />
            ) : activeTab?.type === 'settings' ? (
              <SettingsView />
            ) : activeTab?.type === 'request' ? (
              <RequestEditor tab={activeTab} />
            ) : (
              <WelcomeView />
            )}
          </main>
        </div>
      </div>

      {/* 3. Bottom Status Bar */}
      <StatusBar />
    </div>
  );
};

export default App;
