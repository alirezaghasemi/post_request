import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../src/main/database/database-manager';

describe('Collections, Folders & Requests Hierarchy', () => {
  let db: DatabaseManager;
  let workspaceId: string;
  let collectionId: string;

  beforeEach(() => {
    db = new DatabaseManager(':memory:');
    db.init();

    const ws = db.createWorkspace({ name: 'Hierarchy Workspace' });
    workspaceId = ws.id;

    const col = db.createCollection({
      workspaceId,
      name: 'Auth API Collection'
    });
    collectionId = col.id;
  });

  afterEach(() => {
    db.close();
  });

  it('should create and retrieve folders within a collection', () => {
    const parentFolder = db.createFolder({
      collectionId,
      name: 'OAuth2'
    });

    const childFolder = db.createFolder({
      collectionId,
      parentFolderId: parentFolder.id,
      name: 'PKCE Flow'
    });

    const folders = db.getFolders(collectionId);
    expect(folders.length).toBe(2);

    const retrievedParent = folders.find((f) => f.id === parentFolder.id);
    const retrievedChild = folders.find((f) => f.id === childFolder.id);

    expect(retrievedParent?.name).toBe('OAuth2');
    expect(retrievedChild?.parentFolderId).toBe(parentFolder.id);
  });

  it('should cascade delete folders and requests when collection is deleted', () => {
    const folder = db.createFolder({
      collectionId,
      name: 'Subfolder'
    });

    db.createRequest({
      collectionId,
      folderId: folder.id,
      name: 'Login Request',
      method: 'POST',
      url: 'https://example.com/login'
    });

    expect(db.getFolders(collectionId).length).toBe(1);
    expect(db.getRequestsByCollection(collectionId).length).toBe(1);

    // Delete collection
    const deleted = db.deleteCollection(collectionId);
    expect(deleted).toBe(true);

    // Verify cascade
    expect(db.getFolders(collectionId).length).toBe(0);
    expect(db.getRequestsByCollection(collectionId).length).toBe(0);
  });

  it('should update and switch active environment properly', () => {
    const env1 = db.createEnvironment({
      workspaceId,
      name: 'Dev'
    });

    const env2 = db.createEnvironment({
      workspaceId,
      name: 'Prod'
    });

    // Activate env1
    db.updateEnvironment(env1.id, { isActive: true });
    let envs = db.getEnvironments(workspaceId);
    expect(envs.find((e) => e.id === env1.id)?.isActive).toBe(true);
    expect(envs.find((e) => e.id === env2.id)?.isActive).toBe(false);

    // Switch to env2 (should deactivate env1)
    db.updateEnvironment(env2.id, { isActive: true });
    envs = db.getEnvironments(workspaceId);
    expect(envs.find((e) => e.id === env1.id)?.isActive).toBe(false);
    expect(envs.find((e) => e.id === env2.id)?.isActive).toBe(true);

    // Verify getEnvironment by ID
    const singleEnv = db.getEnvironment(env2.id);
    expect(singleEnv).not.toBeNull();
    expect(singleEnv?.name).toBe('Prod');
    expect(singleEnv?.isActive).toBe(true);

    // Delete environment
    const deleted = db.deleteEnvironment(env1.id);
    expect(deleted).toBe(true);
    expect(db.getEnvironment(env1.id)).toBeNull();
  });

  it('should preserve full request configuration inside collections and folders', () => {
    const folder = db.createFolder({
      collectionId,
      name: 'User Management'
    });

    const headers = [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }];
    const params = [{ id: '2', key: 'page', value: '2', enabled: true }];
    const body = { type: 'json' as const, rawContent: '{"username": "test"}' };
    const auth = { type: 'bearer' as const, bearerToken: 'token123' };

    const createdReq = db.createRequest({
      collectionId,
      folderId: folder.id,
      name: 'Update User',
      method: 'PUT',
      url: 'https://api.example.com/user/1',
      headers,
      params,
      body,
      auth
    });

    const retrieved = db.getRequest(createdReq.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe('Update User');
    expect(retrieved?.method).toBe('PUT');
    expect(retrieved?.url).toBe('https://api.example.com/user/1');
    expect(JSON.parse(retrieved!.headers!)).toEqual(headers);
    expect(JSON.parse(retrieved!.params!)).toEqual(params);
    expect(JSON.parse(retrieved!.body!)).toEqual(body);
    expect(JSON.parse(retrieved!.authConfig!)).toEqual(auth);
  });
});

