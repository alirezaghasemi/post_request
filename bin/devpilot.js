#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const compiledEntry = path.join(__dirname, '../dist-electron/src/cli/index.js');
const rootCompiledEntry = path.join(__dirname, '../dist-electron/cli/index.js');

let cliModule;
if (fs.existsSync(compiledEntry)) {
  cliModule = require(compiledEntry);
} else if (fs.existsSync(rootCompiledEntry)) {
  cliModule = require(rootCompiledEntry);
} else {
  try {
    cliModule = require('../src/cli/cli-engine');
  } catch (err) {
    console.error('DevPilot CLI: Please run "npm run build" to compile the CLI binary first.');
    process.exit(2);
  }
}

if (cliModule && typeof cliModule.runCli === 'function') {
  cliModule.runCli(process.argv.slice(2)).then((code) => {
    process.exit(code);
  }).catch((err) => {
    console.error('Fatal CLI Error:', err);
    process.exit(2);
  });
} else {
  console.error('Error: runCli function not found in CLI entrypoint');
  process.exit(2);
}
