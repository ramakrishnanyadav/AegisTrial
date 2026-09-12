/**
 * firebaseAdmin.ts — Firebase Admin SDK initialization and token verification.
 *
 * The Firebase ID token in Authorization: Bearer <token> header is verified
 * server-side on every protected route.
 *
 * x-user-id header alone is insufficient and will return 401.
 */

import admin from 'firebase-admin';
import type { Request, Response, NextFunction } from 'express';
import type { UserClaims, RoleValue } from './rbac.js';

import { config } from '../config/index.js';

let initialized = false;

export function initFirebaseAdmin(): void {
  if (initialized) return;

  const keyJson = process.env['FIREBASE_ADMIN_KEY_JSON'];
  const projectId = process.env['FIREBASE_PROJECT_ID'];

  if (!projectId) {
    if (config.AUTH_MODE === 'development') {
      console.warn(
        '\n******************************************************************\n' +
        '⚠️  [AUTH WARNING] Firebase not configured & AUTH_MODE=development.\n' +
        '⚠️  Development authentication bypass IS ACTIVE (role = PI).\n' +
        '⚠️  DO NOT USE IN PRODUCTION.\n' +
        '******************************************************************\n'
      );
    } else {
      console.error('[Firebase Admin] FIREBASE_PROJECT_ID not set in production mode. Firebase ID token verification required.');
    }
    return;
  }

  if (keyJson) {
    const serviceAccount = JSON.parse(Buffer.from(keyJson, 'base64').toString('utf-8')) as admin.ServiceAccount;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    // Use Application Default Credentials (Cloud Run, GKE)
    admin.initializeApp({ projectId });
  }

  initialized = true;
  console.log('[Firebase Admin] Initialized');
}

/**
 * Express middleware: verify Firebase ID token.
 * Attaches verified UserClaims to req.userClaims.
 * Returns 401/503 if token is missing, invalid, or auth is uninitialized in production.
 */
export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];

  // Dev mode bypass (active when AUTH_MODE === 'development' and request lacks token or uses dev token)
  if (config.AUTH_MODE === 'development' && (!authHeader || !initialized || authHeader === 'Bearer dev-token')) {
    const devClaims: UserClaims = {
      uid: 'dev-uid',
      email: 'dev@localhost',
      role: 'PI' as RoleValue,
      institution: 'Dev Instance',
    };
    (req as Request & { userClaims?: UserClaims }).userClaims = devClaims;
    next();
    return;
  }

  if (!initialized) {
    res.status(503).json({
      error: 'AUTH_UNAVAILABLE',
      message: 'Authentication service uninitialized. Set FIREBASE_PROJECT_ID or configure AUTH_MODE=development for local testing.',
    });
    return;
  }

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Firebase ID token required in Authorization: Bearer header' });
    return;
  }

  const idToken = authHeader.slice(7);
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const claims: UserClaims = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      role: (decoded['role'] as RoleValue | undefined) ?? 'READ_ONLY',
      institution: (decoded['institution'] as string | undefined) ?? '',
    };
    (req as Request & { userClaims?: UserClaims }).userClaims = claims;
    next();
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired Firebase ID token' });
  }
}
