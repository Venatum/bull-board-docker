# Examples

This folder contains ready-to-run `docker compose` examples for common setups.

Run any example:
```
  cd <example-folder>
  docker compose up
```

List of examples:
- `demo-example`: minimal bull-board + Redis (BullMQ default)
- `demo-bull-example`: minimal bull-board + Redis using Bull
- `custom-ui-example`: UI customization via env vars (title/logo/favicon/locale)
- `sentinel-example`: Redis Sentinel topology (1 master, 2 replicas, 3 sentinels)
- `tls-example`: Redis over TLS with self-signed certs (dev/local)
