import { randomUUID } from 'node:crypto';
import type { DatabaseManager } from '../database/database-manager';
import type { HttpClientEngine } from '../network/http-client';
import type { ScriptSandbox } from '../scripting/sandbox';
import type { VariableResolver } from '../variables/resolver';
import type { CollectionRunReport, RunnerStepResult } from './report-exporter';
import type { HttpRequestExecutionPayload, RequestItem, KeyValuePair } from '../../shared/types';

export interface CollectionRunnerConfig {
  collectionId?: string;
  inMemoryCollection?: any;
  inMemoryRequests?: RequestItem[];
  inMemoryEnvironment?: any;
  folderId?: string;
  selectedRequestIds?: string[];
  iterations?: number;
  delayMs?: number;
  iterationData?: Record<string, any>[];
  stopOnError?: boolean;
  environmentId?: string;
  onProgress?: (progress: { currentStep: number; totalSteps: number; result: RunnerStepResult }) => void;
}

export interface CollectionRunnerDependencies {
  dbManager?: DatabaseManager;
  httpClient: HttpClientEngine;
  scriptSandbox: ScriptSandbox;
  variableResolver: VariableResolver;
}

export class CollectionRunner {
  private dbManager?: DatabaseManager;
  private httpClient: HttpClientEngine;
  private scriptSandbox: ScriptSandbox;
  private variableResolver: VariableResolver;
  private isCancelled: boolean = false;

  constructor(deps: CollectionRunnerDependencies) {
    this.dbManager = deps.dbManager;
    this.httpClient = deps.httpClient;
    this.scriptSandbox = deps.scriptSandbox;
    this.variableResolver = deps.variableResolver;
  }

  public cancel(): void {
    this.isCancelled = true;
  }

  public async run(config: CollectionRunnerConfig): Promise<CollectionRunReport> {
    this.isCancelled = false;
    const runId = randomUUID();
    const startedAt = new Date().toISOString();

    const collection = config.inMemoryCollection || (config.collectionId && this.dbManager ? this.dbManager.getCollection(config.collectionId) : null);
    const collectionName = collection ? collection.name : 'Collection Run';

    let allRequests: RequestItem[] = config.inMemoryRequests || (config.collectionId && this.dbManager ? this.dbManager.getRequestsByCollection(config.collectionId) : []);
    if (config.folderId) {
      allRequests = allRequests.filter((r) => r.folderId === config.folderId);
    }
    if (config.selectedRequestIds && config.selectedRequestIds.length > 0) {
      allRequests = allRequests.filter((r) => config.selectedRequestIds!.includes(r.id));
    }

    const iterations = Math.max(1, config.iterations || 1);
    const results: RunnerStepResult[] = [];
    let totalPassed = 0;
    let totalFailed = 0;
    let runStatus: 'completed' | 'cancelled' | 'failed' = 'completed';

    const startTime = Date.now();

    // Load Environment
    let activeEnv = config.inMemoryEnvironment || (config.environmentId && this.dbManager
      ? this.dbManager.getEnvironment(config.environmentId)
      : null);

    if (!activeEnv && collection?.workspaceId && this.dbManager) {
      const envs = this.dbManager.getEnvironments(collection.workspaceId);
      activeEnv = envs.find((e) => e.isActive) || null;
    }

    // Load Collection Variables
    let collectionVars: any[] = [];
    if (collection?.variables) {
      try {
        collectionVars = typeof collection.variables === 'string'
          ? JSON.parse(collection.variables)
          : collection.variables;
      } catch {
        // Ignored
      }
    }

    const totalStepsEstimate = allRequests.length * iterations;
    let completedSteps = 0;

    // Iterations Loop
    for (let iter = 1; iter <= iterations; iter++) {
      if (this.isCancelled) {
        runStatus = 'cancelled';
        break;
      }

      const iterData = config.iterationData && config.iterationData.length >= iter
        ? config.iterationData[iter - 1]
        : undefined;

      let reqIndex = 0;

      while (reqIndex >= 0 && reqIndex < allRequests.length) {
        if (this.isCancelled) {
          runStatus = 'cancelled';
          break;
        }

        const req = allRequests[reqIndex];
        const stepResult = await this.executeStep(req, iter, iterData, activeEnv, collectionVars);
        results.push(stepResult);
        completedSteps++;

        // Update statistics
        for (const t of stepResult.tests) {
          if (t.passed) totalPassed++;
          else totalFailed++;
        }

        if (config.onProgress) {
          config.onProgress({
            currentStep: completedSteps,
            totalSteps: totalStepsEstimate,
            result: stepResult
          });
        }

        // Check stop on error
        const hasFailures = stepResult.tests.some((t) => !t.passed) || Boolean(stepResult.error);
        if (config.stopOnError && hasFailures) {
          runStatus = 'failed';
          break;
        }

        // Next Request Logic
        if (stepResult.nextRequestDirective === null) {
          // Explicit finish iteration directive
          break;
        } else if (typeof stepResult.nextRequestDirective === 'string') {
          const target = stepResult.nextRequestDirective.toLowerCase();
          const targetIndex = allRequests.findIndex(
            (r) => r.id === target || r.name.toLowerCase() === target
          );
          if (targetIndex !== -1) {
            reqIndex = targetIndex;
          } else {
            reqIndex++;
          }
        } else {
          reqIndex++;
        }

        // Delay between requests
        if (config.delayMs && config.delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, config.delayMs));
        }
      }

