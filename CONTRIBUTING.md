# AegisTrial — Contributing & Engineering Guidelines

Welcome to AegisTrial. To preserve system determinism, clinical safety, and auditability, all code changes must comply with the following standards.

---

## 1. Commit Message Hygiene (Conventional Commits)

All commits to AegisTrial must follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature or endpoint (e.g. `feat: add public no-login hash verification endpoint`)
- `fix:` Bug fix or security patch (e.g. `fix: split protocolHash into artifact and criteria hashes`)
- `test:` Adding or updating invariant, unit, contract, or chaos tests
- `docs:` Documentation update (e.g. `docs: update STQA traceability matrix`)
- `refactor:` Code restructuring with zero behavior change
- `chore:` Dependency update or CI pipeline adjustments

### Committing Rule
Feature work must be split into atomic, feature-scoped commits. Avoid monolithic "final fixes" commits.

---

## 2. Pull Request & Quality Gate Requirements

Before submitting a Pull Request, run the local verification suite:

```bash
# 1. Typecheck and linting
npm run lint

# 2. Secret scan check
npm run check-secrets

# 3. Full 47-test invariant suite
npm test --prefix backend

# 4. Packaging check
npm run package
```

All PRs must pass the `quality-gate` workflow in GitHub Actions before merging to `main`.

---

## 3. Mandatory Invariant Test Rule

If a pull request modifies any of the following core modules:
- `backend/src/engine/ruleEngine.ts`
- `backend/src/engine/evidenceResolver.ts`
- `backend/src/phi/phiPipeline.ts`

You **must** include a corresponding invariant test under `backend/tests/invariants/` that actively attempts to violate the modified logic.
