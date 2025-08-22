import {describe, expect, it, vi} from 'vitest';

describe('Configuration', () => {
	// Save the original process.env
	const originalEnv = process.env;

	// Helper function to get a fresh config
	const getConfig = async () => {
		// Import the module to test
		const {config, PROXY_PATH} = await import('../../src/config.js');
		return {config, PROXY_PATH};
	};

	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();

		// Reset modules to ensure clean imports
		vi.resetModules();

		// Create a fresh copy of process.env for each test
		process.env = {...originalEnv};
	});

	afterAll(() => {
		// Restore the original process.env
		process.env = originalEnv;
	});

	describe('Default Configuration', () => {
		it('should load default values when environment variables are not set', async () => {
			// Import the module to test
			const {config} = await getConfig();

			// Verify default values
			// Redis configuration
			expect(config.REDIS_PORT).toBe(6379);
			expect(config.REDIS_HOST).toBe('localhost');
			expect(config.REDIS_DB).toBe('0');
			expect(config.REDIS_FAMILY).toBe(0);

			// Queue configuration
			expect(config.BULL_PREFIX).toBe('bull');
			expect(config.BULL_VERSION).toBe('BULLMQ');
			expect(config.BACKOFF_STARTING_DELAY).toBe(500);
			expect(config.BACKOFF_TIME_MULTIPLE).toBe(2);
			expect(config.BACKOFF_NB_ATTEMPTS).toBe(10);

			// App configuration
			expect(config.PORT).toBe(3000);
			expect(config.BULL_BOARD_HOSTNAME).toBe('0.0.0.0');
			expect(config.HOME_PAGE).toBe('/');
			expect(config.LOGIN_PAGE).toBe('/login');
			expect(config.AUTH_ENABLED).toBe(false);
		});
	});

	describe('Redis Configuration', () => {
		it('should load Redis configuration from environment variables', async () => {
			// Set environment variables
			process.env.REDIS_PORT = '6380';
			process.env.REDIS_HOST = 'redis-server';
			process.env.REDIS_DB = '1';
			process.env.REDIS_USER = 'user';
			process.env.REDIS_PASSWORD = 'password';
			process.env.REDIS_USE_TLS = 'true';
			process.env.REDIS_FAMILY = '4';

			// Import the module to test
			const {config} = await getConfig();

			// Verify that environment variables were loaded correctly
			expect(config.REDIS_PORT).toBe(6380);
			expect(config.REDIS_HOST).toBe('redis-server');
			expect(config.REDIS_DB).toBe('1');
			expect(config.REDIS_USER).toBe('user');
			expect(config.REDIS_PASSWORD).toBe('password');
			expect(config.REDIS_USE_TLS).toBe('true');
			expect(config.REDIS_FAMILY).toBe(4);
		});

		it('should handle additional Redis configuration options', async () => {
			// Set environment variables
			process.env.REDIS_COMMAND_TIMEOUT = '1000';
			process.env.REDIS_SOCKET_TIMEOUT = '2000';
			process.env.REDIS_KEEP_ALIVE = '5000';
			process.env.REDIS_NO_DELAY = 'false';
			process.env.REDIS_CONNECTION_NAME = 'test-connection';
			process.env.REDIS_AUTO_RESUBSCRIBE = 'false';
			process.env.REDIS_AUTO_RESEND_UNFULFILLED = 'false';
			process.env.REDIS_CONNECT_TIMEOUT = '15000';
			process.env.REDIS_ENABLE_OFFLINE_QUEUE = 'false';
			process.env.REDIS_ENABLE_READY_CHECK = 'false';

			// Import the module to test
			const {config} = await getConfig();

			// Verify that environment variables were loaded correctly
			expect(config.REDIS_COMMAND_TIMEOUT).toBe(1000);
			expect(config.REDIS_SOCKET_TIMEOUT).toBe(2000);
			expect(config.REDIS_KEEP_ALIVE).toBe(5000);
			expect(config.REDIS_NO_DELAY).toBe(false);
			expect(config.REDIS_CONNECTION_NAME).toBe('test-connection');
			expect(config.REDIS_AUTO_RESUBSCRIBE).toBe(false);
			expect(config.REDIS_AUTO_RESEND_UNFULFILLED).toBe(false);
			expect(config.REDIS_CONNECT_TIMEOUT).toBe(15000);
			expect(config.REDIS_ENABLE_OFFLINE_QUEUE).toBe(false);
			expect(config.REDIS_ENABLE_READY_CHECK).toBe(false);
		});
	});

	describe('Sentinel Configuration', () => {
		it('should load Sentinel configuration from environment variables', async () => {
			// Set environment variables
			process.env.SENTINEL_NAME = 'mymaster';
			process.env.SENTINEL_HOSTS = 'sentinel1:26379,sentinel2:26379';
			process.env.SENTINEL_ROLE = 'slave';
			process.env.SENTINEL_USERNAME = 'sentinel-user';
			process.env.SENTINEL_PASSWORD = 'sentinel-password';
			process.env.SENTINEL_COMMAND_TIMEOUT = '5000';
			process.env.SENTINEL_TLS_ENABLED = 'true';
			process.env.SENTINEL_UPDATE = 'true';
			process.env.SENTINEL_MAX_CONNECTIONS = '20';
			process.env.SENTINEL_FAILOVER_DETECTOR = 'true';

			// Import the module to test
			const {config} = await getConfig();

			// Verify that environment variables were loaded correctly
			expect(config.SENTINEL_NAME).toBe('mymaster');
			expect(config.SENTINEL_HOSTS).toBe('sentinel1:26379,sentinel2:26379');
			expect(config.SENTINEL_ROLE).toBe('slave');
			expect(config.SENTINEL_USERNAME).toBe('sentinel-user');
			expect(config.SENTINEL_PASSWORD).toBe('sentinel-password');
			expect(config.SENTINEL_COMMAND_TIMEOUT).toBe(5000);
			expect(config.SENTINEL_TLS_ENABLED).toBe(true);
			expect(config.SENTINEL_UPDATE).toBe(true);
			expect(config.SENTINEL_MAX_CONNECTIONS).toBe(20);
			expect(config.SENTINEL_FAILOVER_DETECTOR).toBe(true);
		});

		it('should use default values for Sentinel configuration when not set', async () => {
			// Import the module to test
			const {config} = await getConfig();

			// Verify default values
			expect(config.SENTINEL_ROLE).toBe('master');
			expect(config.SENTINEL_TLS_ENABLED).toBe(false);
			expect(config.SENTINEL_UPDATE).toBe(false);
			expect(config.SENTINEL_MAX_CONNECTIONS).toBe(10);
			expect(config.SENTINEL_FAILOVER_DETECTOR).toBe(false);
		});
	});

	describe('Queue Configuration', () => {
		it('should load Queue configuration from environment variables', async () => {
			// Set environment variables
			process.env.BULL_PREFIX = 'custom-bull';
			process.env.BULL_VERSION = 'BULL';
			process.env.BACKOFF_STARTING_DELAY = '1000';
			process.env.BACKOFF_MAX_DELAY = '10000';
			process.env.BACKOFF_TIME_MULTIPLE = '3';
			process.env.BACKOFF_NB_ATTEMPTS = '5';

			// Import the module to test
			const {config} = await getConfig();

			// Verify that environment variables were loaded correctly
			expect(config.BULL_PREFIX).toBe('custom-bull');
			expect(config.BULL_VERSION).toBe('BULL');
			expect(config.BACKOFF_STARTING_DELAY).toBe('1000');
			expect(config.BACKOFF_MAX_DELAY).toBe('10000');
			expect(config.BACKOFF_TIME_MULTIPLE).toBe('3');
			expect(config.BACKOFF_NB_ATTEMPTS).toBe('5');
		});
	});

	describe('App Configuration', () => {
		it('should load App configuration from environment variables', async () => {
			// Set environment variables
			process.env.PORT = '4000';
			process.env.BULL_BOARD_HOSTNAME = '127.0.0.1';
			process.env.PROXY_PATH = '/custom-path';
			process.env.USER_LOGIN = 'admin';
			process.env.USER_PASSWORD = 'admin';

			// Import the module to test
			const {config} = await getConfig();

			// Verify that environment variables were loaded correctly
			expect(config.PORT).toBe('4000');
			expect(config.BULL_BOARD_HOSTNAME).toBe('127.0.0.1');
			expect(config.PROXY_PATH).toBe('/custom-path');
			expect(config.USER_LOGIN).toBe('admin');
			expect(config.USER_PASSWORD).toBe('admin');
			expect(config.AUTH_ENABLED).toBe(true);
			expect(config.HOME_PAGE).toBe('/custom-path');
			expect(config.LOGIN_PAGE).toBe('/custom-path/login');
		});

		it('should load Bullboard UI configuration from environment variables', async () => {
			// Set environment variables
			process.env.BULL_BOARD_TITLE = 'Custom Bull Board';
			process.env.BULL_BOARD_LOGO_PATH = '/path/to/logo.png';
			process.env.BULL_BOARD_LOGO_WIDTH = '100';
			process.env.BULL_BOARD_LOGO_HEIGHT = '50';
			process.env.BULL_BOARD_FAVICON = '/path/to/favicon.ico';
			process.env.BULL_BOARD_FAVICON_ALTERNATIVE = '/path/to/alt-favicon.ico';
			process.env.BULL_BOARD_LOCALE = 'fr';
			process.env.BULL_BOARD_DATE_FORMATS_SHORT = 'DD/MM/YYYY';
			process.env.BULL_BOARD_DATE_FORMATS_COMMON = 'DD/MM/YYYY HH:mm';
			process.env.BULL_BOARD_DATE_FORMATS_FULL = 'DD/MM/YYYY HH:mm:ss';

			// Import the module to test
			const {config} = await getConfig();

			// Verify that environment variables were loaded correctly
			expect(config.BULL_BOARD_TITLE).toBe('Custom Bull Board');
			expect(config.BULL_BOARD_LOGO_PATH).toBe('/path/to/logo.png');
			expect(config.BULL_BOARD_LOGO_WIDTH).toBe('100');
			expect(config.BULL_BOARD_LOGO_HEIGHT).toBe('50');
			expect(config.BULL_BOARD_FAVICON).toBe('/path/to/favicon.ico');
			expect(config.BULL_BOARD_FAVICON_ALTERNATIVE).toBe('/path/to/alt-favicon.ico');
			expect(config.BULL_BOARD_LOCALE).toBe('fr');
			expect(config.BULL_BOARD_DATE_FORMATS_SHORT).toBe('DD/MM/YYYY');
			expect(config.BULL_BOARD_DATE_FORMATS_COMMON).toBe('DD/MM/YYYY HH:mm');
			expect(config.BULL_BOARD_DATE_FORMATS_FULL).toBe('DD/MM/YYYY HH:mm:ss');
		});
	});

	describe('Path Handling', () => {
		it('should normalize paths correctly', async () => {
			// Set environment variables with trailing slashes
			process.env.PROXY_PATH = '/custom-path/';

			// Import the module to test
			const {config, PROXY_PATH} = await getConfig();

			// Verify that paths were normalized correctly
			expect(PROXY_PATH).toBe('/custom-path');
			expect(config.PROXY_PATH).toBe('/custom-path');
			expect(config.HOME_PAGE).toBe('/custom-path');
			expect(config.LOGIN_PAGE).toBe('/custom-path/login');
		});

		it('should handle empty proxy path', async () => {
			// Set environment variables with empty proxy path
			process.env.PROXY_PATH = '';

			// Import the module to test
			const {config, PROXY_PATH} = await getConfig();

			// Verify that paths were handled correctly
			expect(PROXY_PATH).toBe('');
			expect(config.PROXY_PATH).toBe('');
			expect(config.HOME_PAGE).toBe('/');
			expect(config.LOGIN_PAGE).toBe('/login');
		});

		it('should handle undefined proxy path', async () => {
			// Unset PROXY_PATH
			delete process.env.PROXY_PATH;

			// Import the module to test
			const {config, PROXY_PATH} = await getConfig();

			// Verify that paths were handled correctly
			expect(PROXY_PATH).toBe('');
			expect(config.PROXY_PATH).toBeFalsy();
			expect(config.HOME_PAGE).toBe('/');
			expect(config.LOGIN_PAGE).toBe('/login');
		});
	});

	describe('Authentication', () => {
		it('should set AUTH_ENABLED to true when USER_LOGIN and USER_PASSWORD are set', async () => {
			// Set environment variables
			process.env.USER_LOGIN = 'admin';
			process.env.USER_PASSWORD = 'password';

			// Import the module to test
			const {config} = await getConfig();

			// Verify that AUTH_ENABLED is true
			expect(config.AUTH_ENABLED).toBe(true);
		});

		it('should set AUTH_ENABLED to false when USER_LOGIN is not set', async () => {
			// Set environment variables
			process.env.USER_PASSWORD = 'password';
			delete process.env.USER_LOGIN;

			// Import the module to test
			const {config} = await getConfig();

			// Verify that AUTH_ENABLED is false
			expect(config.AUTH_ENABLED).toBe(false);
		});

		it('should set AUTH_ENABLED to false when USER_PASSWORD is not set', async () => {
			// Set environment variables
			process.env.USER_LOGIN = 'admin';
			delete process.env.USER_PASSWORD;

			// Import the module to test
			const {config} = await getConfig();

			// Verify that AUTH_ENABLED is false
			expect(config.AUTH_ENABLED).toBe(false);
		});
	});
});
