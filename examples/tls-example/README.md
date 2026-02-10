# TLS example (self-signed certs)

This example runs Redis with TLS enabled and connects bull-board using TLS.
The certificates in ./certs are self-signed and intended for local/dev use only.

Run:
```
  docker compose up
```

Bull-board will be available on http://localhost:3000
Note: this example sets `REDIS_TLS_REJECT_UNAUTHORIZED=false` to accept the self-signed CA.
Note: we also set `NODE_EXTRA_CA_CERTS=/tls/ca.crt` and mount `./certs` into the bullboard container to ensure Node trusts the CA.
