import type { Migration } from './types';

export const initialMigration: Migration = {
  id: 1,
  name: '001-initial-schema',
  up: (db) => {
    // 1. Workspaces
    db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // 2. Collections
    db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        auth_config_json TEXT DEFAULT '{}',
        variables_json TEXT DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_collections_workspace ON collections(workspace_id);
    `);

    // 3. Folders
    db.exec(`
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL,
        parent_folder_id TEXT,
        name TEXT NOT NULL,
        auth_config_json TEXT DEFAULT '{}',
        sort_order INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_folders_collection ON folders(collection_id);
    `);

    // 4. Requests
    db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        collection_id TEXT,
        folder_id TEXT,
        name TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'GET',
        url TEXT NOT NULL DEFAULT '',
        headers_json TEXT DEFAULT '[]',
        params_json TEXT DEFAULT '[]',
        body_json TEXT DEFAULT '{}',
        auth_config_json TEXT DEFAULT '{}',
        pre_script TEXT DEFAULT '',
        test_script TEXT DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_requests_collection ON requests(collection_id);
    `);

    // 5. Environments
    db.exec(`
      CREATE TABLE IF NOT EXISTS environments (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        variables_json TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_environments_workspace ON environments(workspace_id);
    `);

    // 6. Settings
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Seed default workspace and settings
    const defaultWorkspaceId = 'default-workspace';
    db.prepare(`
      INSERT OR IGNORE INTO workspaces (id, name, description, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(defaultWorkspaceId, 'My Workspace', 'Default local workspace', 0);

    const defaultSettings = [
      { key: 'theme', value: 'dark' },
      { key: 'fontSize', value: '14' },
      { key: 'timeoutMs', value: '30000' },
      { key: 'maxResponseSizeBytes', value: '10485760' }, // 10MB
      { key: 'followRedirects', value: 'true' },
      { key: 'strictSSL', value: 'true' }
    ];

    const insertSetting = db.prepare(`
      INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
    `);

    for (const setting of defaultSettings) {
      insertSetting.run(setting.key, setting.value);
    }
  }
};
