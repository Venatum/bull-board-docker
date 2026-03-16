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
		REDIS_USE_TLS: false,
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
			setupCommonMocks();

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
			setupCommonMocks();

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

	describe('Cluster Configuration', () => {
		it('should parse cluster hosts correctly', async () => {
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379,node2:6380,node3:6381',
				REDIS_CLUSTER_SCALE_READS: 'master',
				REDIS_CLUSTER_MAX_REDIRECTIONS: 16,
			});

			const {clusterConfig, isCluster} = await import('../../src/redis');

			expect(isCluster).toBe(true);
			expect(clusterConfig.nodes).toEqual([
				{host: 'node1', port: 6379},
				{host: 'node2', port: 6380},
				{host: 'node3', port: 6381},
			]);
		});

		it('should handle semicolon-separated cluster hosts', async () => {
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379;node2:6380',
				REDIS_CLUSTER_SCALE_READS: 'master',
				REDIS_CLUSTER_MAX_REDIRECTIONS: 16,
			});

			const {clusterConfig} = await import('../../src/redis');

			expect(clusterConfig.nodes).toEqual([
				{host: 'node1', port: 6379},
				{host: 'node2', port: 6380},
			]);
		});

		it('should include cluster options with correct defaults', async () => {
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379',
				REDIS_CLUSTER_SCALE_READS: 'slave',
				REDIS_CLUSTER_MAX_REDIRECTIONS: 32,
				REDIS_CLUSTER_SLOTS_REFRESH_TIMEOUT: 2000,
				REDIS_CLUSTER_RETRY_DELAY_ON_FAILOVER: 200,
				REDIS_CLUSTER_RETRY_DELAY_ON_CLUSTER_DOWN: 200,
				REDIS_CLUSTER_RETRY_DELAY_ON_TRY_AGAIN: 200,
				REDIS_CLUSTER_RETRY_DELAY_ON_MOVED: 50,
				REDIS_CLUSTER_ENABLE_AUTO_PIPELINING: false,
				REDIS_CLUSTER_LAZY_CONNECT: false,
				REDIS_PASSWORD: 'secret',
				REDIS_KEEP_ALIVE: 0,
				REDIS_NO_DELAY: true,
				REDIS_ENABLE_READY_CHECK: true,
				REDIS_ENABLE_OFFLINE_QUEUE: true,
			});

			const {clusterConfig} = await import('../../src/redis');

			expect(clusterConfig.options.scaleReads).toBe('slave');
			expect(clusterConfig.options.maxRedirections).toBe(32);
			expect(clusterConfig.options.slotsRefreshTimeout).toBe(2000);
			expect(clusterConfig.options.retryDelayOnFailover).toBe(200);
			expect(clusterConfig.options.retryDelayOnClusterDown).toBe(200);
			expect(clusterConfig.options.retryDelayOnTryAgain).toBe(200);
			expect(clusterConfig.options.retryDelayOnMoved).toBe(50);
			expect(clusterConfig.options.redisOptions).toEqual(expect.objectContaining({
				password: 'secret',
				maxRetriesPerRequest: null,
			}));
		});

		it('should include auto-resubscribe flags in cluster redisOptions', async () => {
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379',
				REDIS_AUTO_RESUBSCRIBE: false,
				REDIS_AUTO_RESEND_UNFULFILLED: false,
			});

			const {clusterConfig} = await import('../../src/redis');

			expect(clusterConfig.options.redisOptions.autoResubscribe).toBe(false);
			expect(clusterConfig.options.redisOptions.autoResendUnfulfilledCommands).toBe(false);
		});

		it('should place enableOfflineQueue and enableReadyCheck at cluster options level, not in redisOptions', async () => {
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379',
				REDIS_CLUSTER_SCALE_READS: 'master',
				REDIS_CLUSTER_MAX_REDIRECTIONS: 16,
				REDIS_CLUSTER_SLOTS_REFRESH_TIMEOUT: 1000,
				REDIS_CLUSTER_RETRY_DELAY_ON_FAILOVER: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_CLUSTER_DOWN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_TRY_AGAIN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_MOVED: 0,
				REDIS_CLUSTER_ENABLE_AUTO_PIPELINING: false,
				REDIS_CLUSTER_LAZY_CONNECT: false,
				REDIS_KEEP_ALIVE: 0,
				REDIS_NO_DELAY: true,
				REDIS_ENABLE_READY_CHECK: true,
				REDIS_ENABLE_OFFLINE_QUEUE: false,
			});

			const {clusterConfig} = await import('../../src/redis');

			// These must be at the cluster options level, NOT inside redisOptions
			expect(clusterConfig.options.enableOfflineQueue).toBe(false);
			expect(clusterConfig.options.enableReadyCheck).toBe(true);
			expect(clusterConfig.options.redisOptions).not.toHaveProperty('enableOfflineQueue');
			expect(clusterConfig.options.redisOptions).not.toHaveProperty('enableReadyCheck');
		});

		it('should include slotsRefreshInterval when configured', async () => {
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379',
				REDIS_CLUSTER_SCALE_READS: 'master',
				REDIS_CLUSTER_MAX_REDIRECTIONS: 16,
				REDIS_CLUSTER_SLOTS_REFRESH_INTERVAL: 5000,
				REDIS_CLUSTER_SLOTS_REFRESH_TIMEOUT: 1000,
				REDIS_CLUSTER_RETRY_DELAY_ON_FAILOVER: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_CLUSTER_DOWN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_TRY_AGAIN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_MOVED: 0,
				REDIS_CLUSTER_ENABLE_AUTO_PIPELINING: false,
				REDIS_CLUSTER_LAZY_CONNECT: false,
				REDIS_KEEP_ALIVE: 0,
				REDIS_NO_DELAY: true,
				REDIS_ENABLE_READY_CHECK: true,
				REDIS_ENABLE_OFFLINE_QUEUE: true,
			});

			const {clusterConfig} = await import('../../src/redis');

			expect(clusterConfig.options.slotsRefreshInterval).toBe(5000);
		});

		it('should not include slotsRefreshInterval when not configured', async () => {
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379',
				REDIS_CLUSTER_SCALE_READS: 'master',
				REDIS_CLUSTER_MAX_REDIRECTIONS: 16,
				REDIS_CLUSTER_SLOTS_REFRESH_TIMEOUT: 1000,
				REDIS_CLUSTER_RETRY_DELAY_ON_FAILOVER: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_CLUSTER_DOWN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_TRY_AGAIN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_MOVED: 0,
				REDIS_CLUSTER_ENABLE_AUTO_PIPELINING: false,
				REDIS_CLUSTER_LAZY_CONNECT: false,
				REDIS_KEEP_ALIVE: 0,
				REDIS_NO_DELAY: true,
				REDIS_ENABLE_READY_CHECK: true,
				REDIS_ENABLE_OFFLINE_QUEUE: true,
			});

			const {clusterConfig} = await import('../../src/redis');

			expect(clusterConfig.options).not.toHaveProperty('slotsRefreshInterval');
		});

		it('should set dnsLookup to passthrough when DNS_LOOKUP is skip', async () => {
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379',
				REDIS_CLUSTER_SCALE_READS: 'master',
				REDIS_CLUSTER_MAX_REDIRECTIONS: 16,
				REDIS_CLUSTER_SLOTS_REFRESH_TIMEOUT: 1000,
				REDIS_CLUSTER_RETRY_DELAY_ON_FAILOVER: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_CLUSTER_DOWN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_TRY_AGAIN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_MOVED: 0,
				REDIS_CLUSTER_SKIP_DNS_LOOKUP: true,
				REDIS_CLUSTER_ENABLE_AUTO_PIPELINING: false,
				REDIS_CLUSTER_LAZY_CONNECT: false,
				REDIS_KEEP_ALIVE: 0,
				REDIS_NO_DELAY: true,
				REDIS_ENABLE_READY_CHECK: true,
				REDIS_ENABLE_OFFLINE_QUEUE: true,
			});

			const {clusterConfig} = await import('../../src/redis');

			expect(clusterConfig.options.dnsLookup).toBeDefined();

			// Verify the passthrough behavior
			const result = await new Promise((resolve) => {
				clusterConfig.options.dnsLookup('test.host', (err, address) => {
					resolve({err, address});
				});
			});
			expect(result.err).toBeNull();
			expect(result.address).toBe('test.host');
		});

		it('should not set dnsLookup when DNS_LOOKUP is not skip', async () => {
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379',
				REDIS_CLUSTER_SCALE_READS: 'master',
				REDIS_CLUSTER_MAX_REDIRECTIONS: 16,
				REDIS_CLUSTER_SLOTS_REFRESH_TIMEOUT: 1000,
				REDIS_CLUSTER_RETRY_DELAY_ON_FAILOVER: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_CLUSTER_DOWN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_TRY_AGAIN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_MOVED: 0,
				REDIS_CLUSTER_ENABLE_AUTO_PIPELINING: false,
				REDIS_CLUSTER_LAZY_CONNECT: false,
				REDIS_KEEP_ALIVE: 0,
				REDIS_NO_DELAY: true,
				REDIS_ENABLE_READY_CHECK: true,
				REDIS_ENABLE_OFFLINE_QUEUE: true,
			});

			const {clusterConfig} = await import('../../src/redis');

			expect(clusterConfig.options).not.toHaveProperty('dnsLookup');
		});

		it('should parse NAT map from JSON string', async () => {
			const natMap = {
				'10.0.0.1:6379': { host: 'external1.example.com', port: 6379 },
				'10.0.0.2:6379': { host: 'external2.example.com', port: 6380 },
			};
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379',
				REDIS_CLUSTER_SCALE_READS: 'master',
				REDIS_CLUSTER_MAX_REDIRECTIONS: 16,
				REDIS_CLUSTER_SLOTS_REFRESH_TIMEOUT: 1000,
				REDIS_CLUSTER_RETRY_DELAY_ON_FAILOVER: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_CLUSTER_DOWN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_TRY_AGAIN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_MOVED: 0,
				REDIS_CLUSTER_NAT_MAP: JSON.stringify(natMap),
				REDIS_CLUSTER_ENABLE_AUTO_PIPELINING: false,
				REDIS_CLUSTER_LAZY_CONNECT: false,
				REDIS_KEEP_ALIVE: 0,
				REDIS_NO_DELAY: true,
				REDIS_ENABLE_READY_CHECK: true,
				REDIS_ENABLE_OFFLINE_QUEUE: true,
			});

			const {clusterConfig} = await import('../../src/redis');

			expect(clusterConfig.options.natMap).toEqual(natMap);
		});

		it('should throw on invalid NAT map JSON', async () => {
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379',
				REDIS_CLUSTER_SCALE_READS: 'master',
				REDIS_CLUSTER_MAX_REDIRECTIONS: 16,
				REDIS_CLUSTER_SLOTS_REFRESH_TIMEOUT: 1000,
				REDIS_CLUSTER_RETRY_DELAY_ON_FAILOVER: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_CLUSTER_DOWN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_TRY_AGAIN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_MOVED: 0,
				REDIS_CLUSTER_NAT_MAP: 'not-valid-json',
				REDIS_CLUSTER_ENABLE_AUTO_PIPELINING: false,
				REDIS_CLUSTER_LAZY_CONNECT: false,
				REDIS_KEEP_ALIVE: 0,
				REDIS_NO_DELAY: true,
				REDIS_ENABLE_READY_CHECK: true,
				REDIS_ENABLE_OFFLINE_QUEUE: true,
			});

			await expect(import('../../src/redis')).rejects.toThrow('Invalid REDIS_CLUSTER_NAT_MAP JSON');
		});

		it('should include TLS options in cluster redisOptions', async () => {
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379',
				REDIS_CLUSTER_SCALE_READS: 'master',
				REDIS_CLUSTER_MAX_REDIRECTIONS: 16,
				REDIS_CLUSTER_SLOTS_REFRESH_TIMEOUT: 1000,
				REDIS_CLUSTER_RETRY_DELAY_ON_FAILOVER: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_CLUSTER_DOWN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_TRY_AGAIN: 100,
				REDIS_CLUSTER_RETRY_DELAY_ON_MOVED: 0,
				REDIS_CLUSTER_ENABLE_AUTO_PIPELINING: false,
				REDIS_CLUSTER_LAZY_CONNECT: false,
				REDIS_USE_TLS: true,
				REDIS_TLS_CA: 'ca-cert',
				REDIS_TLS_SERVERNAME: 'redis.cluster.local',
				REDIS_KEEP_ALIVE: 0,
				REDIS_NO_DELAY: true,
				REDIS_ENABLE_READY_CHECK: true,
				REDIS_ENABLE_OFFLINE_QUEUE: true,
			});

			const {clusterConfig} = await import('../../src/redis');

			expect(clusterConfig.options.redisOptions.tls).toEqual(expect.objectContaining({
				ca: 'ca-cert',
				servername: 'redis.cluster.local',
			}));
		});

		it('should not include host/port in redisConfig when cluster mode is active', async () => {
			setupCommonMocks({
				REDIS_CLUSTER_HOSTS: 'node1:6379',
				REDIS_CLUSTER_SCALE_READS: 'master',
				REDIS_CLUSTER_MAX_REDIRECTIONS: 16,
				REDIS_HOST: 'localhost',
				REDIS_PORT: 6379,
				REDIS_FAMILY: 4,
				REDIS_KEEP_ALIVE: 0,
				REDIS_NO_DELAY: true,
				REDIS_ENABLE_READY_CHECK: true,
				REDIS_ENABLE_OFFLINE_QUEUE: true,
				REDIS_AUTO_RESUBSCRIBE: true,
				REDIS_AUTO_RESEND_UNFULFILLED: true,
			});

			const {redisConfig} = await import('../../src/redis');

			expect(redisConfig.redis).not.toHaveProperty('host');
			expect(redisConfig.redis).not.toHaveProperty('port');
			expect(redisConfig.redis).not.toHaveProperty('family');
		});

		it('should set isCluster to false when REDIS_CLUSTER_HOSTS is not set', async () => {
			setupCommonMocks(defaultConfig);

			const {isCluster, clusterConfig} = await import('../../src/redis');

			expect(isCluster).toBe(false);
			expect(clusterConfig).toBeNull();
		});

		it('should throw when SENTINEL_HOSTS and REDIS_CLUSTER_HOSTS are both set', async () => {
			setupCommonMocks({
				SENTINEL_HOSTS: 'host1:26379',
				SENTINEL_NAME: 'mymaster',
				REDIS_CLUSTER_HOSTS: 'node1:6379',
			});

			await expect(import('../../src/redis')).rejects.toThrow(
				'SENTINEL_HOSTS and REDIS_CLUSTER_HOSTS are mutually exclusive'
			);
		});

		it('should include nodes method in test mock client', async () => {
			setupCommonMocks(defaultConfig);

			const {client} = await import('../../src/redis');

			expect(client.nodes).toBeDefined();
			expect(client.nodes()).toEqual([]);
		});

		it('should include duplicate method in test mock client', async () => {
			setupCommonMocks(defaultConfig);

			const {client} = await import('../../src/redis');

			expect(client.duplicate).toBeDefined();
			const dup = client.duplicate();
			expect(dup.keys).toBeDefined();
		});
	});

	describe('TLS Configuration', () => {
		it('should include TLS options when REDIS_USE_TLS is true', async () => {
			setupCommonMocks({
				REDIS_USE_TLS: true,
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
				REDIS_USE_TLS: false,
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
				sentinelTLS: {
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

		it('should keep distinct TLS config for Redis and Sentinel when both are enabled', async () => {
			setupCommonMocks({
				SENTINEL_HOSTS: 'host1:26379',
				SENTINEL_NAME: 'mymaster',
				REDIS_USE_TLS: true,
				REDIS_TLS_CA: 'redis-ca',
				SENTINEL_TLS_ENABLED: true,
				SENTINEL_TLS_CA: 'sentinel-ca',
			});

			const {redisConfig} = await import('../../src/redis');

			expect(redisConfig.redis).toEqual(expect.objectContaining({
				enableTLSForSentinelMode: true,
				tls: {
					ca: 'redis-ca',
				},
				sentinelTLS: {
					ca: 'sentinel-ca',
				},
			}));
		});
	});
});
