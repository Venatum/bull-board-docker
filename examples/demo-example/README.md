# Demo example

Minimal bull-board + Redis example. This is the quickest way to validate the image
and defaults (BullMQ, no auth, no TLS).

What it does:
- Starts Redis (standalone)
- Starts bull-board connected to Redis

Run:
```
  docker compose up
```

Open:
- http://localhost:3000

Notes:
- Redis is exposed on port 6379 for local inspection.
