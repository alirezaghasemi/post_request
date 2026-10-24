import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { Migration } from './migrations/types';
import type {
  Workspace,
  Collection,
  Folder,
  Environment,
  EnvironmentVariable,
  AppSettings,
  RequestItem
} from '../../shared/types';
import { initialMigration } from './migrations/001-initial';
import { historyMigration } from './migrations/002-history';
import type { HistoryItem } from '../../shared/types';

export class DatabaseManager {
  private db: Database.Database | null = null;
  private readonly dbPath: string;

  constructor(dbPath: string = ':memory:') {
    this.dbPath = dbPath;
  }

  public connect(): void {
    if (this.db) return;

    this.db = new Database(this.dbPath);
    // Performance & Data Safety Pragmas
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    // Create migrations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  public init(): void {
    this.connect();
    this.runMigration(initialMigration);
    this.runMigration(historyMigration);
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  public isConnected(): boolean {
    return this.db !== null && this.db.open;
  }

  public getDatabasePath(): string {
    return this.dbPath;
  }

  public getTables(): string[] {
    this.ensureConnected();
    const rows = this.db!.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as { name: string }[];
    return rows.map((r) => r.name);
  }

  public runMigration(migration: Migration): void {
    this.ensureConnected();
    const check = this.db!.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(migration.id);

    if (!check) {
      const transaction = this.db!.transaction(() => {
        migration.up(this.db!);
        this.db!.prepare('INSERT INTO schema_migrations (id, name) VALUES (?, ?)').run(
          migration.id,
          migration.name
        );
      });
      transaction();
    }
  }

  // --- Workspaces CRUD ---

  public getWorkspaces(): Workspace[] {
    this.ensureConnected();
    const rows = this.db!.prepare(`
      SELECT id, name, description, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
      FROM workspaces
      ORDER BY sort_order ASC, created_at ASC
    `).all() as Workspace[];
    return rows;
  }

  public getWorkspace(id: string): Workspace | null {
    this.ensureConnected();
    const row = this.db!.prepare(`
      SELECT id, name, description, sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
      FROM workspaces
      WHERE id = ?
    `).get(id) as Workspace | undefined;
    return row || null;
  }

  public createWorkspace(data: { name: string; description?: string }): Workspace {
    this.ensureConnected();
    const id = randomUUID();
    const description = data.description || '';
    const now = new Date().toISOString();

    this.db!.prepare(`
      INSERT INTO workspaces (id, name, description, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `).run(id, data.name, description, now, now);

    return {
      id,
      name: data.name,
      description,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now
    };
  }

  public updateWorkspace(id: string, data: Partial<Pick<Workspace, 'name' | 'description' | 'sortOrder'>>): Workspace {
    this.ensureConnected();
    const current = this.getWorkspace(id);
    if (!current) throw new Error(`Workspace with id ${id} not found`);

    const updated = {
      name: data.name ?? current.name,
      description: data.description ?? current.description,
      sortOrder: data.sortOrder ?? current.sortOrder,
      updatedAt: new Date().toISOString()
    };

    this.db!.prepare(`
      UPDATE workspaces
      SET name = ?, description = ?, sort_order = ?, updated_at = ?
      WHERE id = ?
    `).run(updated.name, updated.description, updated.sortOrder, updated.updatedAt, id);

    return {
      ...current,
      ...updated
    };
  }

  public deleteWorkspace(id: string): boolean {
    this.ensureConnected();
    const result = this.db!.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // --- Collections CRUD ---

  public getCollections(workspaceId: string): Collection[] {
    this.ensureConnected();
    const rows = this.db!.prepare(`
      SELECT id, workspace_id as workspaceId, name, description, auth_config_json as authConfig,
             variables_json as variables, created_at as createdAt, updated_at as updatedAt
      FROM collections
      WHERE workspace_id = ?
      ORDER BY created_at ASC
    `).all(workspaceId) as Collection[];
    return rows;
  }

  public getCollection(id: string): Collection | null {
    this.ensureConnected();
    const row = this.db!.prepare(`
      SELECT id, workspace_id as workspaceId, name, description, auth_config_json as authConfig,
             variables_json as variables, created_at as createdAt, updated_at as updatedAt
      FROM collections
      WHERE id = ?
    `).get(id) as Collection | undefined;
    return row || null;
  }

  public createCollection(data: {
    workspaceId: string;
    name: string;
    description?: string;
    authConfig?: string;
    variables?: string;
  }): Collection {
    this.ensureConnected();
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db!.prepare(`
      INSERT INTO collections (id, workspace_id, name, description, auth_config_json, variables_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.workspaceId,
      data.name,
      data.description || '',
      data.authConfig || '{}',
      data.variables || '[]',
      now,
      now
    );

    return {
      id,
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description,
      authConfig: data.authConfig,
      variables: data.variables,
      createdAt: now,
      updatedAt: now
    };
  }

  public deleteCollection(id: string): boolean {
    this.ensureConnected();
    const result = this.db!.prepare('DELETE FROM collections WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // --- Folders CRUD ---

  public getFolders(collectionId: string): Folder[] {
    this.ensureConnected();
    const rows = this.db!.prepare(`
      SELECT id, collection_id as collectionId, parent_folder_id as parentFolderId,
             name, auth_config_json as authConfig, sort_order as sortOrder
      FROM folders
      WHERE collection_id = ?
      ORDER BY sort_order ASC, name ASC
    `).all(collectionId) as Folder[];
    return rows;
  }

  public createFolder(data: {
    collectionId: string;
    parentFolderId?: string | null;
    name: string;
  }): Folder {
    this.ensureConnected();
    const id = randomUUID();

    this.db!.prepare(`
      INSERT INTO folders (id, collection_id, parent_folder_id, name, sort_order)
      VALUES (?, ?, ?, ?, 0)
    `).run(id, data.collectionId, data.parentFolderId || null, data.name);

    return {
      id,
      collectionId: data.collectionId,
      parentFolderId: data.parentFolderId || null,
      name: data.name,
      sortOrder: 0
    };
  }

  public deleteFolder(id: string): boolean {
    this.ensureConnected();
    const result = this.db!.prepare('DELETE FROM folders WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // --- Environments CRUD ---

  public getEnvironments(workspaceId: string): Environment[] {
    this.ensureConnected();
    const rows = this.db!.prepare(`
      SELECT id, workspace_id as workspaceId, name, variables_json as variablesJson,
             is_active as isActive, created_at as createdAt, updated_at as updatedAt
      FROM environments
      WHERE workspace_id = ?
      ORDER BY created_at ASC
    `).all(workspaceId) as Array<{
      id: string;
      workspaceId: string;
      name: string;
      variablesJson: string;
      isActive: number;
      createdAt: string;
      updatedAt: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      name: r.name,
      variables: JSON.parse(r.variablesJson || '[]'),
      isActive: Boolean(r.isActive),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  public getEnvironment(id: string): Environment | null {
    this.ensureConnected();
    const row = this.db!.prepare(`
      SELECT id, workspace_id as workspaceId, name, variables_json as variablesJson,
             is_active as isActive, created_at as createdAt, updated_at as updatedAt
      FROM environments
      WHERE id = ?
    `).get(id) as {
      id: string;
      workspaceId: string;
      name: string;
      variablesJson: string;
      isActive: number;
      createdAt: string;
      updatedAt: string;
    } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      workspaceId: row.workspaceId,
      name: row.name,
      variables: JSON.parse(row.variablesJson || '[]'),
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  public createEnvironment(data: { workspaceId: string; name: string; variables?: unknown[] }): Environment {
    this.ensureConnected();
    const id = randomUUID();
    const now = new Date().toISOString();
    const variablesJson = JSON.stringify(data.variables || []);

    this.db!.prepare(`
      INSERT INTO environments (id, workspace_id, name, variables_json, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(id, data.workspaceId, data.name, variablesJson, now, now);

    return {
      id,
      workspaceId: data.workspaceId,
      name: data.name,
      variables: (data.variables || []) as Environment['variables'],
      isActive: false,
      createdAt: now,
      updatedAt: now
    };
  }

  public updateEnvironment(
    id: string,
    data: { name?: string; variables?: EnvironmentVariable[]; isActive?: boolean }
  ): Environment {
    this.ensureConnected();
    const rows = this.db!.prepare('SELECT * FROM environments WHERE id = ?').get(id) as any;
    if (!rows) throw new Error(`Environment ${id} not found`);

    const name = data.name ?? rows.name;
    const variablesJson = data.variables !== undefined ? JSON.stringify(data.variables) : rows.variables_json;
    const isActive = data.isActive !== undefined ? (data.isActive ? 1 : 0) : rows.is_active;
    const now = new Date().toISOString();

    // If setting active, deactivate others in the same workspace
    if (data.isActive) {
      this.db!.prepare('UPDATE environments SET is_active = 0 WHERE workspace_id = ?').run(rows.workspace_id);
    }

    this.db!.prepare(`
      UPDATE environments
      SET name = ?, variables_json = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(name, variablesJson, isActive, now, id);

    return {
      id,
      workspaceId: rows.workspace_id,
      name,
      variables: JSON.parse(variablesJson),
      isActive: Boolean(isActive),
      createdAt: rows.created_at,
      updatedAt: now
    };
  }

  public deleteEnvironment(id: string): boolean {
    this.ensureConnected();
    const result = this.db!.prepare('DELETE FROM environments WHERE id = ?').run(id);
    return result.changes > 0;
  }

  public saveImportedCollection(collection: Collection, folders: Folder[], requests: RequestItem[]): void {
    this.ensureConnected();
    const transaction = this.db!.transaction(() => {
      // 1. Insert collection
      this.db!.prepare(`
        INSERT INTO collections (id, workspace_id, name, description, auth_config_json, variables_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        collection.id,
        collection.workspaceId,
        collection.name,
        collection.description || '',
        collection.authConfig || '{}',
        collection.variables || '[]',
        collection.createdAt,
        collection.updatedAt
      );

      // 2. Insert folders
      const insertFolder = this.db!.prepare(`
        INSERT INTO folders (id, collection_id, parent_folder_id, name, auth_config_json, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const folder of folders) {
        insertFolder.run(
          folder.id,
          folder.collectionId,
          folder.parentFolderId || null,
          folder.name,
          folder.authConfig || '{}',
          folder.sortOrder || 0
        );
      }

      // 3. Insert requests
      const insertRequest = this.db!.prepare(`
        INSERT INTO requests (
          id, collection_id, folder_id, name, method, url, headers_json, params_json,
          body_json, auth_config_json, pre_script, test_script, sort_order, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const req of requests) {
        insertRequest.run(
          req.id,
          req.collectionId,
          req.folderId || null,
          req.name,
          req.method,
          req.url,
          req.headers || '[]',
          req.params || '[]',
          req.body || '{}',
          req.authConfig || '{}',
          req.preScript || '',
          req.testScript || '',
          req.sortOrder || 0,
          req.createdAt,
          req.updatedAt
        );
      }
    });

    transaction();
  }

  // --- Requests CRUD ---

  public getRequestsByCollection(collectionId: string): RequestItem[] {
    this.ensureConnected();
    const rows = this.db!.prepare(`
      SELECT id, collection_id as collectionId, folder_id as folderId, name, method, url,
             headers_json as headers, params_json as params, body_json as body,
             auth_config_json as authConfig, pre_script as preScript, test_script as testScript,
             sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
      FROM requests
      WHERE collection_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `).all(collectionId) as RequestItem[];
    return rows;
  }

  public createRequest(data: Partial<RequestItem> & { name: string; method: string; url: string }): RequestItem {
    this.ensureConnected();
    const id = randomUUID();
    const now = new Date().toISOString();

    const headersStr = typeof data.headers === 'string' ? data.headers : JSON.stringify(data.headers || []);
    const paramsStr = typeof data.params === 'string' ? data.params : JSON.stringify(data.params || []);
    const bodyStr = typeof data.body === 'string' ? data.body : JSON.stringify(data.body || {});
    const authConfigStr = typeof data.authConfig === 'string'
      ? data.authConfig
      : JSON.stringify(data.authConfig || (data as any).auth || {});

    this.db!.prepare(`
      INSERT INTO requests (
        id, collection_id, folder_id, name, method, url, headers_json, params_json,
        body_json, auth_config_json, pre_script, test_script, sort_order, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.collectionId || null,
      data.folderId || null,
      data.name,
      data.method,
      data.url,
      headersStr,
      paramsStr,
      bodyStr,
      authConfigStr,
      data.preScript || '',
      data.testScript || '',
      data.sortOrder || 0,
      now,
      now
    );

    return {
      id,
      collectionId: data.collectionId,
      folderId: data.folderId,
      name: data.name,
      method: data.method as any,
      url: data.url,
      headers: headersStr,
      params: paramsStr,
      body: bodyStr,
      authConfig: authConfigStr,
      preScript: data.preScript,
      testScript: data.testScript,
      sortOrder: data.sortOrder || 0,
      createdAt: now,
      updatedAt: now
    };
  }

  public getRequest(id: string): RequestItem | null {
    this.ensureConnected();
    const row = this.db!.prepare(`
      SELECT id, collection_id as collectionId, folder_id as folderId, name, method, url,
             headers_json as headers, params_json as params, body_json as body,
             auth_config_json as authConfig, pre_script as preScript, test_script as testScript,
             sort_order as sortOrder, created_at as createdAt, updated_at as updatedAt
      FROM requests
      WHERE id = ?
    `).get(id) as RequestItem | undefined;

    return row || null;
  }

  public updateRequest(id: string, data: Partial<RequestItem>): RequestItem {
    this.ensureConnected();
    const existing = this.getRequest(id);
    if (!existing) throw new Error(`Request ${id} not found`);

    const headersStr = data.headers !== undefined
      ? (typeof data.headers === 'string' ? data.headers : JSON.stringify(data.headers))
      : existing.headers;
    const paramsStr = data.params !== undefined
      ? (typeof data.params === 'string' ? data.params : JSON.stringify(data.params))
      : existing.params;
    const bodyStr = data.body !== undefined
      ? (typeof data.body === 'string' ? data.body : JSON.stringify(data.body))
      : existing.body;
    const authConfigStr = data.authConfig !== undefined
      ? (typeof data.authConfig === 'string' ? data.authConfig : JSON.stringify(data.authConfig))
      : existing.authConfig;

    const name = data.name ?? existing.name;
    const method = data.method ?? existing.method;
    const url = data.url ?? existing.url;
    const preScript = data.preScript ?? existing.preScript;
    const testScript = data.testScript ?? existing.testScript;
    const sortOrder = data.sortOrder ?? existing.sortOrder;
    const folderId = data.folderId !== undefined ? data.folderId : existing.folderId;
    const now = new Date().toISOString();

    this.db!.prepare(`
      UPDATE requests
      SET name = ?, method = ?, url = ?, headers_json = ?, params_json = ?,
          body_json = ?, auth_config_json = ?, pre_script = ?, test_script = ?,
          sort_order = ?, folder_id = ?, updated_at = ?
      WHERE id = ?
    `).run(name, method, url, headersStr, paramsStr, bodyStr, authConfigStr, preScript, testScript, sortOrder, folderId, now, id);

    return {
      id,
      collectionId: existing.collectionId,
      folderId,
      name,
      method: method as any,
      url,
      headers: headersStr,
      params: paramsStr,
      body: bodyStr,
      authConfig: authConfigStr,
      preScript,
      testScript,
      sortOrder,
      createdAt: existing.createdAt,
      updatedAt: now
    };
  }

  public deleteRequest(id: string): boolean {
    this.ensureConnected();
    const result = this.db!.prepare('DELETE FROM requests WHERE id = ?').run(id);
    return result.changes > 0;
  }

  // --- History CRUD ---

  public addHistoryEntry(data: {
    workspaceId: string;
    method: string;
    url: string;
    statusCode: number;
    timeMs: number;
    sizeBytes: number;
  }): HistoryItem {
    this.ensureConnected();
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db!.prepare(`
      INSERT INTO history (id, workspace_id, method, url, status_code, time_ms, size_bytes, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.workspaceId, data.method, data.url, data.statusCode, data.timeMs, data.sizeBytes, now);

    return {
      id,
      workspaceId: data.workspaceId,
      method: data.method,
      url: data.url,
      statusCode: data.statusCode,
      timeMs: data.timeMs,
      sizeBytes: data.sizeBytes,
      executedAt: now
    };
  }

  public getHistory(workspaceId: string, limit: number = 50): HistoryItem[] {
    this.ensureConnected();
    const rows = this.db!.prepare(`
      SELECT id, workspace_id as workspaceId, method, url, status_code as statusCode,
             time_ms as timeMs, size_bytes as sizeBytes, executed_at as executedAt
      FROM history
      WHERE workspace_id = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `).all(workspaceId, limit) as HistoryItem[];
    return rows;
  }

  public clearHistory(workspaceId: string): boolean {
    this.ensureConnected();
    const result = this.db!.prepare('DELETE FROM history WHERE workspace_id = ?').run(workspaceId);
    return result.changes > 0;
  }

  // --- Settings ---

  public getSettings(): AppSettings {
    this.ensureConnected();
    const rows = this.db!.prepare('SELECT key, value FROM settings').all() as Array<{
      key: string;
      value: string;
    }>;
    const settingsMap = new Map(rows.map((r) => [r.key, r.value]));

    return {
      theme: (settingsMap.get('theme') as AppSettings['theme']) || 'dark',
      fontSize: parseInt(settingsMap.get('fontSize') || '14', 10),
      timeoutMs: parseInt(settingsMap.get('timeoutMs') || '30000', 10),
      maxResponseSizeBytes: parseInt(settingsMap.get('maxResponseSizeBytes') || '10485760', 10),
      followRedirects: settingsMap.get('followRedirects') === 'true',
      strictSSL: settingsMap.get('strictSSL') === 'true'
    };
  }

  public updateSetting(key: string, value: string): void {
    this.ensureConnected();
    this.db!.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
  }

  private ensureConnected(): void {
    if (!this.db || !this.db.open) {
      throw new Error('Database is not connected. Call connect() or init() first.');
    }
  }
}
