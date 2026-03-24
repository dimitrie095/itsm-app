#!/usr/bin/env node

/**
 * Knowledge Base E2E Test Runner
 * 
 * This script runs the knowledge base E2E tests with proper configuration.
 * 
 * Usage:
 *   node e2e/run-knowledge-tests.js [options]
 * 
 * Options:
 *   --headed          Run tests in headed mode (see browser)
 *   --ui              Run tests in UI mode
 *   --grep <pattern>  Run only tests matching pattern
 *   --help            Show help
 * 
 * Examples:
 *   node e2e/run-knowledge-tests.js
 *   node e2e/run-knowledge-tests.js --headed
 *   node e2e/run-knowledge-tests.js --grep "Login"
 *   node e2e/run-knowledge-tests.js --grep "CRUD"
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const isHeaded = args.includes('--headed');
const isUI = args.includes('--ui');
const grepIndex = args.indexOf('--grep');
const grepPattern = grepIndex !== -1 ? args[grepIndex + 1] : null;
const isHelp = args.includes('--help') || args.includes('-h');

if (isHelp) {
  console.log(`
Knowledge Base E2E Test Runner

Usage: node e2e/run-knowledge-tests.js [options]

Options:
  --headed          Run tests in headed mode (see browser)
  --ui              Run tests in UI mode
  --grep <pattern>  Run only tests matching pattern
  --help            Show this help message

Examples:
  node e2e/run-knowledge-tests.js                    # Run all tests
  node e2e/run-knowledge-tests.js --headed           # Run with visible browser
  node e2e/run-knowledge-tests.js --grep "Login"     # Run only login tests
  node e2e/run-knowledge-tests.js --grep "CRUD"      # Run only CRUD tests
  node e2e/run-knowledge-tests.js --ui               # Run in UI mode for debugging
`);
  process.exit(0);
}

// Build the playwright command
const playwrightArgs = ['playwright', 'test', 'e2e/knowledge.spec.ts', '--project=chromium'];

if (isHeaded) {
  playwrightArgs.push('--headed');
}

if (isUI) {
  playwrightArgs.push('--ui');
}

if (grepPattern) {
  playwrightArgs.push('-g', grepPattern);
}

// Add reporter
playwrightArgs.push('--reporter=list');

console.log('\n========================================');
console.log('Running Knowledge Base E2E Tests');
console.log('========================================\n');

if (isHeaded) {
  console.log('Mode: Headed (browser will be visible)\n');
}

if (grepPattern) {
  console.log(`Filter: ${grepPattern}\n`);
}

console.log('Make sure your dev server is running at http://localhost:3000');
console.log('If not, start it with: npm run dev\n');
console.log('Command: npx', playwrightArgs.join(' '), '\n');
console.log('Starting tests...\n');

const child = spawn('npx', playwrightArgs, {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..')
});

child.on('exit', (code) => {
  console.log('\n========================================');
  if (code === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log(`❌ Tests failed with exit code ${code}`);
  }
  console.log('========================================\n');
  process.exit(code);
});
