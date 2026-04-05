#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');

const mode = process.argv[2];

if (!mode || !['dev', 'start'].includes(mode)) {
  console.error('Usage: node scripts/run-next.cjs <dev|start>');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const nextCli = path.join(
  projectRoot,
  'node_modules',
  'next',
  'dist',
  'bin',
  'next',
);
const port = process.env.PORT ?? process.env.NEXT_PORT ?? '3001';
const host = process.env.HOST ?? process.env.NEXT_HOST ?? '0.0.0.0';

const child = spawn(process.execPath, [nextCli, mode, '-p', port, '-H', host], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
