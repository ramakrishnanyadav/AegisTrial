/**
 * package.ts — Deterministic Allowlist Packaging Script for AegisTrial.
 *
 * Creates aegistrial.zip using an explicit allowlist of files and folders.
 * Structurally guarantees that .env, secrets, node_modules, dist, and .db files
 * are physically IMPOSSIBLE to bundle.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import AdmZip from 'adm-zip';

const ALLOWLIST = [
  'src',
  'public',
  'backend/src',
  'backend/tests',
  'backend/package.json',
  'backend/tsconfig.json',
  'backend/jest.config.json',
  'backend/migrations',
  'shared',
  'agents',
  'scripts',
  'docs',
  'package.json',
  'index.html',
  'vite.config.ts',
  'tsconfig.json',
  'README.md',
  'TESTING.md',
  'CONTRIBUTING.md',
  'DATA_ARCHITECTURE.md',
  'CHANGELOG.md',
  'requirements.txt',
  '.github',
  'firestore.rules',
  'Dockerfile',
  'docker-compose.yml',
  '.env.example',
  'metadata.json',
];

function shouldExclude(relPath: string): boolean {
  const norm = relPath.replaceAll('\\', '/');
  if (norm.startsWith('.env') || norm.includes('/.env')) return true;
  if (norm.includes('node_modules')) return true;
  if (norm.includes('/dist/') || norm.endsWith('/dist') || norm === 'dist' || norm === 'backend/dist') return true;
  if (norm.includes('.git')) return true;
  if (norm.endsWith('.db') || norm.endsWith('.db-shm') || norm.endsWith('.db-wal')) return true;
  if (norm === 'aegistrial.zip') return true;
  return false;
}

function addPathToZip(zip: AdmZip, rootDir: string, relPath: string): void {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) return;

  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    if (!shouldExclude(relPath)) {
      const content = fs.readFileSync(fullPath);
      zip.addFile(relPath.replaceAll('\\', '/'), content);
    }
  } else if (stat.isDirectory()) {
    const entries = fs.readdirSync(fullPath);
    for (const entry of entries) {
      const childRelPath = path.join(relPath, entry);
      addPathToZip(zip, rootDir, childRelPath);
    }
  }
}

function buildZip(): void {
  const rootDir = process.cwd();
  const targetZip = path.join(rootDir, 'aegistrial.zip');

  console.log('[Package] Running pre-package secret scan...');
  try {
    execSync('npx tsx scripts/check-secrets.ts', { stdio: 'inherit', env: { ...process.env } });
  } catch {
    console.error('[Package Error] Secret scan failed. Aborting package creation.');
    process.exit(1);
  }

  if (fs.existsSync(targetZip)) {
    fs.unlinkSync(targetZip);
  }

  console.log('[Package] Building aegistrial.zip from explicit allowlist...');
  const zip = new AdmZip();

  for (const item of ALLOWLIST) {
    addPathToZip(zip, rootDir, item);
  }

  zip.writeZip(targetZip);

  if (fs.existsSync(targetZip)) {
    const stat = fs.statSync(targetZip);
    console.log(`\n✅ AegisTrial Clean Package Created: aegistrial.zip (${(stat.size / 1024).toFixed(1)} KB)`);
  } else {
    console.error('❌ Failed to create aegistrial.zip');
    process.exit(1);
  }
}

buildZip();

