import {createClient} from 'ioredis';
import {config} from "./config";

const parseDSNToSentinels = (dsn) => {
	const hostChain = dsn.split(/,|;/);

	return hostChain.map((host) => ({
		host: host.split(':')[0],
		port: Number.parseInt(host.split(':')[1]),
	}));
}

export const redisConfig = {
	// TODO: Improve Redis configuration
	// 	https://redis.github.io/ioredis/index.html#RedisOptions
	redis: {
		...(config.SENTINEL_HOSTS && {
			sentinels: parseDSNToSentinels(config.SENTINEL_HOSTS),
			name: config.SENTINEL_NAME,
			maxRetriesPerRequest: config.MAX_RETRIES_PER_REQUEST || null,
		}),
		...(!config.SENTINEL_HOSTS && {
			port: config.REDIS_PORT,
			host: config.REDIS_HOST,
			family: config.REDIS_FAMILY,
		}),
		db: config.REDIS_DB,
		...(config.REDIS_USER && {
			// Redis 6+ requires a username and password to be set
			username: config.REDIS_USER
		}),
		...(config.REDIS_PASSWORD && {
			password: config.REDIS_PASSWORD
		}),
		tls: config.REDIS_USE_TLS === 'true',
	},
};

// https://github.com/redis/node-redis/blob/master/docs/v3-to-v4.md
export const client = createClient(redisConfig.redis);
client.on('error', err => console.log('Redis Client Error', err));
