# Cluster example

Redis Cluster setup with three master nodes (no replicas) for local development.
Use this to validate `REDIS_CLUSTER_HOSTS` and cluster mode.

Topology:

- 3 Redis Cluster nodes (masters only, using `redis:alpine`)
- 1 init container (`redis-cli --cluster create`) to bootstrap the cluster

Run:

```
  docker compose up
```

Open:

- http://localhost:3000

Notes:

- The cluster is initialized by a one-shot `redis-cluster-init` container.
- For production (e.g. AWS MemoryDB, ElastiCache), set `REDIS_CLUSTER_HOSTS` to your cluster configuration endpoint.
- Use `REDIS_USE_TLS=true` with cloud-managed clusters that require TLS.
