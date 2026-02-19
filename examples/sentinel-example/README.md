# Sentinel example

Redis Sentinel setup with one master, two replicas, and three sentinels.
Use this to validate Sentinel environment variables and discovery.

Topology:
- 1 Redis master
- 2 Redis replicas
- 3 Sentinels

Run:
```
  docker compose up
```

Open:
- http://localhost:3000

Notes:
- The Redis server info button in the UI does not work in Sentinel mode.
- Sentinel ports are mapped to 26379, 26380, and 26381 on the host.
