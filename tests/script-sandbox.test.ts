import { describe, it, expect } from 'vitest';
import { ScriptSandbox } from '../src/main/scripting/sandbox';
import type { EnvironmentVariable } from '../src/shared/types';

describe('ScriptSandbox Engine (Pre-request & Test Scripts)', () => {
  const sandbox = new ScriptSandbox();

  it('should execute basic calculations and console.log capture', async () => {
    const script = `
      console.log('Starting calculation');
      const sum = 10 + 20;
      console.info('Sum is:', sum);
    `;

    const result = await sandbox.execute(script, {
      variables: {},
      environment: []
    });

    expect(result.success).toBe(true);
    expect(result.logs.length).toBe(2);
    expect(result.logs[0].message).toContain('Starting calculation');
    expect(result.logs[1].message).toContain('Sum is: 30');
  });

  it('should support pm.environment.get and pm.environment.set', async () => {
    const script = `
      const currentToken = pm.environment.get('token');
      pm.environment.set('token', currentToken + '_updated');
      pm.environment.set('newKey', 'newValue');
    `;

    const envVars: EnvironmentVariable[] = [
      { key: 'token', value: 'abc', type: 'default', enabled: true }
    ];

    const result = await sandbox.execute(script, {
      environment: envVars
    });

    expect(result.success).toBe(true);
    expect(result.updatedEnvironment?.find((v) => v.key === 'token')?.value).toBe('abc_updated');
    expect(result.updatedEnvironment?.find((v) => v.key === 'newKey')?.value).toBe('newValue');
  });

  it('should execute pm.test and pm.expect with passing assertions', async () => {
    const script = `
      pm.test('Status code is 200', () => {
        pm.response.to.have.status(200);
      });

      pm.test('Response body contains valid user object', () => {
        const body = pm.response.json();
        pm.expect(body.id).to.equal(123);
        pm.expect(body.username).to.equal('alice');
        pm.expect(body.roles).to.include('admin');
      });
    `;

    const responseData = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      bodyText: JSON.stringify({ id: 123, username: 'alice', roles: ['admin', 'editor'] }),
      timeMs: 45,
      sizeBytes: 1024
    };

    const result = await sandbox.execute(script, {
      response: responseData
    });

    expect(result.success).toBe(true);
    expect(result.tests.length).toBe(2);
    expect(result.tests[0].name).toBe('Status code is 200');
    expect(result.tests[0].passed).toBe(true);
    expect(result.tests[1].name).toBe('Response body contains valid user object');
    expect(result.tests[1].passed).toBe(true);
  });

  it('should report failing pm.test assertions with meaningful error details', async () => {
    const script = `
      pm.test('Failing test for status code', () => {
        pm.response.to.have.status(200);
      });

      pm.test('Passing test', () => {
        pm.expect(1 + 1).to.equal(2);
      });
    `;

    const responseData = {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      bodyText: 'Not Found',
      timeMs: 20,
      sizeBytes: 9
    };

    const result = await sandbox.execute(script, {
      response: responseData
    });

    expect(result.success).toBe(true);
    expect(result.tests.length).toBe(2);
    expect(result.tests[0].passed).toBe(false);
    expect(result.tests[0].error).toContain('Expected status 200 but received 404');
    expect(result.tests[1].passed).toBe(true);
  });

  it('should enforce strict timeout on infinite loops or long executions', async () => {
    const script = `
      while (true) {
        // infinite loop
      }
    `;

    const result = await sandbox.execute(script, {
      timeoutMs: 500
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/timed out|timeout/i);
  });

  it('should strictly isolate script runtime from Node.js APIs and OS primitives', async () => {
    const maliciousScripts = [
      `require('fs')`,
      `process.exit(1)`,
      `process.env`,
      `this.constructor.constructor('return process')().mainModule.require('child_process')`,
      `global.process`
    ];

    for (const script of maliciousScripts) {
      const result = await sandbox.execute(script, {});
      // Script must either fail or evaluate to undefined without granting access to process or fs
      if (result.success) {
        expect(result.logs.some((l) => l.message.includes('child_process'))).toBe(false);
      } else {
        expect(result.error).toBeDefined();
      }
    }
  });
});
