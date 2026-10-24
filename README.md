# DevPilot API Studio

> Production-grade, local-first API development and testing platform built with Electron, React, TypeScript, and SQLite.

---

## Overview

**DevPilot API Studio** is an independent, privacy-centric desktop application designed for backend engineers and API developers. It provides functional capabilities comparable to Postman while maintaining 100% offline-first local persistence, deterministic execution, and zero mandatory cloud registration.

---

## Technology Stack

- **Desktop Framework:** Electron v33.x LTS
- **Core Languages:** Strict TypeScript, Node.js v24.x
- **Frontend Architecture:** React 18, Vite, Tailwind CSS, Lucide Icons, Zustand
- **Local Persistence:** SQLite (WAL mode, foreign key enforcement, migrations) via `better-sqlite3`
- **Testing Suites:** Vitest (Unit & Integration), Node launch smoke runner

---

## Getting Started

### Prerequisites

- Node.js >= 20 (Tested on Node.js v24.15)
- npm >= 10
- C/C++ compiler toolchain (GCC / Clang / Python 3 for native SQLite builds)

### Installation

```bash
git clone <repo-url>
cd postRequest
npm install
npm run rebuild
```

### Development Mode

To run DevPilot in local development mode with hot-reloading:

```bash
npm run dev
```

### Running Tests

Execute the full automated test suite:

```bash
npm test
```

### Type Checking & Linting

```bash
npm run lint
```

### Production Build

```bash
npm run build
```

---

## Project Structure

```
├── dist/                     # Compiled React renderer bundle
├── dist-electron/            # Compiled Electron Main and Preload bundles
├── src/
│   ├── main/                 # Electron Main process
│   │   ├── database/         # SQLite DatabaseManager, migrations, schema
│   │   ├── ipc/              # Typed IPC routers, input validators, sanitizers
│   │   └── index.ts          # Main lifecycle, window management, security
│   ├── preload/              # Secure Preload layer (contextBridge)
│   ├── shared/               # Shared contracts, types, IPC channels
│   └── renderer/             # React UI application
│       ├── index.html        # Entry HTML
│       └── src/
│           ├── components/   # UI Shell (TitleBar, Sidebar, TabBar, StatusBar)
│           ├── store/        # Zustand state store
│           └── styles/       # Tailwind CSS & theme tokens
├── tests/                    # Vitest test suites & smoke tests
└── docs/                     # Architectural decisions & specifications
```

---

## Phased Development Status

- **Phase 0 (Discovery & Architecture):** Completed & Approved.
- **Phase 1 (Electron Foundation):** Completed & Verified.
- **Phase 2 (Core HTTP Client):** Next pending approval.
