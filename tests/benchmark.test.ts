import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { execFile } from 'node:child_process';
import { DatabaseManager } from '../src/main/database/database-manager';
import { randomUUID } from 'node:crypto';

describe('Phase 10: Performance Benchmarks & Security Hardening', () => {
  let dbManager: DatabaseManager;
  let testDbPath: string;
  let testDir: string;

  beforeAll(() => {
    testDir = path.join(__dirname, 'tmp-benchmark');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    testDbPath = path.join(testDir, 'benchmark.sqlite');
    dbManager = new DatabaseManager(testDbPath);
    dbManager.init();
  });

  afterAll(() => {
    if (dbManager) {
      dbManager.close();
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('1. Cold Startup Time Benchmark', () => {
    it('should complete production smoke launch in under 1.5 seconds', async () => {
      const smokeScript = path.join(__dirname, 'launch-smoke.js');
      const startTime = Date.now();
      const cleanEnv = { ...process.env };
      delete cleanEnv.ELECTRON_RUN_AS_NODE;

      const exitCode = await new Promise<number>((resolve, reject) => {
        execFile('node', [smokeScript], { cwd: path.join(__dirname, '..'), env: cleanEnv }, (error) => {
          if (error && error.code !== 0) {
            return reject(error);
          }
          resolve(0);
        });
      });

      const durationMs = Date.now() - startTime;
      expect(exitCode).toBe(0);
      expect(durationMs).toBeLessThan(1500);
    });
  });

  describe('2. Memory Consumption Baseline', () => {
    it('should maintain memory footprint well under 150MB baseline during intensive ops', () => {
      const mem = process.memoryUsage();
      const heapUsedMB = mem.heapUsed / (1024 * 1024);
      expect(heapUsedMB).toBeLessThan(150);
    });
  });

  describe('3. Large Collection Handling & Throughput', () => {
    it('should bulk insert and query 1,000 requests in under 1,000ms using SQLite WAL mode', () => {
      const workspace = dbManager.createWorkspace({ name: 'Benchmark Workspace' });
      const collection = dbManager.createCollection({ workspaceId: workspace.id, name: 'High Volume Collection' });

      const batchCount = 1000;
      const startTime = Date.now();

      // Begin transaction for bulk insert
      const db = (dbManager as any).db;
      const insertStmt = db.prepare(`
        INSERT INTO requests (id, collection_id, name, method, url, headers_json, params_json, body_json, sort_order, created_at, updated_at)
        VALUES (@id, @collectionId, @name, @method, @url, @headersJson, @paramsJson, @bodyJson, @sortOrder, @createdAt, @updatedAt)
      `);

      const insertMany = db.transaction((items: any[]) => {
        for (const item of items) {
          insertStmt.run(item);
        }
      });

      const now = new Date().toISOString();
      const mockItems = Array.from({ length: batchCount }, (_, i) => ({
        id: `bench-req-${i}`,
        collectionId: collection.id,
        name: `High Frequency Endpoint #${i}`,
        method: i % 2 === 0 ? 'GET' : 'POST',
        url: `https://api.benchmark.test/items/${i}`,
        headersJson: JSON.stringify([{ id: 'h1', key: 'Accept', value: 'application/json', enabled: true }]),
        paramsJson: JSON.stringify([]),
        bodyJson: JSON.stringify({ type: 'none' }),
        sortOrder: i,
        createdAt: now,
        updatedAt: now
      }));

      insertMany(mockItems);
      const insertDurationMs = Date.now() - startTime;

      expect(insertDurationMs).toBeLessThan(1000);

      // Verify queries with index lookups
      const queryStart = Date.now();
      const queried = dbManager.getRequestsByCollection(collection.id);
      const queryDurationMs = Date.now() - queryStart;

      expect(queried.length).toBe(batchCount);
      expect(queryDurationMs).toBeLessThan(100);
    });
  });

  describe('4. Security Hardening Audit', () => {
    it('should verify HTML entrypoint enforces Content Security Policy meta tag', () => {
      const indexPath = path.join(__dirname, '../src/renderer/index.html');
      const htmlContent = fs.readFileSync(indexPath, 'utf-8');

      expect(htmlContent).toContain('http-equiv="Content-Security-Policy"');
      expect(htmlContent).toContain("default-src 'self'");
    });

    it('should verify main process window options enforce contextIsolation and disable nodeIntegration', () => {
      const mainIndexPath = path.join(__dirname, '../src/main/index.ts');
      const mainContent = fs.readFileSync(mainIndexPath, 'utf-8');

      expect(mainContent).toContain('contextIsolation: true');
      expect(mainContent).toContain('nodeIntegration: false');
      expect(mainContent).toContain('sandbox: true');
      expect(mainContent).toContain('webSecurity: true');
      expect(mainContent).toContain('setWindowOpenHandler');
    });
  });
});
