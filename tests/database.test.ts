import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../src/main/database/database-manager';
import { initialMigration } from '../src/main/database/migrations/001-initial';

describe('DatabaseManager & Migrations', () => {
  let dbManager: DatabaseManager;

  beforeEach(() => {
    // Use in-memory database for fast, isolated tests
    dbManager = new DatabaseManager(':memory:');
    dbManager.connect();
  });

  afterEach(() => {
    dbManager.close();
  });

  it('should initialize connection and create migrations table', () => {
    expect(dbManager.isConnected()).toBe(true);
    const tables = dbManager.getTables();
    expect(tables).toContain('schema_migrations');
  });

  it('should run initial migration successfully', () => {
    dbManager.runMigration(initialMigration);
    const tables = dbManager.getTables();

    expect(tables).toContain('workspaces');
    expect(tables).toContain('collections');
    expect(tables).toContain('folders');
    expect(tables).toContain('requests');
    expect(tables).toContain('environments');
    expect(tables).toContain('settings');
  });

  it('should seed a default workspace if none exists', () => {
    dbManager.runMigration(initialMigration);
    const workspaces = dbManager.getWorkspaces();

    expect(workspaces.length).toBeGreaterThanOrEqual(1);
    expect(workspaces[0].name).toBe('My Workspace');
  });

  it('should perform CRUD operations on Workspaces', () => {
    dbManager.runMigration(initialMigration);

    const created = dbManager.createWorkspace({
      name: 'Backend API Testing',
      description: 'Test workspace for backend endpoints'
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Backend API Testing');

    const fetched = dbManager.getWorkspace(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.description).toBe('Test workspace for backend endpoints');

    const updated = dbManager.updateWorkspace(created.id, {
      name: 'Production Endpoints'
    });
    expect(updated.name).toBe('Production Endpoints');

    const deleted = dbManager.deleteWorkspace(created.id);
    expect(deleted).toBe(true);

    const checkNull = dbManager.getWorkspace(created.id);
    expect(checkNull).toBeNull();
  });

  it('should enforce foreign key constraint between workspace and collections', () => {
    dbManager.runMigration(initialMigration);

    expect(() => {
      dbManager.createCollection({
        workspaceId: 'non-existent-workspace-id',
        name: 'Invalid Collection'
      });
    }).toThrow();
  });
});
