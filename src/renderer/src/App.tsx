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
import { CiWorkflowModal } from './components/ci/CiWorkflowModal';
import { ProxyModal } from './components/proxy/ProxyModal';
import { GitDiffModal } from './components/git/GitDiffModal';
import { AiAssistantModal } from './components/ai/AiAssistantModal';

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
  const [ciModalOpen, setCiModalOpen] = useState<boolean>(false);
  const [ciCollectionId, setCiCollectionId] = useState<string | undefined>(undefined);
  const [proxyModalOpen, setProxyModalOpen] = useState<boolean>(false);
  const [gitDiffModalOpen, setGitDiffModalOpen] = useState<boolean>(false);
  const [gitDiffCollectionId, setGitDiffCollectionId] = useState<string | undefined>(undefined);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);

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
          onOpenCiWorkflow={(id) => {
            setCiCollectionId(id);
            setCiModalOpen(true);
          }}
          onOpenProxy={() => setProxyModalOpen(true)}
          onOpenGitDiff={(id) => {
            setGitDiffCollectionId(id);
            setGitDiffModalOpen(true);
          }}
          onOpenAi={() => setAiModalOpen(true)}
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
          onOpenCiWorkflow={(id) => {
            setCiCollectionId(id);
            setCiModalOpen(true);
          }}
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

      {/* 11. Phase 8: CI/CD Workflow Generator Modal */}
      <CiWorkflowModal
        isOpen={ciModalOpen}
        onClose={() => setCiModalOpen(false)}
        defaultCollectionId={ciCollectionId}
      />

      {/* 12. Phase 9: Traffic Proxy Modal */}
      <ProxyModal
        isOpen={proxyModalOpen}
        onClose={() => setProxyModalOpen(false)}
      />

      {/* 13. Phase 9: Git Diff & Versioning Modal */}
      <GitDiffModal
        isOpen={gitDiffModalOpen}
        onClose={() => setGitDiffModalOpen(false)}
        defaultCollectionId={gitDiffCollectionId}
      />

      {/* 14. Phase 9: AI Assistant Modal */}
      <AiAssistantModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />
    </div>
  );
};

export default App;
