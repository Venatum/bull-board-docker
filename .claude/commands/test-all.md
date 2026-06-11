# /test-all

Run the full test suite and report results.

## Steps

1. Run `bun test`
2. Report results in this format:

```
## Test Results

**Status**: ✅ PASS | ❌ FAIL

**Tests**: X passed, Y failed, Z total

### Failed tests (if any)
- `test name` — reason

### Verdict
READY TO COMMIT | DO NOT COMMIT — fix failing tests first
```

## Allowed tools

- Bash(bun test:\*)
- Bash(bun run:\*)
