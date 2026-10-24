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
| **Persistence** | Collections Management | Implemented & Tested | Phase 3 | Hierarchical collections, folders, cascade delete |
| **Persistence** | Environments Management | Implemented & Tested | Phase 3 | Scoped variables, secret masking, active switcher |
| **Variables**   | Deterministic Precedence | Implemented & Tested | Phase 3 | Request > Environment > Collection > Global |
| **Variables**   | Variable Interpolation | Implemented & Tested | Phase 3 | `{{var}}` resolution in URL, headers, params, body |
| **Import/Export**| Postman Collection v2.1 | Implemented & Tested | Phase 3 | Import & Export with Import Report |
| **Import/Export**| Postman Environment | Implemented & Tested | Phase 3 | Import & Export JSON |
| **UI** | Custom Frameless TitleBar | Implemented & Tested | Phase 1 | Custom drag region & window buttons |
| **UI** | Left Sidebar Navigation | Implemented & Tested | Phase 3 | Dense developer view with tree & history |
| **UI** | Multi-Tab Manager | Implemented & Tested | Phase 1 | Request, overview, settings, environments tabs |
| **UI** | Theme Switcher (Dark/Light) | Implemented & Tested | Phase 1 | Persisted to SQLite settings table |
| **HTTP Client**| Request Builder & Sender | Implemented & Tested | Phase 2 | Real HTTP/HTTPS execution, Params, Headers, Body, Auth |
| **HTTP Client**| Request Cancellation | Implemented & Tested | Phase 2 | Real-time cancellation via AbortController |
| **HTTP Client**| Response Body Inspector | Implemented & Tested | Phase 2 | Pretty JSON, Raw, Search, Copy, Download |
| **HTTP Client**| Response Headers & Cookies | Implemented & Tested | Phase 2 | Parsed Set-Cookie table & headers |
| **HTTP Client**| Request History | Implemented & Tested | Phase 2 | Persisted in SQLite history table |
| **Scripting**  | Sandboxed `pm.*` API | Unimplemented | Phase 4 | Scheduled for Phase 4 |
| **Runner**     | Collection Test Runner | Unimplemented | Phase 5 | Scheduled for Phase 5 |
| **Specs**      | OpenAPI 3.x Import | Unimplemented | Phase 6 | Scheduled for Phase 6 |
| **Mocking**    | Local HTTP Mock Server | Unimplemented | Phase 6 | Scheduled for Phase 6 |
| **Protocols**  | GraphQL / WS / gRPC / MQTT | Unimplemented | Phase 7 | Scheduled for Phase 7 |
| **Automation** | Headless CLI Runner | Unimplemented | Phase 8 | Scheduled for Phase 8 |