      if (runStatus === 'cancelled' || runStatus === 'failed') {
        break;
      }
    }

    const completedAt = new Date().toISOString();
    const totalTimeMs = Date.now() - startTime;

    return {
      id: runId,
      collectionId: config.collectionId || collection?.id || 'in-memory-collection',
      collectionName,
      totalRequests: results.length,
      totalPassed,
      totalFailed,
      totalTimeMs,
      status: runStatus,
      iterations,
      results,
      startedAt,
      completedAt
    };
  }

  private async executeStep(
    req: RequestItem,
    iteration: number,
    iterationData?: Record<string, any>,
    activeEnv?: any,
    collectionVars?: any[]
  ): Promise<RunnerStepResult & { nextRequestDirective?: string | null }> {
    const stepLogs: Array<{ level: string; message: string; timestamp: string }> = [];
    const stepTests: Array<{ name: string; passed: boolean; error?: string }> = [];
    let nextDirective: string | null | undefined = undefined;

    // Parse stored JSON fields
    let headers: KeyValuePair[] = [];
    let params: KeyValuePair[] = [];
    let body: any = { type: 'none' };
    let auth: any = { type: 'none' };

    try {
      headers = typeof req.headers === 'string' ? JSON.parse(req.headers) : (req.headers || []);
    } catch { headers = []; }
    try {
      params = typeof req.params === 'string' ? JSON.parse(req.params) : (req.params || []);
    } catch { params = []; }
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || { type: 'none' });
    } catch { body = { type: 'none' }; }
    try {
      auth = typeof req.authConfig === 'string' ? JSON.parse(req.authConfig) : (req.authConfig || { type: 'none' });
    } catch { auth = { type: 'none' }; }

    // 1. Run Pre-request Script
    if (req.preScript && req.preScript.trim().length > 0) {
      try {
        const preResult = await this.scriptSandbox.execute(req.preScript, {
          environment: activeEnv?.variables || [],
          iterationData,
          timeoutMs: 3000
        });
        stepLogs.push(...preResult.logs);
        if (preResult.updatedEnvironment && activeEnv) {
          activeEnv.variables = preResult.updatedEnvironment;
        }
      } catch (err: any) {
        stepLogs.push({
          level: 'error',
          message: `Pre-request error: ${err.message}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // 2. Variable Resolution (including Iteration Data variables)
    const iterVars = iterationData
      ? Object.entries(iterationData).map(([key, value]) => ({
          key,
          value: String(value),
          type: 'default' as const,
          enabled: true
        }))
      : [];

    const effectivePayload: HttpRequestExecutionPayload = this.variableResolver.resolvePayload(
      {
        requestId: randomUUID(),
        method: req.method,
        url: req.url,
        params,
        headers,
        body,
        auth
      },
      {
        request: iterVars,
        environment: activeEnv?.variables || [],
        collection: collectionVars || []
      }
    );

    // 3. HTTP Execution
    let response: any = null;
    let stepError: string | undefined = undefined;

    try {
      response = await this.httpClient.execute(effectivePayload);
    } catch (err: any) {
      stepError = err.message || String(err);
      response = {
        status: 0,
        statusText: 'Failed',
        timeMs: 0,
        sizeBytes: 0,
        headers: {},
        cookies: [],
        body: '',
        contentType: '',
        isTruncated: false,
        error: stepError
      };
    }

    // 4. Run Post-response Test Script
    if (req.testScript && req.testScript.trim().length > 0 && response.status > 0) {
      try {
        const headersMap: Record<string, string> = {};
        for (const [k, v] of Object.entries(response.headers)) {
          headersMap[k] = Array.isArray(v) ? v.join(', ') : String(v);
        }

        const testResult = await this.scriptSandbox.execute(req.testScript, {
          environment: activeEnv?.variables || [],
          iterationData,
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: headersMap,
            bodyText: response.body,
            timeMs: response.timeMs,
            sizeBytes: response.sizeBytes
          },
          timeoutMs: 3000
        });

        stepLogs.push(...testResult.logs);
        stepTests.push(...testResult.tests);
        nextDirective = testResult.nextRequest;

        if (testResult.updatedEnvironment && activeEnv) {
          activeEnv.variables = testResult.updatedEnvironment;
        }
      } catch (err: any) {
        stepLogs.push({
          level: 'error',
          message: `Test script error: ${err.message}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      requestId: req.id,
      requestName: req.name,
      method: req.method,
      url: effectivePayload.url,
      status: response.status,
      timeMs: response.timeMs,
      sizeBytes: response.sizeBytes,
      iteration,
      tests: stepTests,
      logs: stepLogs,
      error: stepError,
      nextRequestDirective: nextDirective
    };
  }
}
