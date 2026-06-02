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
- Missing or broken tests

### 2. Run tests

Run `npm test`.

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
**Status**: ✅ PASS | ❌ FAIL
X passed, Y failed

#### Failed tests (if any)
- `test name` — reason

### Verdict
✅ READY TO MERGE | ⚠️ MINOR ISSUES (can merge) | ❌ DO NOT MERGE
```

## Allowed tools

- Bash(git:\*)
- Bash(npm test:\*)
- Bash(npm run:\*)
