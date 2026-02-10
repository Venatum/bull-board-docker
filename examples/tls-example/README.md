# TLS example (self-signed certs)

This example runs Redis with TLS enabled and connects bull-board using TLS.
The certificates in `./certs` are self-signed and intended for local/dev use only.

What it does:
- Starts Redis in TLS-only mode (no plain TCP)
- Starts bull-board with TLS options enabled
- Mounts the CA into the bull-board container so Node trusts it

Generate the certificates (self-signed):
```
  mkdir -p certs

  openssl genrsa -out certs/ca.key 2048
  openssl req -x509 -new -nodes -key certs/ca.key -sha256 -days 3650 \
    -subj "/C=FR/ST=IDF/L=Paris/O=Bull Board Docker/OU=Dev/CN=bull-board-ca" \
    -out certs/ca.crt

  openssl genrsa -out certs/redis.key 2048
  openssl req -new -key certs/redis.key \
    -subj "/C=FR/ST=IDF/L=Paris/O=Bull Board Docker/OU=Dev/CN=redis" \
    -addext "subjectAltName=DNS:redis" \
    -out certs/redis.csr

  openssl x509 -req -in certs/redis.csr -CA certs/ca.crt -CAkey certs/ca.key \
    -CAcreateserial -out certs/redis.crt -days 3650 -sha256 \
    -extfile <(printf "subjectAltName=DNS:redis")

  rm -f certs/redis.csr certs/ca.srl
```

Run:
```
  docker compose up
```

Open:
- http://localhost:3000

Notes:
- This example sets `REDIS_TLS_REJECT_UNAUTHORIZED=false` to keep things simple
  with self-signed certs.
- `NODE_EXTRA_CA_CERTS=/tls/ca.crt` is set to make Node trust the CA.
- For a stricter setup, remove `REDIS_TLS_REJECT_UNAUTHORIZED=false` and keep
  `NODE_EXTRA_CA_CERTS` + `REDIS_TLS_CA=/tls/ca.crt`.
- `REDIS_TLS_CA` accepts either inline PEM or a file path.
