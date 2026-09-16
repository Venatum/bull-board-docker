# /test-all

Run the test suites and report results.

## Steps

1. Run `npm test` (unit tests, vitest — fast, no external deps).
2. **e2e (optional, Docker required):** run when the change touches runtime
   behavior / an env-var feature (auth, proxy path, prefix, version), or when
   full validation is requested. Run `npm run test:e2e` — it builds the image,
   starts the stack (`tests/docker-compose.e2e.yml`), seeds jobs, and runs the
   Playwright suite. It does **not** tear down, so run `npm run stop:e2e`
   afterwards. For a fast re-run against an already-running stack, use
   `npm run test:e2e:suite`. Skip this step (and say so) if Docker is
   unavailable.
3. Report results in this format:

```
## Test Results

### Unit (vitest)
**Status**: ✅ PASS | ❌ FAIL
**Tests**: X passed, Y failed, Z total

### E2E (Playwright) — skipped if Docker unavailable / not warranted
**Status**: ✅ PASS | ❌ FAIL | ⏭️ SKIPPED (reason)
**Tests**: X passed, Y failed, Z total

### Failed tests (if any)
- `test name` — reason

### Verdict
READY TO COMMIT | DO NOT COMMIT — fix failing tests first
```

## Allowed tools

- Bash(npm test:\*)
- Bash(npm run:\*)
