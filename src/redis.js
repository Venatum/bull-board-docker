import Redis from 'ioredis';

import {config} from "./config.js";

const parseEntry = (entry) => {
	const ipv6Match = entry.match(/^\[(.+)]:(\d+)$/);
	if (ipv6Match) {
		const port = Number.parseInt(ipv6Match[2], 10);
		return { host: ipv6Match[1], port: validatePort(port, entry) };
	}

	const separatorIndex = entry.lastIndexOf(':');
	if (separatorIndex === -1) {
		throw new Error(`Invalid entry "${entry}". Expected host:port`);
	}

	const host = entry.slice(0, separatorIndex).trim();
	const port = Number.parseInt(entry.slice(separatorIndex + 1).trim(), 10);

	if (!host) throw new Error(`Missing host in "${entry}"`);

	return { host, port: validatePort(port, entry) };
};

const validatePort = (port, entry) => {
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error(`Invalid port in "${entry}". Expected a number between 1 and 65535`);
	}
	return port;
};

const parseHostList = (dsn) => {
	if (!dsn || typeof dsn !== 'string') {
		throw new Error('Host list must be a non-empty string');
	}

	return dsn
		.split(/,|;/)
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map(parseEntry);
};

if (config.SENTINEL_HOSTS && config.REDIS_CLUSTER_HOSTS) {
	throw new Error('SENTINEL_HOSTS and REDIS_CLUSTER_HOSTS are mutually exclusive. Please set only one.');
}

export const isCluster = Boolean(config.REDIS_CLUSTER_HOSTS);

