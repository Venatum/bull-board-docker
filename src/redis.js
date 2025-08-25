import Redis from 'ioredis';

import {config} from "./config.js";

const parseDSNToSentinels = (dsn) => {
	const hostChain = dsn.split(/,|;/);

	return hostChain.map((host) => ({
		host: host.split(':')[0],
		port: Number.parseInt(host.split(':')[1]),
	}));
}

export const redisConfig = {
	// https://redis.github.io/ioredis/index.html#RedisOptions
	redis: {
		// Connection options
		// https://redis.github.io/ioredis/interfaces/SentinelConnectionOptions.html
		...(config.SENTINEL_HOSTS && {
			sentinels: parseDSNToSentinels(config.SENTINEL_HOSTS),
			name: config.SENTINEL_NAME,
			role: config.SENTINEL_ROLE,
			maxRetriesPerRequest: config.MAX_RETRIES_PER_REQUEST || null,
			...(config.SENTINEL_USERNAME && {
				sentinelUsername: config.SENTINEL_USERNAME
			}),
			...(config.SENTINEL_PASSWORD && {
				sentinelPassword: config.SENTINEL_PASSWORD
			}),
			...(config.SENTINEL_COMMAND_TIMEOUT && {
				sentinelCommandTimeout: config.SENTINEL_COMMAND_TIMEOUT
			}),
			enableTLSForSentinelMode: config.SENTINEL_TLS_ENABLED,
			updateSentinels: config.SENTINEL_UPDATE,
			sentinelMaxConnections: config.SENTINEL_MAX_CONNECTIONS,
			failoverDetector: config.SENTINEL_FAILOVER_DETECTOR,
		}),
		...(!config.SENTINEL_HOSTS && {
			port: config.REDIS_PORT,
			host: config.REDIS_HOST,
			family: config.REDIS_FAMILY,
		}),
		db: config.REDIS_DB,

		// Authentication options
		...(config.REDIS_USER && {
			// Redis 6+ requires a username and password to be set
			username: config.REDIS_USER
		}),
		...(config.REDIS_PASSWORD && {
			password: config.REDIS_PASSWORD
		}),

		// TLS options
		tls: config.REDIS_USE_TLS === 'true',

		// Timeout options
		...(config.REDIS_COMMAND_TIMEOUT && {
			commandTimeout: config.REDIS_COMMAND_TIMEOUT
		}),
		...(config.REDIS_SOCKET_TIMEOUT && {
			socketTimeout: config.REDIS_SOCKET_TIMEOUT
		}),
		...(config.REDIS_CONNECT_TIMEOUT && {
			connectTimeout: config.REDIS_CONNECT_TIMEOUT
		}),

		// Connection behavior options
		keepAlive: config.REDIS_KEEP_ALIVE,
		noDelay: config.REDIS_NO_DELAY,
		...(config.REDIS_CONNECTION_NAME && {
			connectionName: config.REDIS_CONNECTION_NAME
		}),

		// Reconnection behavior options
		autoResubscribe: config.REDIS_AUTO_RESUBSCRIBE,
		autoResendUnfulfilledCommands: config.REDIS_AUTO_RESEND_UNFULFILLED,
		enableOfflineQueue: config.REDIS_ENABLE_OFFLINE_QUEUE,
		enableReadyCheck: config.REDIS_ENABLE_READY_CHECK,
	},
};

// https://github.com/redis/node-redis/blob/master/docs/v3-to-v4.md
export const client = process.env.NODE_ENV === 'test'
	? {
		keys: () => Promise.resolve([]),
		connection: 'mock-connection',
		on: () => {},
	}
	: Redis.createClient(redisConfig.redis);

// Only add error handler in non-test environment
if (process.env.NODE_ENV !== 'test') {
	client.on('error', err => console.log('Redis Client Error', err));
}
