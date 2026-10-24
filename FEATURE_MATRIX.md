# DevPilot API Studio — Capability & Feature Matrix

| Feature Domain | Capability | State | Phase | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Platform** | Linux Support | Implemented & Tested | Phase 1 | Verified on Ubuntu 24.04 LTS |
| **Platform** | Windows & macOS Support | Implemented | Phase 1 | Cross-platform Electron architecture |
| **Security** | Context Isolation | Implemented & Tested | Phase 1 | `contextIsolation: true` |
| **Security** | Node Integration in Renderer | Implemented & Tested | Phase 1 | Disabled (`nodeIntegration: false`) |
| **Security** | Content Security Policy | Implemented & Tested | Phase 1 | Configured via session headers |
| **Persistence** | SQLite WAL Persistence | Implemented & Tested | Phase 1 | `better-sqlite3` with migrations |
| **Persistence** | Workspaces Management | Implemented & Tested | Phase 1 | CRUD operations via IPC |
| **Persistence** | Collections Management | Implemented & Tested | Phase 1 | Saved in SQLite database |
| **Persistence** | Environments Management | Implemented & Tested | Phase 1 | Saved in SQLite database |
| **UI** | Custom Frameless TitleBar | Implemented & Tested | Phase 1 | Custom drag region & window buttons |
| **UI** | Left Sidebar Navigation | Implemented & Tested | Phase 1 | Dense developer view |
| **UI** | Multi-Tab Manager | Implemented & Tested | Phase 1 | Request, overview, settings tabs |
| **UI** | Theme Switcher (Dark/Light) | Implemented & Tested | Phase 1 | Persisted to SQLite settings table |
| **HTTP Client**| Request Builder & Sender | Unimplemented | Phase 2 | Scheduled for Phase 2 |
| **HTTP Client**| Response Body Inspector | Unimplemented | Phase 2 | Scheduled for Phase 2 |
| **Scripting**  | Sandboxed `pm.*` API | Unimplemented | Phase 4 | Scheduled for Phase 4 |
| **Runner**     | Collection Test Runner | Unimplemented | Phase 5 | Scheduled for Phase 5 |
| **Specs**      | OpenAPI 3.x Import | Unimplemented | Phase 6 | Scheduled for Phase 6 |
| **Mocking**    | Local HTTP Mock Server | Unimplemented | Phase 6 | Scheduled for Phase 6 |
| **Protocols**  | GraphQL / WS / gRPC / MQTT | Unimplemented | Phase 7 | Scheduled for Phase 7 |
| **Automation** | Headless CLI Runner | Unimplemented | Phase 8 | Scheduled for Phase 8 |
