import {describe, expect, it, vi} from 'vitest';

// override scope wise to avoid log flood
console.log = () => null;

describe('Redis Client', () => {
	// Common mocks
	let mockClient;
	let createClientMock;
	let consoleSpy;

	// Default config
	const defaultConfig = {
		REDIS_PORT: 6379,
		REDIS_HOST: 'localhost',
		REDIS_DB: '0',
		REDIS_USER: 'testuser',
		REDIS_PASSWORD: 'testpassword',
		REDIS_USE_TLS: 'false',
		REDIS_FAMILY: 4,
		REDIS_KEEP_ALIVE: 5000,
		REDIS_NO_DELAY: true,
		REDIS_AUTO_RESUBSCRIBE: true,
		REDIS_AUTO_RESEND_UNFULFILLED: true,
		REDIS_ENABLE_OFFLINE_QUEUE: true,
		REDIS_ENABLE_READY_CHECK: true,
	};

	// Helper function to setup common mocks
	const setupCommonMocks = (config = defaultConfig) => {
		// Mock the ioredis module
		vi.doMock('ioredis', () => ({
			default: {
				createClient: createClientMock,
			}
		}));

		// Mock the config module
		vi.doMock('../../src/config.js', () => ({
			config,
		}));
	};

	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();

		// Reset modules to ensure clean imports
		vi.resetModules();

		// Set up the mock client
		mockClient = {on: vi.fn()};

		// Set up the createClient mock
		createClientMock = vi.fn().mockReturnValue(mockClient);

		// Setup common mocks with default config
		setupCommonMocks();
	});

	afterEach(() => {
		// Restore console.log if it was mocked
		if (consoleSpy) {
			consoleSpy.mockRestore();
			consoleSpy = undefined;
		}
	});

	describe('Basic Configuration', () => {
		it('should create a Redis client with the correct configuration', async () => {
			// Import the module to test
			const {redisConfig, client} = await import('../../src/redis');

			// In test environment, we should get a mock client
			expect(client).toEqual(expect.objectContaining({
				keys: expect.any(Function),
				connection: 'mock-connection',
				on: expect.any(Function),
			}));

			// Verify the Redis configuration is still correct
			expect(redisConfig.redis).toEqual(expect.objectContaining({
				port: 6379,
				host: 'localhost',
				family: 4,
				db: '0',
				username: 'testuser',
				password: 'testpassword',
				keepAlive: 5000,
				noDelay: true,
				autoResubscribe: true,
				autoResendUnfulfilledCommands: true,
				enableOfflineQueue: true,
				enableReadyCheck: true,
			}));
		});

		it('should use mock client in test environment', async () => {
			// Import the module to test
			const {client} = await import('../../src/redis.js');

			// In test environment, createClient should not be called
			expect(createClientMock).not.toHaveBeenCalled();

			// Verify that we get a mock client with the expected interface
			expect(client).toEqual(expect.objectContaining({
				keys: expect.any(Function),
				connection: 'mock-connection',
				on: expect.any(Function),
			}));

			// Test that the mock keys method returns an empty array
			await expect(client.keys()).resolves.toEqual([]);
		});
	});

	describe('Sentinel Configuration', () => {
		it('should parse DSN to sentinels correctly', async () => {
			// Setup mocks with sentinel configuration
			setupCommonMocks({
				SENTINEL_HOSTS: 'host1:26379,host2:26379',
				SENTINEL_NAME: 'mymaster',
				SENTINEL_ROLE: 'master',
			});

			// Import the module to test
			const {redisConfig} = await import('../../src/redis');

			// Verify the sentinel configuration
			expect(redisConfig.redis).toEqual(expect.objectContaining({
				sentinels: [
					{host: 'host1', port: 26379},
					{host: 'host2', port: 26379},
				],
				name: 'mymaster',
				role: 'master',
			}));
		});

		it('should handle semicolon-separated DSN', async () => {
			// Setup mocks with semicolon-separated sentinel configuration
			setupCommonMocks({
				SENTINEL_HOSTS: 'host1:26379;host2:26379',
				SENTINEL_NAME: 'mymaster',
				SENTINEL_ROLE: 'master',
			});

			// Import the module to test
			const {redisConfig} = await import('../../src/redis');

			// Verify the sentinel configuration
			expect(redisConfig.redis).toEqual(expect.objectContaining({
				sentinels: [
					{host: 'host1', port: 26379},
					{host: 'host2', port: 26379},
				],
				name: 'mymaster',
				role: 'master',
			}));
		});
	});

	describe('TLS Configuration', () => {
		it('should include TLS options when REDIS_USE_TLS is true', async () => {
			setupCommonMocks({
				REDIS_USE_TLS: 'true',
				REDIS_TLS_CA: 'ca-cert',
				REDIS_TLS_CERT: 'client-cert',
				REDIS_TLS_KEY: 'client-key',
				REDIS_TLS_SERVERNAME: 'redis.local',
				REDIS_TLS_REJECT_UNAUTHORIZED: false,
				REDIS_TLS_MIN_VERSION: 'TLSv1.2',
				REDIS_TLS_CIPHERS: 'ECDHE-RSA-AES256-GCM-SHA384',
			});

			const {redisConfig} = await import('../../src/redis');

			expect(redisConfig.redis).toEqual(expect.objectContaining({
				tls: {
					ca: 'ca-cert',
					cert: 'client-cert',
					key: 'client-key',
					servername: 'redis.local',
					rejectUnauthorized: false,
					minVersion: 'TLSv1.2',
					ciphers: 'ECDHE-RSA-AES256-GCM-SHA384',
				}
			}));
		});

		it('should not include TLS options when REDIS_USE_TLS is false', async () => {
			setupCommonMocks({
				REDIS_USE_TLS: 'false',
			});

			const {redisConfig} = await import('../../src/redis');

			expect(redisConfig.redis).not.toHaveProperty('tls');
		});

		it('should include Sentinel TLS options when SENTINEL_TLS_ENABLED is true', async () => {
			setupCommonMocks({
				SENTINEL_HOSTS: 'host1:26379',
				SENTINEL_NAME: 'mymaster',
				SENTINEL_ROLE: 'master',
				SENTINEL_TLS_ENABLED: true,
				SENTINEL_TLS_CA: 'sentinel-ca',
				SENTINEL_TLS_CERT: 'sentinel-cert',
				SENTINEL_TLS_KEY: 'sentinel-key',
				SENTINEL_TLS_SERVERNAME: 'sentinel.local',
				SENTINEL_TLS_REJECT_UNAUTHORIZED: false,
				SENTINEL_TLS_MIN_VERSION: 'TLSv1.2',
				SENTINEL_TLS_CIPHERS: 'ECDHE-RSA-AES128-GCM-SHA256',
			});

			const {redisConfig} = await import('../../src/redis');

			expect(redisConfig.redis).toEqual(expect.objectContaining({
				enableTLSForSentinelMode: true,
				tls: {
					ca: 'sentinel-ca',
					cert: 'sentinel-cert',
					key: 'sentinel-key',
					servername: 'sentinel.local',
					rejectUnauthorized: false,
					minVersion: 'TLSv1.2',
					ciphers: 'ECDHE-RSA-AES128-GCM-SHA256',
				}
			}));
		});
	});
});
