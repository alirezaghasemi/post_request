import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { Migration } from './migrations/types';
import type {
  Workspace,
  Collection,
  Environment,
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
      data.headers || '[]',
      data.params || '[]',
      data.body || '{}',
      data.authConfig || '{}',
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
      method: data.method,
      url: data.url,
      headers: data.headers,
      params: data.params,
      body: data.body,
      authConfig: data.authConfig,
      preScript: data.preScript,
      testScript: data.testScript,
      sortOrder: data.sortOrder || 0,
      createdAt: now,
      updatedAt: now
    };
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
