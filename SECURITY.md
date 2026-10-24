# DevPilot API Studio — Security Policy & Controls

## 1. Process Sandboxing & Isolation
- **No Direct Node.js Access in Renderer:** The renderer runs in a restricted context. `window.require`, `process`, and `Buffer` are undefined in the renderer context.
- **Context Isolation:** Enabled unconditionally.
- **Content Security Policy (CSP):** Restricts script and resource loading exclusively to local application bundles (`'self'`). Remote CDN scripts are forbidden.
- **Safe Navigation:** Uncontrolled window navigation is intercepted via `will-navigate`. All external hyperlinks are delegated to the OS default browser via `shell.openExternal`.

## 2. IPC Defense in Depth
- Every IPC invocation passes through `validateIpcPayload()`.
- Unrecognized channels are instantly blocked.
- Malformed inputs, missing identifiers, or non-object payloads are rejected with structured errors before reaching database repositories.

## 3. Data Protection
- Prepared statements are enforced across all SQLite queries to eliminate SQL injection vulnerabilities.
- Future phases will integrate OS-native credential vaults (`safeStorage`) for environment secret values.
