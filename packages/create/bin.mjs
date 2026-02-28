#!/usr/bin/env node
// ndulojs — thin wrapper that delegates to @ndulojs/cli
// Usage: npx ndulojs create my-app

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

// Re-wire argv so @ndulojs/cli sees: node bin.js create my-app
// The wrapper swallows "ndulojs" and passes the rest through
const [nodeBin, , ...args] = process.argv;

// Find @ndulojs/cli bin relative to this package
const require = createRequire(import.meta.url);
const cliBinPath = require.resolve('@ndulojs/cli/dist/bin.js');

process.argv = [nodeBin, cliBinPath, ...args];

await import(cliBinPath);
