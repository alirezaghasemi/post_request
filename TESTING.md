# DevPilot API Studio — Testing Framework & Automation

## 1. Testing Philosophy (TDD)
- All database operations, IPC channels, and domain logic must have automated tests.
- Tests are executed against an in-memory SQLite instance for fast and isolated unit tests.
- Native Electron ABI compatibility is verified using dedicated smoke tests.

## 2. Test Execution Commands

```bash
# Run all Vitest unit and integration suites
npm test

# Run tests in watch mode
npm run test:watch

# Run Electron production launch smoke test
node tests/launch-smoke.js
```

## 3. Test Suites Overview
- `tests/database.test.ts`: Tests database connection, schema migration execution, workspace CRUD, and foreign key enforcement.
- `tests/ipc-validation.test.ts`: Tests input validation, schema enforcement, and channel routing.
- `tests/security.test.ts`: Tests sanitization, SQL injection resistance, and unauthorized channel blocking.
- `tests/launch-smoke.js`: Spawns the production Electron binary and verifies full startup and database file creation on disk.
