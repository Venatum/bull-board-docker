# /qa

Full quality check: code review + tests.

## Steps

### 1. Analyze the diff

Run `git diff HEAD` (or `git diff main..HEAD` if on a feature branch).
Review the changes for:

- Correctness and logic errors
- Security issues (injection, hardcoded secrets, etc.)
- Project conventions: ES modules, no TypeScript, npm only
- Code clarity and simplicity (no over-engineering)
- Missing or broken tests (unit `*.test.js` under vitest; e2e `*.spec.js` under
  Playwright in `tests/e2e/`)

### 2. Run tests

Run `npm test` (unit).

If the diff touches runtime behavior or an env-var feature (auth, proxy path,
prefix, version), also run the e2e suite `npm run test:e2e` (Docker required;
run `npm run stop:e2e` afterwards). Skip and note if Docker is unavailable.

### 3. Report

```
## QA Report

### Code Review
**Status**: ✅ PASS | ⚠️ WARNINGS | ❌ FAIL

#### Issues found
- [CRITICAL] ...
- [WARNING] ...
- [INFO] ...

### Tests
**Unit**: ✅ PASS | ❌ FAIL — X passed, Y failed
**E2E**: ✅ PASS | ❌ FAIL | ⏭️ SKIPPED (reason)

#### Failed tests (if any)
- `test name` — reason

### Verdict
✅ READY TO MERGE | ⚠️ MINOR ISSUES (can merge) | ❌ DO NOT MERGE
```

## Allowed tools

- Bash(git:\*)
- Bash(npm test:\*)
- Bash(npm run:\*)
