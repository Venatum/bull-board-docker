import * as dotenv from 'dotenv'

dotenv.config({
	quiet: true
})

function normalizePath(pathStr) {
	return (pathStr || '').replace(/\/$/, '');
}

export const PROXY_PATH = normalizePath(process.env.PROXY_PATH);

export const config = {
	// Redis configuration
	REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
	REDIS_HOST: process.env.REDIS_HOST || 'localhost',
	REDIS_DB: process.env.REDIS_DB || '0',
	REDIS_USER: process.env.REDIS_USER, // Redis 6+ requires a username and password to be set
	REDIS_PASSWORD: process.env.REDIS_PASSWORD,
	REDIS_USE_TLS: process.env.REDIS_USE_TLS,
	REDIS_FAMILY: Number(process.env.REDIS_FAMILY) || 0,
	SENTINEL_NAME: process.env.SENTINEL_NAME,
	SENTINEL_HOSTS: process.env.SENTINEL_HOSTS,
	MAX_RETRIES_PER_REQUEST: process.env.MAX_RETRIES_PER_REQUEST,

	// Additional Sentinel configuration
	SENTINEL_ROLE: process.env.SENTINEL_ROLE || 'master', // Role to connect to (master or slave)
	SENTINEL_USERNAME: process.env.SENTINEL_USERNAME, // Username for authenticating with Sentinel
	SENTINEL_PASSWORD: process.env.SENTINEL_PASSWORD, // Password for authenticating with Sentinel
	SENTINEL_RETRY_STRATEGY: process.env.SENTINEL_RETRY_STRATEGY, // Strategy for retrying connections to Sentinel
	SENTINEL_RECONNECT_STRATEGY: process.env.SENTINEL_RECONNECT_STRATEGY, // Strategy for reconnecting to Sentinel
	SENTINEL_COMMAND_TIMEOUT: Number(process.env.SENTINEL_COMMAND_TIMEOUT) || undefined, // Timeout for Sentinel commands in ms
	SENTINEL_TLS_ENABLED: process.env.SENTINEL_TLS_ENABLED === 'true', // Enable TLS for Sentinel mode
	SENTINEL_UPDATE: process.env.SENTINEL_UPDATE === 'true', // Whether to update the list of Sentinels
	SENTINEL_MAX_CONNECTIONS: Number(process.env.SENTINEL_MAX_CONNECTIONS) || 10, // Maximum number of connections to Sentinel
	SENTINEL_FAILOVER_DETECTOR: process.env.SENTINEL_FAILOVER_DETECTOR === 'true', // Whether to enable failover detection

	// Additional Redis configuration
	REDIS_COMMAND_TIMEOUT: Number(process.env.REDIS_COMMAND_TIMEOUT) || undefined, // Command timeout in ms
	REDIS_SOCKET_TIMEOUT: Number(process.env.REDIS_SOCKET_TIMEOUT) || undefined, // Socket timeout in ms
	REDIS_KEEP_ALIVE: Number(process.env.REDIS_KEEP_ALIVE) || 0, // Keep-alive in ms
	REDIS_NO_DELAY: process.env.REDIS_NO_DELAY !== 'false', // Disable Nagle's algorithm
	REDIS_CONNECTION_NAME: process.env.REDIS_CONNECTION_NAME, // Connection name for client list
	REDIS_AUTO_RESUBSCRIBE: process.env.REDIS_AUTO_RESUBSCRIBE !== 'false', // Auto resubscribe to channels
	REDIS_AUTO_RESEND_UNFULFILLED: process.env.REDIS_AUTO_RESEND_UNFULFILLED !== 'false', // Resend unfulfilled commands on reconnect
	REDIS_CONNECT_TIMEOUT: Number(process.env.REDIS_CONNECT_TIMEOUT) || 10000, // Connection timeout in ms
	REDIS_ENABLE_OFFLINE_QUEUE: process.env.REDIS_ENABLE_OFFLINE_QUEUE !== 'false', // Enable offline queue
	REDIS_ENABLE_READY_CHECK: process.env.REDIS_ENABLE_READY_CHECK !== 'false', // Enable ready check

	// Queue configuration
	BULL_PREFIX: process.env.BULL_PREFIX || 'bull',
	BULL_VERSION: process.env.BULL_VERSION || 'BULLMQ',
	BACKOFF_STARTING_DELAY: process.env.BACKOFF_STARTING_DELAY || 500,
	BACKOFF_MAX_DELAY: process.env.BACKOFF_MAX_DELAY || Infinity,
	BACKOFF_TIME_MULTIPLE: process.env.BACKOFF_TIME_MULTIPLE || 2,
	BACKOFF_NB_ATTEMPTS: process.env.BACKOFF_NB_ATTEMPTS || 10,

	// App configuration
	BULL_BOARD_HOSTNAME: process.env.BULL_BOARD_HOSTNAME || "0.0.0.0",
	PORT: process.env.PORT || 3000,
	PROXY_PATH: PROXY_PATH,
	USER_LOGIN: process.env.USER_LOGIN,
	USER_PASSWORD: process.env.USER_PASSWORD,
	AUTH_ENABLED: Boolean(process.env.USER_LOGIN && process.env.USER_PASSWORD),
	HOME_PAGE: PROXY_PATH || '/',
	LOGIN_PAGE: `${PROXY_PATH}/login`,

	// Bullboard UI configuration
	BULL_BOARD_TITLE: process.env.BULL_BOARD_TITLE,
	BULL_BOARD_LOGO_PATH: process.env.BULL_BOARD_LOGO_PATH,
	BULL_BOARD_LOGO_WIDTH: process.env.BULL_BOARD_LOGO_WIDTH,
	BULL_BOARD_LOGO_HEIGHT: process.env.BULL_BOARD_LOGO_HEIGHT,
	BULL_BOARD_FAVICON: process.env.BULL_BOARD_FAVICON,
	BULL_BOARD_FAVICON_ALTERNATIVE: process.env.BULL_BOARD_FAVICON_ALTERNATIVE,
	BULL_BOARD_LOCALE: process.env.BULL_BOARD_LOCALE,
	BULL_BOARD_DATE_FORMATS_SHORT: process.env.BULL_BOARD_DATE_FORMATS_SHORT,
	BULL_BOARD_DATE_FORMATS_COMMON: process.env.BULL_BOARD_DATE_FORMATS_COMMON,
	BULL_BOARD_DATE_FORMATS_FULL: process.env.BULL_BOARD_DATE_FORMATS_FULL,
};
