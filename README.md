Docker image for [bull-board]. Allow you to monitor your bull queue without any coding!

Supports both bull and bullmq.

### Quick start with Docker
```
docker run -p 3000:3000 venatum/bull-board:latest
```
will run bull-board interface on `localhost:3000` and connect to your redis instance on `localhost:6379` without password.

To configure redis see "Environment variables" section.

### Quick start with docker-compose

```yaml
services:
    bullboard:
        container_name: bullboard
        image: venatum/bull-board
        restart: unless-stopped
        ports:
            - "3000:3000"
```
will run bull-board interface on `localhost:3000` and connect to your redis instance on `localhost:6379` without password.

see "Example with docker-compose" section, for example, with env parameters

### Sentinel

It is now possible to use the BullBoard image with Redis Sentinel mode.
Please note that on the interface, the Redis server info button will not work. Feel free to contribute to the development directly at [felixmosh/bull-board](https://github.com/felixmosh/bull-board)

### Environment variables

**Redis**
* `REDIS_HOST` - host to connect to redis (`localhost` by default)
* `REDIS_PORT` - redis port (`6379` by default)
* `REDIS_DB` - redis db to use (`'0'` by default)
* `REDIS_USE_TLS` - enable TLS true or false (`false` by default)
* `REDIS_USER` - user to connect to redis (no user by default)
* `REDIS_PASSWORD` - password to connect to redis (no password by default)
* `REDIS_FAMILY` - IP Stack version (one of 4 | 6 | 0) (`0` by default)
* `SENTINEL_NAME` - name of sentinel instance (required with sentinel)
* `SENTINEL_HOSTS` - a string containing a list of replica servers (e.g. '1.redis:26379,2.redis:26379,3.redis:26379'), overrides `REDIS_HOST` + `REDIS_PORT` configuration (you can use `,` or `;`)
* `MAX_RETRIES_PER_REQUEST` - makes sure commands won't wait forever when the connection is down (disabled `null` by default)

**Interface**
* `PROXY_PATH` - proxyPath for bull board, e.g. https://<server_name>/my-base-path/queues [docs] (`''` by default)
* `USER_LOGIN` - login to restrict access to bull-board interface (disabled by default)
* `USER_PASSWORD` - password to restrict access to bull-board interface (disabled by default)

**Queue setup**
* `BULL_PREFIX` - prefix to your bull queue name (`bull` by default)
* `BULL_VERSION` - version of bull lib to use 'BULLMQ' or 'BULL' (`BULLMQ` by default)
* `BACKOFF_STARTING_DELAY` - The delay, in milliseconds, before starts the research for the first time (`500` by default)
* `BACKOFF_MAX_DELAY` - The maximum delay, in milliseconds, between two consecutive attempts (`Infinity` by default)
* `BACKOFF_TIME_MULTIPLE` - The `BACKOFF_STARTING_DELAY` is multiplied by the `BACKOFF_TIME_MULTIPLE` to increase the delay between reattempts (`2` by default)
* `BACKOFF_NB_ATTEMPTS` - The maximum number of times to attempt the research (`10` by default)

### Restrict access with login and password

To restrict access to bull-board use `USER_LOGIN` and `USER_PASSWORD` env vars.
Only when both `USER_LOGIN` and `USER_PASSWORD` specified, access will be restricted with login/password

### Healthcheck

A Healthcheck based on NestJS is available to monitor the status of the container and the Redis service. `/healthcheck`
```json
{
	"status": "ok",
	"info": {
		"redis": {
			"status": "up",
			"description": "Based on the Redis PING/PONG system"
		}
	}
}
```

| Field     | Description                                                                                                        | Type            |
|-----------|--------------------------------------------------------------------------------------------------------------------|-----------------|
| `status`  | 	Indicates the overall health status. If any health indicator fails, the status will be 'error'.                   | 'ok' or 'error' |
| `info`    | 	Object containing information of each health indicator which is of status 'up', or in other words "healthy".	     | object          |
| `error`   | 	String containing information of each health indicator which is of status 'down', or in other words "unhealthy".	 | string          |
| `details` | 	Object containing all information of each health indicator	                                                       | object          |

### Example with docker-compose

```yaml
services:
    redis:
        container_name: redis
        image: redis:alpine
        restart: unless-stopped
        ports:
            - "6379:6379"
        volumes:
            - redis_db_data:/data

    bullboard:
        container_name: bullboard
        image: venatum/bull-board:latest
        restart: unless-stopped
        environment:
            REDIS_HOST: redis
            REDIS_PORT: 6379
            REDIS_PASSWORD: example-password
            REDIS_USE_TLS: 'false'
            BULL_PREFIX: bull
        ports:
            - "3000:3000"
        depends_on:
            - redis

volumes:
    redis_db_data:
        external: false
```

[bull-board]: https://github.com/felixmosh/bull-board
[bull-board]: https://github.com/felixmosh/bull-board#hosting-router-on-a-sub-path
