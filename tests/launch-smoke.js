const { spawn } = require('node:child_process');
const path = require('node:path');

console.log('[SmokeTest] Launching Electron in production mode...');

const electronPath = path.resolve(__dirname, '../node_modules/.bin/electron');
const appPath = path.resolve(__dirname, '..');

const childEnv = { ...process.env, NODE_ENV: 'production' };
delete childEnv.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [appPath, '--no-sandbox'], {
  env: childEnv,
  stdio: ['ignore', 'pipe', 'pipe']
});

let initialized = false;

child.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);

  if (text.includes('[DevPilot] Initializing local database at:')) {
    initialized = true;
    console.log('[SmokeTest] SUCCESS: DevPilot launched and initialized SQLite successfully!');
    setTimeout(() => {
      child.kill('SIGINT');
    }, 200);
  }
});

child.stderr.on('data', (chunk) => {
  const text = chunk.toString();
  process.stderr.write(text);
});

child.on('close', (code) => {
  console.log(`[SmokeTest] Electron process closed (exit code: ${code})`);
  if (initialized) {
    process.exit(0);
  } else {
    console.error('[SmokeTest] FAILED: Process terminated before initializing database.');
    process.exit(1);
  }
});

setTimeout(() => {
  if (!initialized) {
    console.error('[SmokeTest] TIMEOUT: Electron did not initialize within 12 seconds.');
    child.kill('SIGKILL');
    process.exit(1);
  }
}, 12000);
