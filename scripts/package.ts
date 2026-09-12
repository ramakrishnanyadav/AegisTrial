/**
 * package.ts — Deterministic Allowlist Packaging Script for AegisTrial.
 *
 * Creates aegistrial.zip using an explicit allowlist of files and folders.
 * Structurally guarantees that .env, secrets, node_modules, dist, and .db files
 * are physically IMPOSSIBLE to bundle.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ALLOWLIST = [
  'src',
  'backend/src',
  'backend/tests',
  'backend/package.json',
  'backend/tsconfig.json',
  'backend/jest.config.json',
  'shared',
  'agents',
  'scripts',
  'package.json',
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'README.md',
  'TESTING.md',
  'requirements.txt',
  '.github',
  'firestore.rules',
  'Dockerfile',
  'docker-compose.yml',
  '.env.example',
  'metadata.json',
];

function buildZip(): void {
  const rootDir = process.cwd();
  const targetZip = path.join(rootDir, 'aegistrial.zip');

  console.log('[Package] Running pre-package secret scan...');
  try {
    execSync('npx tsx scripts/check-secrets.ts', { stdio: 'inherit' });
  } catch {
    console.error('[Package Error] Secret scan failed. Aborting package creation.');
    process.exit(1);
  }

  if (fs.existsSync(targetZip)) {
    fs.unlinkSync(targetZip);
  }

  const existingAllowlist = ALLOWLIST.filter((p) => fs.existsSync(path.resolve(rootDir, p)));

  console.log('[Package] Building aegistrial.zip from explicit allowlist...');

  const excludeArgs = [
    '--exclude=aegistrial.zip',
    '--exclude=.env',
    '--exclude=.env.*',
    '--exclude=backend/.env',
    '--exclude=node_modules',
    '--exclude=backend/node_modules',
    '--exclude=.git',
    '--exclude=dist',
    '--exclude=backend/dist',
    '--exclude=*.db',
    '--exclude=*.db-shm',
    '--exclude=*.db-wal',
    '--exclude=backend/*.db*',
  ];

  const tarCmd = `tar -a -c -f aegistrial.zip ${excludeArgs.join(' ')} ${existingAllowlist.join(' ')}`;
  
  execSync(tarCmd, { cwd: rootDir, stdio: 'inherit' });

  if (fs.existsSync(targetZip)) {
    const stat = fs.statSync(targetZip);
    console.log(`\n✅ AegisTrial Clean Package Created: aegistrial.zip (${(stat.size / 1024).toFixed(1)} KB)`);
  } else {
    console.error('❌ Failed to create aegistrial.zip');
    process.exit(1);
  }
}

buildZip();
