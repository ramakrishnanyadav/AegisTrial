import fs from 'node:fs';
import path from 'node:path';

const SECRET_PATTERNS = [
  /sk-default-[A-Za-z0-9_-]{20,}/i,
  /GITHUB_CLIENT_SECRET\s*=\s*['"][A-Fa-f0-9]{30,}['"]/i,
  /AKIA[0-9A-Z]{16}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /github_pat_[a-zA-Z0-9_]{82}/,
  /gho_[a-zA-Z0-9]{36}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /x-api-key\s*:\s*['"][a-zA-Z0-9_-]{20,}['"]/i,
  /Authorization\s*:\s*Bearer\s+['"][a-zA-Z0-9._-]{20,}['"]/i,
];

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', '.tempmediaStorage', '.gemini'];
const ALLOWED_FILES = [
  '.env',
  '.env.local',
  'backend/.env',
  'check-secrets.ts',
  'firebase-applet-config.json',
  'src/auth/firebase.ts',
  'src/lib/firebase.ts',
];

function isAllowedFile(relPath: string): boolean {
  return ALLOWED_FILES.some((f) => relPath === f || relPath.endsWith('/' + f));
}

function checkFileSecrets(fullPath: string, relPath: string, errors: string[]): void {
  if (isAllowedFile(relPath)) return;
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(`[SECRET EXPOSURE RISK] Found hardcoded secret matching ${pattern} in ${relPath}`);
      }
    }
  } catch {
    // Skip unreadable files
  }
}

function scanDir(dir: string, errors: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath).replaceAll('\\', '/');

    if (entry.isDirectory() && !IGNORED_DIRS.includes(entry.name)) {
      scanDir(fullPath, errors);
    } else if (entry.isFile()) {
      checkFileSecrets(fullPath, relPath, errors);
    }
  }

  return errors;
}

const errors = scanDir(process.cwd());
if (errors.length > 0) {
  console.error('\n❌ Secret scan failed! Hardcoded secrets detected:');
  errors.forEach((err) => console.error(' - ' + err));
  process.exit(1);
} else {
  console.log('✅ Secret scan passed: Zero hardcoded secrets found in codebase.');
}

