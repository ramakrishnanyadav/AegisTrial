# Postmortem: Recurring LYZR_API_KEY / GITHUB_CLIENT_SECRET Exposure

## Summary

A live Lyzr API key and GitHub OAuth client secret were historically exposed across prior project export iterations via:
1. A committed-adjacent `.env` file included in full directory zip exports.
2. Hardcoded secret literals inside un-tracked scratch test scripts.
3. Re-emergence of un-ignored configuration files in initial archive packaging.
4. Copy-pasting unredacted `curl` debug commands into support threads.

---

## Timeline

- **Round 1-2**: Local development relied on `zip -r` of the working tree, which bundled local `.env` files regardless of `.gitignore`.
- **Round 3**: Secret literals were removed from code files, but scratch test scripts retaining hardcoded tokens remained in working directories.
- **Round 4**: Live secret exposure incident identified; secrets rotated. `scripts/check-secrets.ts` created.
- **Round 5**: Packaging script (`scripts/package.ts`) upgraded to a strict, explicit allowlist model. `.env` and `scratch/` files structurally excluded from distribution builds.

---

## Root Cause Analysis

The root cause was procedural reliance on generic directory compression (`zip -r .`) without a deterministic packaging allowlist or automated CI secret scanning pre-commit hooks. Before the implementation of `scripts/package.ts`, export processes bundled all un-ignored local files by default.

---

## Structural Fixes Implemented

1. **Deterministic Packaging Allowlist (`scripts/package.ts`)**:
   - Replaced recursive directory zipping with an explicit file/folder allowlist (`ALLOWLIST`).
   - `.env`, `.env.*`, `node_modules`, `*.db`, and `scratch/` are structurally impossible to bundle into `aegistrial.zip`.

2. **Automated Secret Scanner (`scripts/check-secrets.ts`)**:
   - Scanning regex patterns expanded to detect AWS Access Keys, GitHub OAuth secrets, Google API Keys, Bearer Auth headers, and Lyzr API key literals.
   - Pre-package execution gate: `scripts/package.ts` executes `check-secrets.ts` automatically and aborts archive creation if any hardcoded secret is detected.

3. **Key Rotation Protocol**:
   - Every historical key involved in prior exposures was permanently revoked and replaced with new credentials.

---

## Verification & Prevention Protocol

- [x] **Packaging Allowlist Verification**: `npm run package` executed and verified that `.env` is absent from `aegistrial.zip`.
- [x] **CI Gate Integration**: `.github/workflows/ci.yml` runs `npm run check-secrets` on every push and pull request.
- [x] **Scratch File Prohibition**: `scratch/` directory excluded from git tracking and packaging allowlists.

---

## Status: CLOSED

Verified closed as of `2026-09-12T17:42:00Z` following automated allowlist enforcement and key rotation.
