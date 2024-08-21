import * as dotenv from 'dotenv'

dotenv.config()

function normalizePath(pathStr) {
	return (pathStr || '').replace(/\/$/, '');
}

export const PROXY_PATH = normalizePath(process.env.PROXY_PATH);

export const config = {
	REDIS_PORT: process.env.REDIS_PORT || 6379,
	REDIS_HOST: process.env.REDIS_HOST || 'localhost',
	REDIS_DB: process.env.REDIS_DB || '0',
	REDIS_PASSWORD: process.env.REDIS_PASSWORD,
	REDIS_USE_TLS: process.env.REDIS_USE_TLS,
	BULL_PREFIX: process.env.BULL_PREFIX || 'bull',
	BULL_VERSION: process.env.BULL_VERSION || 'BULLMQ',
	PORT: process.env.PORT || 3000,
	PROXY_PATH: PROXY_PATH,
	USER_LOGIN: process.env.USER_LOGIN,
	USER_PASSWORD: process.env.USER_PASSWORD,

	AUTH_ENABLED: Boolean(process.env.USER_LOGIN && process.env.USER_PASSWORD),
	HOME_PAGE: PROXY_PATH || '/',
	LOGIN_PAGE: `${PROXY_PATH}/login`,

	BACKOFF_STARTING_DELAY: process.env.BACKOFF_STARTING_DELAY || 500,
	BACKOFF_MAX_DELAY: process.env.BACKOFF_MAX_DELAY || Infinity,
	BACKOFF_TIME_MULTIPLE: process.env.BACKOFF_TIME_MULTIPLE || 2,
	BACKOFF_NB_ATTEMPTS: process.env.BACKOFF_NB_ATTEMPTS || 10,

	SENTINEL_NAME: process.env.SENTINEL_NAME,
	SENTINEL_HOSTS: process.env.SENTINEL_HOSTS,
	MAX_RETRIES_PER_REQUEST: process.env.MAX_RETRIES_PER_REQUEST,
};
