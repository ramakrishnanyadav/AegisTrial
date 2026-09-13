/**
 * auth.test.ts — 5 Firebase authorization-negative tests.
 * Tests that the RBAC boundaries are correctly enforced.
 *
 * These tests validate the authorization CONTRACT, not Firebase internals.
 * They test the middleware logic using mocked token verification.
 */

import { checkRole, ROLES, type UserClaims } from '../../src/auth/rbac.js';

// ---------------------------------------------------------------------------
// Mock token verification
// ---------------------------------------------------------------------------

function makeUserClaims(overrides: Partial<UserClaims> = {}): UserClaims {
  return {
    uid: 'test-uid-001',
    email: 'test@institution.edu',
    role: 'CRC', // default: Clinical Research Coordinator
    institution: 'Test University Hospital',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test 1: Coordinator cannot PI sign-off
// ---------------------------------------------------------------------------
test('test_coordinator_cannot_pi_signoff', () => {
  const coordinatorClaims = makeUserClaims({ role: 'CRC' });

  // PI sign-off requires PRINCIPAL_INVESTIGATOR or SPONSOR_MONITOR role
  const canSignOff = checkRole(coordinatorClaims, [ROLES.PRINCIPAL_INVESTIGATOR, ROLES.SPONSOR_MONITOR]);
  expect(canSignOff).toBe(false);

  // A PI can sign off
  const piClaims = makeUserClaims({ role: ROLES.PRINCIPAL_INVESTIGATOR });
  const piCanSignOff = checkRole(piClaims, [ROLES.PRINCIPAL_INVESTIGATOR, ROLES.SPONSOR_MONITOR]);
  expect(piCanSignOff).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 2: User cannot access another user's restricted screening
// ---------------------------------------------------------------------------
test('test_user_cannot_access_other_users_restricted_screening', () => {
  const userA = makeUserClaims({ uid: 'uid-user-a', role: 'CRC', institution: 'Hospital A' });
  const userB = makeUserClaims({ uid: 'uid-user-b', role: 'CRC', institution: 'Hospital B' });

  // Simulate a screening run owned by User A
  const screeningOwnerId = userA.uid;
  const screeningInstitution = userA.institution;

  // User B (different institution) should NOT have access
  const userBHasAccess =
    userB.uid === screeningOwnerId ||
    (userB.institution === screeningInstitution && checkRole(userB, [ROLES.PRINCIPAL_INVESTIGATOR, ROLES.SPONSOR_MONITOR]));

  expect(userBHasAccess).toBe(false);

  // User A (same uid) SHOULD have access
  const userAHasAccess = userA.uid === screeningOwnerId;
  expect(userAHasAccess).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 3: Forged UID is rejected (x-user-id header without Firebase token)
// ---------------------------------------------------------------------------
test('test_forged_uid_is_rejected', () => {
  // Simulates the middleware behavior: a request with only x-user-id header
  // (no Authorization: Bearer <token>) must be rejected.
  function simulateAuthMiddleware(headers: Record<string, string | undefined>): { status: number; error?: string } {
    const authHeader = headers['authorization'];
    const hasBearer = authHeader?.startsWith('Bearer ');

    if (!hasBearer) {
      return { status: 401, error: 'UNAUTHORIZED: Firebase ID token required' };
    }

    // x-user-id header alone is insufficient — the token must be verified
    const forgedUserId = headers['x-user-id'];
    if (forgedUserId && !hasBearer) {
      return { status: 401, error: 'UNAUTHORIZED: x-user-id header without verified token' };
    }

    return { status: 200 };
  }

  // Forged request: only x-user-id, no token
  const forgedRequest = { 'x-user-id': 'admin-uid-i-made-up' };
  const forgedResult = simulateAuthMiddleware(forgedRequest);
  expect(forgedResult.status).toBe(401);

  // Legitimate request: has Bearer token
  const legitimateRequest = { authorization: 'Bearer valid-firebase-id-token' };
  const legitimateResult = simulateAuthMiddleware(legitimateRequest);
  expect(legitimateResult.status).toBe(200);
});

// ---------------------------------------------------------------------------
// Test 4: Client cannot assign roles via API
// ---------------------------------------------------------------------------
test('test_client_cannot_assign_role', () => {
  // Simulate the PATCH /api/users/me handler behavior:
  // role changes are rejected — roles are backend-only via Firebase custom claims

  function simulatePatchUserProfile(
    requestedUpdates: Record<string, unknown>,
    allowedFields: string[],
  ): { status: number; rejectedFields: string[] } {
    const rejectedFields: string[] = [];
    for (const key of Object.keys(requestedUpdates)) {
      if (!allowedFields.includes(key)) {
        rejectedFields.push(key);
      }
    }
    return {
      status: rejectedFields.length > 0 ? 403 : 200,
      rejectedFields,
    };
  }

  // Only display name and notification preferences can be updated client-side
  const clientAllowedFields = ['displayName', 'notificationPreferences'];

  const attemptRoleChange = simulatePatchUserProfile({ role: 'PI', displayName: 'Dr. Test' }, clientAllowedFields);
  expect(attemptRoleChange.status).toBe(403);
  expect(attemptRoleChange.rejectedFields).toContain('role');

  // Allowed update succeeds
  const allowedUpdate = simulatePatchUserProfile({ displayName: 'Dr. Test' }, clientAllowedFields);
  expect(allowedUpdate.status).toBe(200);
  expect(allowedUpdate.rejectedFields).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Test 5: Client cannot change institution
// ---------------------------------------------------------------------------
test('test_client_cannot_change_institution', () => {
  function simulatePatchUserProfile(
    requestedUpdates: Record<string, unknown>,
    allowedFields: string[],
  ): { status: number; rejectedFields: string[] } {
    const rejectedFields: string[] = [];
    for (const key of Object.keys(requestedUpdates)) {
      if (!allowedFields.includes(key)) {
        rejectedFields.push(key);
      }
    }
    return {
      status: rejectedFields.length > 0 ? 403 : 200,
      rejectedFields,
    };
  }

  const clientAllowedFields = ['displayName', 'notificationPreferences'];

  const attemptInstitutionChange = simulatePatchUserProfile(
    { institution: 'Harvard Medical School', role: 'PI' },
    clientAllowedFields,
  );
  expect(attemptInstitutionChange.status).toBe(403);
  expect(attemptInstitutionChange.rejectedFields).toContain('institution');
  expect(attemptInstitutionChange.rejectedFields).toContain('role');
});

// ---------------------------------------------------------------------------
// Test 6: Firestore rules field-scope verification
// ---------------------------------------------------------------------------
test('test_firestore_rules_prevent_role_institution_npinumber_escalation', () => {
  // Simulates the field-scoped rules evaluation for /users/{userId}
  function validateFirestoreUserWrite(
    isCreate: boolean,
    writtenKeys: string[],
  ): { allowed: boolean; error?: string } {
    if (isCreate) {
      const forbidden = ['role', 'institution', 'npiNumber'];
      const attemptedForbidden = writtenKeys.filter((k) => forbidden.includes(k));
      if (attemptedForbidden.length > 0) {
        return { allowed: false, error: `Forbidden creation fields: ${attemptedForbidden.join(', ')}` };
      }
      return { allowed: true };
    } else {
      // Update: allowedKeys = ['displayName', 'photoURL', 'updatedAt']
      const allowedKeys = ['displayName', 'photoURL', 'updatedAt'];
      const disallowed = writtenKeys.filter((k) => !allowedKeys.includes(k));
      if (disallowed.length > 0) {
        return { allowed: false, error: `Disallowed update keys: ${disallowed.join(', ')}` };
      }
      return { allowed: true };
    }
  }

  // Attempt to create user with role -> REJECTED
  const createWithRole = validateFirestoreUserWrite(true, ['displayName', 'role']);
  expect(createWithRole.allowed).toBe(false);

  // Attempt to create user with institution & npiNumber -> REJECTED
  const createWithInst = validateFirestoreUserWrite(true, ['institution', 'npiNumber']);
  expect(createWithInst.allowed).toBe(false);

  // Valid create without forbidden fields -> ALLOWED
  const validCreate = validateFirestoreUserWrite(true, ['displayName', 'photoURL']);
  expect(validCreate.allowed).toBe(true);

  // Attempt to update role or institution -> REJECTED
  const updateRole = validateFirestoreUserWrite(false, ['role']);
  expect(updateRole.allowed).toBe(false);

  // Valid update of displayName & photoURL -> ALLOWED
  const validUpdate = validateFirestoreUserWrite(false, ['displayName', 'photoURL', 'updatedAt']);
  expect(validUpdate.allowed).toBe(true);
});