export const redisConfig = {
	// https://redis.github.io/ioredis/index.html#RedisOptions
	redis: {
		// Connection options
		// https://redis.github.io/ioredis/interfaces/SentinelConnectionOptions.html
		...(config.SENTINEL_HOSTS && {
			sentinels: parseHostList(config.SENTINEL_HOSTS),
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
			...(config.SENTINEL_TLS_ENABLED && {
				sentinelTLS: {
					...(config.SENTINEL_TLS_CA && {
						ca: config.SENTINEL_TLS_CA,
					}),
					...(config.SENTINEL_TLS_CERT && {
						cert: config.SENTINEL_TLS_CERT,
					}),
					...(config.SENTINEL_TLS_KEY && {
						key: config.SENTINEL_TLS_KEY,
					}),
					...(config.SENTINEL_TLS_SERVERNAME && {
						servername: config.SENTINEL_TLS_SERVERNAME,
					}),
					...(config.SENTINEL_TLS_REJECT_UNAUTHORIZED !== undefined && {
						rejectUnauthorized: config.SENTINEL_TLS_REJECT_UNAUTHORIZED,
					}),
					...(config.SENTINEL_TLS_MIN_VERSION && {
						minVersion: config.SENTINEL_TLS_MIN_VERSION,
					}),
					...(config.SENTINEL_TLS_CIPHERS && {
						ciphers: config.SENTINEL_TLS_CIPHERS,
					}),
				}
			}),
			updateSentinels: config.SENTINEL_UPDATE,
			sentinelMaxConnections: config.SENTINEL_MAX_CONNECTIONS,
			failoverDetector: config.SENTINEL_FAILOVER_DETECTOR,
		}),
		...(!config.SENTINEL_HOSTS && !isCluster && {
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
		...(config.REDIS_USE_TLS === 'true' && {
			// ConnectionOptions
			tls: {
				...(config.REDIS_TLS_CA && {
					ca: config.REDIS_TLS_CA
				}),
				...(config.REDIS_TLS_CERT && {
					cert: config.REDIS_TLS_CERT
				}),
				...(config.REDIS_TLS_KEY && {
					key: config.REDIS_TLS_KEY
				}),
				...(config.REDIS_TLS_SERVERNAME && {
					servername: config.REDIS_TLS_SERVERNAME
				}),
				...(config.REDIS_TLS_REJECT_UNAUTHORIZED !== undefined && {
					rejectUnauthorized: config.REDIS_TLS_REJECT_UNAUTHORIZED
				}),
				...(config.REDIS_TLS_MIN_VERSION && {
					minVersion: config.REDIS_TLS_MIN_VERSION
				}),
				...(config.REDIS_TLS_CIPHERS && {
					ciphers: config.REDIS_TLS_CIPHERS
				})
			}
		}),

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

const parseNatMap = (jsonStr) => {
	if (!jsonStr) return undefined;
	try {
		return JSON.parse(jsonStr);
	} catch {
		throw new Error(`Invalid REDIS_CLUSTER_NAT_MAP JSON: ${jsonStr}`);
	}
};

export const clusterConfig = isCluster ? {
	nodes: parseHostList(config.REDIS_CLUSTER_HOSTS),
	options: {
		// Per-node Redis options (excludes host/port/sentinels/enableOfflineQueue/readOnly per ioredis types)
		redisOptions: {
			...(config.REDIS_USER && { username: config.REDIS_USER }),
			...(config.REDIS_PASSWORD && { password: config.REDIS_PASSWORD }),
			...(config.REDIS_USE_TLS === 'true' && {
				tls: {
					...(config.REDIS_TLS_CA && { ca: config.REDIS_TLS_CA }),
					...(config.REDIS_TLS_CERT && { cert: config.REDIS_TLS_CERT }),
					...(config.REDIS_TLS_KEY && { key: config.REDIS_TLS_KEY }),
					...(config.REDIS_TLS_SERVERNAME && { servername: config.REDIS_TLS_SERVERNAME }),
					...(config.REDIS_TLS_REJECT_UNAUTHORIZED !== undefined && { rejectUnauthorized: config.REDIS_TLS_REJECT_UNAUTHORIZED }),
					...(config.REDIS_TLS_MIN_VERSION && { minVersion: config.REDIS_TLS_MIN_VERSION }),
					...(config.REDIS_TLS_CIPHERS && { ciphers: config.REDIS_TLS_CIPHERS }),
				}
			}),
			...(config.REDIS_COMMAND_TIMEOUT && { commandTimeout: config.REDIS_COMMAND_TIMEOUT }),
			...(config.REDIS_SOCKET_TIMEOUT && { socketTimeout: config.REDIS_SOCKET_TIMEOUT }),
			...(config.REDIS_CONNECT_TIMEOUT && { connectTimeout: config.REDIS_CONNECT_TIMEOUT }),
			keepAlive: config.REDIS_KEEP_ALIVE,
			noDelay: config.REDIS_NO_DELAY,
			...(config.REDIS_CONNECTION_NAME && { connectionName: config.REDIS_CONNECTION_NAME }),
			maxRetriesPerRequest: null,
		},

		// Cluster-level options
		scaleReads: config.REDIS_CLUSTER_SCALE_READS,
		maxRedirections: config.REDIS_CLUSTER_MAX_REDIRECTIONS,
		enableOfflineQueue: config.REDIS_ENABLE_OFFLINE_QUEUE,
		enableReadyCheck: config.REDIS_ENABLE_READY_CHECK,
		enableAutoPipelining: config.REDIS_CLUSTER_ENABLE_AUTO_PIPELINING,
		lazyConnect: config.REDIS_CLUSTER_LAZY_CONNECT,

		// Slot management
		slotsRefreshTimeout: config.REDIS_CLUSTER_SLOTS_REFRESH_TIMEOUT,
		...(config.REDIS_CLUSTER_SLOTS_REFRESH_INTERVAL && {
			slotsRefreshInterval: config.REDIS_CLUSTER_SLOTS_REFRESH_INTERVAL,
		}),

		// Retry delays
		retryDelayOnFailover: config.REDIS_CLUSTER_RETRY_DELAY_ON_FAILOVER,
		retryDelayOnClusterDown: config.REDIS_CLUSTER_RETRY_DELAY_ON_CLUSTER_DOWN,
		retryDelayOnTryAgain: config.REDIS_CLUSTER_RETRY_DELAY_ON_TRY_AGAIN,
		retryDelayOnMoved: config.REDIS_CLUSTER_RETRY_DELAY_ON_MOVED,

		// DNS lookup override (useful for AWS ElastiCache/MemoryDB with TLS)
		...(config.REDIS_CLUSTER_SKIP_DNS_LOOKUP && {
			dnsLookup: (address, callback) => callback(null, address),
		}),

		// NAT mapping (for environments where cluster nodes advertise internal addresses)
		...(config.REDIS_CLUSTER_NAT_MAP && {
			natMap: parseNatMap(config.REDIS_CLUSTER_NAT_MAP),
		}),
	}
} : null;

function createRedisClient() {
	if (isCluster) {
		return new Redis.Cluster(clusterConfig.nodes, clusterConfig.options);
	}
	return Redis.createClient(redisConfig.redis);
}

// https://github.com/redis/node-redis/blob/master/docs/v3-to-v4.md
export const client = process.env.NODE_ENV === 'test'
	? {
		keys: () => Promise.resolve([]),
		connection: 'mock-connection',
		on: () => {},
		nodes: () => [],
		duplicate: () => ({
			keys: () => Promise.resolve([]),
			on: () => {},
		}),
	}
	: createRedisClient();

// Only add error handler in non-test environment
if (process.env.NODE_ENV !== 'test') {
	client.on('error', err => console.log('Redis Client Error', err));
}
