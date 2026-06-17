# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                    # Run tests (vitest run)
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
npm start                   # Run the app locally (needs Redis)
npm run start:docker        # Start app + Redis via docker compose
npm run start:docker-deps   # Start Redis only
npm run stop:docker         # Stop and clean containers
```

Run a single test file:

```bash
npx vitest run tests/unit/redis.test.js
```

## Architecture

This is a thin Express wrapper that auto-discovers Bull/BullMQ queues from Redis and exposes the bull-board UI.

**Startup flow**: `src/index.js` → sets up Express with session/auth middleware → mounts `bull.js` router → `bull.js` scans Redis keys with exponential backoff until queues are found → registers them with bull-board.

**Key modules** (`src/`):

- `config.js` — Single source of truth for all env vars. Handles `parseBooleanEnv()` and `resolvePemOrPath()` (TLS certs can be PEM strings or file paths). All other modules import from here.
- `redis.js` — Builds ioredis config from `config.js`, supports both direct connection and Sentinel mode (`SENTINEL_HOSTS` triggers sentinel config). Exports `client` (mocked in test env) and `redisConfig`.
- `bull.js` — Scans Redis keys matching `${BULL_PREFIX}:*`, extracts unique queue names, creates Bull or BullMQ adapters based on `BULL_VERSION`, registers them with `createBullBoard`. Uses `backOff()` to retry if no queues found yet. Exports `router` (the bull-board Express router).
- `login.js` — Optional passport-local auth. Only mounted when both `USER_LOGIN` and `USER_PASSWORD` are set.
- `index.js` — Express app entry point. Conditionally enables auth middleware, mounts the board router, and exposes `/healthcheck`.

**Test setup**: `NODE_ENV=test` causes `redis.js` to export a mock client (avoids real Redis connections) and `bull.js` to skip `bullMain()`. Tests in `tests/unit/` use vitest globals (`describe`, `it`, `expect` — no imports needed).

## Conventions

- **Always use existing scripts**: Run commands via `package.json` scripts (`npm test`, `npm run start:docker`, etc.) — never craft manual/ad-hoc commands
- **Code navigation**: Prefer LSP over Grep for go-to-definition, find references, symbol search
- **Package manager**: npm only — yarn/pnpm/bun are blocked in `package.json`
- **Runtime**: Node.js ≥24, ES modules (`"type": "module"`) — use `import`/`export`
- **No TypeScript**, no build step, no frontend framework
- **Commits**: Conventional Commits (see CONTRIBUTING.md)
- **Docker**: `docker compose` (not `docker-compose`)
- **Git**: Never commit or push without explicit user approval
- **Language**: All code, comments, and commits in English
