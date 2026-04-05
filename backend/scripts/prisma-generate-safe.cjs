#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const clientDir = path.join(projectRoot, 'node_modules', '.prisma', 'client');
const prismaCli = path.join(
  projectRoot,
  'node_modules',
  'prisma',
  'build',
  'index.js',
);
const maxAttempts = Number(process.env.PRISMA_GENERATE_MAX_ATTEMPTS ?? 5);
const retryDelayMs = Number(process.env.PRISMA_GENERATE_RETRY_DELAY_MS ?? 1500);
const engineFileName = 'query_engine-windows.dll.node';

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function cleanupTemporaryEngineFiles() {
  if (!fs.existsSync(clientDir)) {
    return;
  }

  for (const entry of fs.readdirSync(clientDir)) {
    if (!entry.startsWith(`${engineFileName}.tmp`)) {
      continue;
    }

    try {
      fs.rmSync(path.join(clientDir, entry), { force: true });
    } catch {
      // Ignore cleanup failures and let the generate step report the root cause.
    }
  }
}

function findLikelyLockingProcesses() {
  if (process.platform !== 'win32') {
    return [];
  }

  const command = [
    '$project = [Regex]::Escape((Resolve-Path "."));',
    "Get-CimInstance Win32_Process | Where-Object {",
    "  $_.Name -eq 'node.exe' -and",
    '  $_.CommandLine -match $project',
    '} | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress',
  ].join(' ');

  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-Command', command],
    {
      cwd: projectRoot,
      encoding: 'utf8',
    },
  );

  if (result.status !== 0 || !result.stdout.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(result.stdout);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function runGenerate() {
  return spawnSync(process.execPath, [prismaCli, 'generate', '--schema=prisma/schema.prisma'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });
}

function printResult(result) {
  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

function isWindowsLockError(result) {
  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

  return (
    process.platform === 'win32' &&
    combined.includes('EPERM: operation not permitted, rename') &&
    combined.includes(engineFileName)
  );
}

cleanupTemporaryEngineFiles();

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const result = runGenerate();
  printResult(result);

  if (result.status === 0) {
    cleanupTemporaryEngineFiles();
    process.exit(0);
  }

  if (!isWindowsLockError(result) || attempt === maxAttempts) {
    if (isWindowsLockError(result)) {
      const lockingProcesses = findLikelyLockingProcesses();

      if (lockingProcesses.length > 0) {
        process.stderr.write(
          '\nPrisma Client is likely locked by a running local Node process in this project.\n',
        );

        for (const processInfo of lockingProcesses) {
          process.stderr.write(
            `- PID ${processInfo.ProcessId}: ${processInfo.CommandLine}\n`,
          );
        }

        process.stderr.write(
          'Stop the running backend/frontend process, then retry the command.\n',
        );
      }
    }

    process.exit(result.status ?? 1);
  }

  process.stderr.write(
    `\nPrisma engine file is temporarily locked on Windows. Retrying in ${retryDelayMs}ms (${attempt}/${maxAttempts})...\n`,
  );
  cleanupTemporaryEngineFiles();
  sleep(retryDelayMs);
}

process.exit(1);
