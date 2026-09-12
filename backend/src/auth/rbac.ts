/**
 * rbac.ts — Role-Based Access Control
 *
 * Roles are BACKEND-ONLY writable via Firebase Admin SDK custom claims.
 * No client-facing API accepts role or institution writes.
 *
 * Compliance note: Firebase Authentication proves identity.
 * The 21 CFR Part 11 e-signature chain is:
 *   authenticated user → explicit intent → DecisionProof[] → audit event → artifactHash
 * Firebase login alone does not satisfy Part 11.
 */

export const ROLES = {
  PRINCIPAL_INVESTIGATOR: 'PI',
  CLINICAL_RESEARCH_COORDINATOR: 'CRC',
  SPONSOR_MONITOR: 'SPONSOR_MONITOR',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  READ_ONLY: 'READ_ONLY',
} as const;

export type RoleValue = (typeof ROLES)[keyof typeof ROLES];

export interface UserClaims {
  uid: string;
  email: string;
  role: RoleValue;
  institution: string;
}

/**
 * Check whether the given user claims include any of the required roles.
 */
export function checkRole(claims: UserClaims, requiredRoles: RoleValue[]): boolean {
  return requiredRoles.includes(claims.role);
}

import type { Request, Response, NextFunction } from 'express';

/** Express middleware: require that the authenticated user has one of the given roles. */
export function requireRole(...roles: RoleValue[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const claims = (req as Request & { userClaims?: UserClaims }).userClaims;
    if (!claims) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }
    if (!checkRole(claims, roles)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Role '${claims.role}' is not authorized for this action. Required: ${roles.join(' or ')}`,
      });
      return;
    }
    next();
  };
}
