import React, { useState, useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { TabBar } from './components/layout/TabBar';
import { StatusBar } from './components/layout/StatusBar';
import { WelcomeView } from './components/dashboard/WelcomeView';
import { RequestEditor } from './components/request/RequestEditor';
import { SettingsView } from './components/settings/SettingsView';
import { EnvironmentManager } from './components/environment/EnvironmentManager';
import { CollectionRunnerModal } from './components/runner/CollectionRunnerModal';
import { OpenApiImportModal } from './components/importer/OpenApiImportModal';
import { MockServerModal } from './components/mock/MockServerModal';
import { DocsExportModal } from './components/docs/DocsExportModal';
import { GraphQLModal } from './components/protocols/GraphQLModal';
import { WebSocketModal } from './components/protocols/WebSocketModal';
import { MqttModal } from './components/protocols/MqttModal';

export const App: React.FC = () => {
  const { init, tabs, activeTabId, loading, error } = useAppStore();
  const [runnerCollectionId, setRunnerCollectionId] = useState<string | null>(null);
  const [docsCollectionId, setDocsCollectionId] = useState<string | null>(null);
  const [mockModalOpen, setMockModalOpen] = useState<boolean>(false);
  const [mockCollectionId, setMockCollectionId] = useState<string | undefined>(undefined);
  const [openApiModalOpen, setOpenApiModalOpen] = useState<boolean>(false);
  const [graphqlModalOpen, setGraphqlModalOpen] = useState<boolean>(false);
  const [websocketModalOpen, setWebsocketModalOpen] = useState<boolean>(false);
  const [mqttModalOpen, setMqttModalOpen] = useState<boolean>(false);

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
        <Sidebar
          onRunCollection={(id) => setRunnerCollectionId(id)}
          onViewDocs={(id) => setDocsCollectionId(id)}
          onOpenMock={(id) => {
            setMockCollectionId(id);
            setMockModalOpen(true);
          }}
          onOpenOpenApiImport={() => setOpenApiModalOpen(true)}
          onOpenGraphQL={() => setGraphqlModalOpen(true)}
          onOpenWebSocket={() => setWebsocketModalOpen(true)}
          onOpenMqtt={() => setMqttModalOpen(true)}
        />

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

      {/* 4. Collection Runner Modal */}
      {runnerCollectionId && (
        <CollectionRunnerModal
          collectionId={runnerCollectionId}
          isOpen={Boolean(runnerCollectionId)}
          onClose={() => setRunnerCollectionId(null)}
        />
      )}

      {/* 5. Phase 6: OpenAPI Importer Modal */}
      <OpenApiImportModal
        isOpen={openApiModalOpen}
        onClose={() => setOpenApiModalOpen(false)}
      />

      {/* 6. Phase 6: Mock Server Modal */}
      <MockServerModal
        isOpen={mockModalOpen}
        initialCollectionId={mockCollectionId}
        onClose={() => setMockModalOpen(false)}
      />

      {/* 7. Phase 6: Interactive Docs Export Modal */}
      {docsCollectionId && (
        <DocsExportModal
          collectionId={docsCollectionId}
          isOpen={Boolean(docsCollectionId)}
          onClose={() => setDocsCollectionId(null)}
        />
      )}

      {/* 8. Phase 7: GraphQL Modal */}
      <GraphQLModal
        isOpen={graphqlModalOpen}
        onClose={() => setGraphqlModalOpen(false)}
      />

      {/* 9. Phase 7: WebSocket Modal */}
      <WebSocketModal
        isOpen={websocketModalOpen}
        onClose={() => setWebsocketModalOpen(false)}
      />

      {/* 10. Phase 7: MQTT Modal */}
      <MqttModal
        isOpen={mqttModalOpen}
        onClose={() => setMqttModalOpen(false)}
      />
    </div>
  );
};

export default App;
