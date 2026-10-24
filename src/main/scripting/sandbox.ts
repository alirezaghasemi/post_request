import * as vm from 'node:vm';
import type { EnvironmentVariable } from '../../shared/types';

export interface ScriptLog {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface ScriptTestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface ScriptResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  bodyText: string;
  timeMs: number;
  sizeBytes: number;
}

export interface ScriptExecutionContext {
  variables?: Record<string, string>;
  environment?: EnvironmentVariable[];
  collectionVariables?: EnvironmentVariable[];
  response?: ScriptResponseData;
  timeoutMs?: number;
}

export interface ScriptExecutionResult {
  success: boolean;
  logs: ScriptLog[];
  tests: ScriptTestResult[];
  updatedEnvironment?: EnvironmentVariable[];
  updatedVariables?: Record<string, string>;
  error?: string;
}

export class ScriptSandbox {
  /**
   * Executes user script in a hardened isolated V8 context.
   */
  public async execute(scriptCode: string, context: ScriptExecutionContext): Promise<ScriptExecutionResult> {
    const logs: ScriptLog[] = [];
    const tests: ScriptTestResult[] = [];
    const envMap = new Map<string, EnvironmentVariable>();

    if (context.environment) {
      for (const item of context.environment) {
        envMap.set(item.key, { ...item });
      }
    }

    const varMap = new Map<string, string>(Object.entries(context.variables || {}));

    // Capture console output
    const createLogger = (level: ScriptLog['level']) => (...args: any[]) => {
      const message = args
        .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
        .join(' ');
      logs.push({
        level,
        message,
        timestamp: new Date().toISOString()
      });
    };

    // Lightweight assertion library for pm.expect
    const createExpect = (actual: any, isNegated: boolean = false): any => {
      const assert = (condition: boolean, failMsg: string) => {
        const passed = isNegated ? !condition : condition;
        if (!passed) {
          throw new Error(failMsg);
        }
      };

      const chain: any = {
        get not() {
          return createExpect(actual, !isNegated);
        },
        get to() {
          return this;
        },
        get be() {
          return this;
        },
        get have() {
          return this;
        },
        equal(expected: any) {
          assert(
            actual === expected,
            `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
          );
        },
        a(expectedType: string) {
          const type = Array.isArray(actual) ? 'array' : typeof actual;
          assert(
            type === expectedType,
            `Expected ${JSON.stringify(actual)} to be of type ${expectedType}`
          );
        },
        lengthOf(expectedLength: number) {
          assert(
            actual && actual.length === expectedLength,
            `Expected length ${expectedLength} but got ${actual ? actual.length : undefined}`
          );
        },
        get true() {
          assert(actual === true, `Expected ${JSON.stringify(actual)} to be true`);
          return true;
        },
        get false() {
          assert(actual === false, `Expected ${JSON.stringify(actual)} to be false`);
          return true;
        },
        get ok() {
          assert(Boolean(actual), `Expected ${JSON.stringify(actual)} to be truthy`);
          return true;
        },
        include(item: any) {
          const contains = Array.isArray(actual)
            ? actual.includes(item)
            : typeof actual === 'string'
            ? actual.includes(item)
            : false;
          assert(contains, `Expected ${JSON.stringify(actual)} to include ${JSON.stringify(item)}`);
        },
        property(propName: string) {
          assert(
            actual && typeof actual === 'object' && propName in actual,
            `Expected object to have property ${propName}`
          );
        }
      };

      return chain;
    };

    // Build the Postman-compatible `pm.*` object
    const pm: any = {
      test(testName: string, testFn: () => void) {
        try {
          testFn();
          tests.push({ name: testName, passed: true });
        } catch (err: any) {
          tests.push({ name: testName, passed: false, error: err.message || String(err) });
        }
      },
      expect(actual: any) {
        return createExpect(actual);
      },
      environment: {
        get(key: string) {
          return envMap.get(key)?.value;
        },
        set(key: string, value: any) {
          const stringVal = String(value);
          const existing = envMap.get(key);
          if (existing) {
            existing.value = stringVal;
          } else {
            envMap.set(key, { key, value: stringVal, type: 'default', enabled: true });
          }
        },
        unset(key: string) {
          envMap.delete(key);
        },
        has(key: string) {
          return envMap.has(key);
        },
        toObject() {
          const obj: Record<string, string> = {};
          for (const [k, v] of envMap.entries()) {
            obj[k] = v.value;
          }
          return obj;
        }
      },
      variables: {
        get(key: string) {
          return varMap.get(key) || envMap.get(key)?.value;
        },
        set(key: string, value: any) {
          varMap.set(key, String(value));
        },
        has(key: string) {
          return varMap.has(key) || envMap.has(key);
        }
      }
    };

    // If HTTP response is provided (Post-response tests)
    if (context.response) {
      const resp = context.response;
      pm.response = {
        code: resp.status,
        status: resp.statusText,
        responseTime: resp.timeMs,
        responseSize: resp.sizeBytes,
        headers: {
          get: (name: string) => resp.headers[name.toLowerCase()] || resp.headers[name],
          has: (name: string) => name.toLowerCase() in resp.headers || name in resp.headers
        },
        json: () => {
          try {
            return JSON.parse(resp.bodyText);
          } catch {
            throw new Error('Response body is not valid JSON');
          }
        },
        text: () => resp.bodyText,
        to: {
          have: {
            status: (expectedStatus: number) => {
              if (resp.status !== expectedStatus) {
                throw new Error(`Expected status ${expectedStatus} but received ${resp.status}`);
              }
            }
          },
          be: {
            success: () => {
              if (resp.status < 200 || resp.status >= 300) {
                throw new Error(`Expected successful status 2xx but received ${resp.status}`);
              }
            },
            clientError: () => {
              if (resp.status < 400 || resp.status >= 500) {
                throw new Error(`Expected client error 4xx but received ${resp.status}`);
              }
            },
            serverError: () => {
              if (resp.status < 500 || resp.status >= 600) {
                throw new Error(`Expected server error 5xx but received ${resp.status}`);
              }
            }
          }
        }
      };
    }

    // Build the isolated sandbox dictionary
    const sandboxScope: Record<string, any> = {
      console: {
        log: createLogger('log'),
        info: createLogger('info'),
        warn: createLogger('warn'),
        error: createLogger('error')
      },
      pm,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURI,
      decodeURI,
      encodeURIComponent,
      decodeURIComponent,
      JSON,
      Math,
      Date,
      RegExp,
      Array,
      Object,
      String,
      Number,
      Boolean
    };

    // Explicitly neutralize privileged globals
    sandboxScope.process = undefined;
    sandboxScope.require = undefined;
    sandboxScope.global = undefined;
    sandboxScope.module = undefined;
    sandboxScope.exports = undefined;

    const vmContext = vm.createContext(sandboxScope, {
      codeGeneration: {
        strings: false, // Disallow eval() and new Function(String)
        wasm: false
      }
    });

    const timeout = context.timeoutMs || 3000;

    try {
      const script = new vm.Script(scriptCode, {
        filename: 'user-script.js'
      });

      script.runInContext(vmContext, {
        timeout,
        displayErrors: true
      });

      return {
        success: true,
        logs,
        tests,
        updatedEnvironment: Array.from(envMap.values()),
        updatedVariables: Object.fromEntries(varMap.entries())
      };
    } catch (err: any) {
      const isTimeout = err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || /timed out|timeout/i.test(err.message);
      return {
        success: false,
        logs,
        tests,
        error: isTimeout ? `Script execution timed out after ${timeout}ms` : err.message || String(err)
      };
    }
  }
}
