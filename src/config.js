import * as dotenv from 'dotenv'

dotenv.config()

function normalizePath(pathStr) {
	return (pathStr || '').replace(/\/$/, '');
}

export const PROXY_PATH = normalizePath(process.env.PROXY_PATH);

export const config = {
	// Redis configuration
	REDIS_PORT: process.env.REDIS_PORT || 6379,
	REDIS_HOST: process.env.REDIS_HOST || 'localhost',
	REDIS_DB: process.env.REDIS_DB || '0',
	REDIS_USER: process.env.REDIS_USER,
	REDIS_PASSWORD: process.env.REDIS_PASSWORD,
	REDIS_USE_TLS: process.env.REDIS_USE_TLS,
	REDIS_FAMILY: Number(process.env.REDIS_FAMILY) || 0,
	SENTINEL_NAME: process.env.SENTINEL_NAME,
	SENTINEL_HOSTS: process.env.SENTINEL_HOSTS,
	MAX_RETRIES_PER_REQUEST: process.env.MAX_RETRIES_PER_REQUEST,

	// Queue configuration
	BULL_PREFIX: process.env.BULL_PREFIX || 'bull',
	BULL_VERSION: process.env.BULL_VERSION || 'BULLMQ',
	BACKOFF_STARTING_DELAY: process.env.BACKOFF_STARTING_DELAY || 500,
	BACKOFF_MAX_DELAY: process.env.BACKOFF_MAX_DELAY || Infinity,
	BACKOFF_TIME_MULTIPLE: process.env.BACKOFF_TIME_MULTIPLE || 2,
	BACKOFF_NB_ATTEMPTS: process.env.BACKOFF_NB_ATTEMPTS || 10,

	// App configuration
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
