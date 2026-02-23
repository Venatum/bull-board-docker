# Demo bull example

Minimal bull-board + Redis example using `BULL` (not BullMQ). Useful if you still
run legacy Bull queues.

What it does:
- Starts Redis (standalone)
- Starts bull-board with `BULL_VERSION=BULL`

Run:
```
  docker compose up
```

Open:
- http://localhost:3000

Notes:
- Redis is exposed on port 6379 for local inspection.
