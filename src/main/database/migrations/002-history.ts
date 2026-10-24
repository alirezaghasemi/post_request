import type { Migration } from './types';

export const historyMigration: Migration = {
  id: 2,
  name: '002-history-table',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        time_ms INTEGER NOT NULL,
        size_bytes INTEGER NOT NULL,
        executed_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_history_workspace ON history(workspace_id);
    `);
  }
};
