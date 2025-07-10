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
* `REDIS_USER` - user to connect to redis (no user by default, Redis 6+)
* `REDIS_PASSWORD` - password to connect to redis (no password by default)
* `REDIS_FAMILY` - IP Stack version (one of 4 | 6 | 0) (`0` by default)
* `SENTINEL_NAME` - name of sentinel instance (required with sentinel)
* `SENTINEL_HOSTS` - a string containing a list of replica servers (e.g. '1.redis:26379,2.redis:26379,3.redis:26379'), overrides `REDIS_HOST` + `REDIS_PORT` configuration (you can use `,` or `;`)
* `MAX_RETRIES_PER_REQUEST` - makes sure commands won't wait forever when the connection is down (disabled `null` by default)

**Sentinel Advanced Options**
* `SENTINEL_ROLE` - role to connect to, either 'master' or 'slave' (`master` by default)
* `SENTINEL_USERNAME` - username for authenticating with Sentinel (disabled by default)
* `SENTINEL_PASSWORD` - password for authenticating with Sentinel (disabled by default)
* `SENTINEL_COMMAND_TIMEOUT` - timeout for Sentinel commands in milliseconds (disabled by default)
* `SENTINEL_TLS_ENABLED` - enable TLS for Sentinel mode (`false` by default)
* `SENTINEL_UPDATE` - whether to update the list of Sentinels (`false` by default)
* `SENTINEL_MAX_CONNECTIONS` - maximum number of connections to Sentinel (`10` by default)
* `SENTINEL_FAILOVER_DETECTOR` - whether to enable failover detection (`false` by default)

**Redis Advanced Options**
* `REDIS_COMMAND_TIMEOUT` - timeout for commands in milliseconds (disabled by default)
* `REDIS_SOCKET_TIMEOUT` - timeout for socket in milliseconds (disabled by default)
* `REDIS_KEEP_ALIVE` - enable/disable keep-alive functionality, value in milliseconds (`0` by default)
* `REDIS_NO_DELAY` - enable/disable Nagle's algorithm (`true` by default)
* `REDIS_CONNECTION_NAME` - set the name of the connection to make it easier to identify (disabled by default)
* `REDIS_AUTO_RESUBSCRIBE` - auto resubscribe to channels when reconnecting (`true` by default)
* `REDIS_AUTO_RESEND_UNFULFILLED` - resend unfulfilled commands on reconnect (`true` by default)
* `REDIS_CONNECT_TIMEOUT` - connection timeout in milliseconds (`10000` by default)
* `REDIS_ENABLE_OFFLINE_QUEUE` - enable/disable the offline queue (`true` by default)
* `REDIS_ENABLE_READY_CHECK` - enable/disable the ready check (`true` by default)

**Interface**
* `BULL_BOARD_HOSTNAME` - host to bind the server to (`0.0.0.0` by default)
* `PORT` - port to bind the server to (`3000` by default)
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

**BullBoard UI** based on [felixmosh/bull-board](https://github.com/felixmosh/bull-board/tree/master?tab=readme-ov-file#board-options)
> Default values come from the original project
* `BULL_BOARD_TITLE` - The Board and page titles (`Bull Dashboard` by default)
* `BULL_BOARD_LOGO_PATH` - Allows you to specify a different logo (`empty` by default)
* `BULL_BOARD_LOGO_WIDTH` - `BULL_BOARD_LOGO_PATH` is required
* `BULL_BOARD_LOGO_HEIGHT` - `BULL_BOARD_LOGO_PATH` is required
* `BULL_BOARD_FAVICON` - Allows you to specify the default favicon (`empty` by default)
* `BULL_BOARD_FAVICON_ALTERNATIVE` - `BULL_BOARD_FAVICON` is required
* `BULL_BOARD_LOCALE` - The locale to use
* `BULL_BOARD_DATE_FORMATS_SHORT` - The date format to use
* `BULL_BOARD_DATE_FORMATS_COMMON` - The date format to use
* `BULL_BOARD_DATE_FORMATS_FULL` - The date format to use

### Restrict access with login and password

To restrict access to bull-board use `USER_LOGIN` and `USER_PASSWORD` env vars.
Only when both `USER_LOGIN` and `USER_PASSWORD` specified, access will be restricted with login/password

### Testing

The project includes a comprehensive test suite using Jest. The tests cover all major components of the application:

- Redis configuration and client
- Bull queue setup
- Express application setup and routes
- Health check endpoint
- Configuration loading
- Authentication

To run the tests:

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

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
