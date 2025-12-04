import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';

// Set NODE_ENV to 'test' to prevent automatic execution of bullMain
process.env.NODE_ENV = 'test';

// override scope wise to avoid log flood
console.log = () => null;

describe('Bull Queue Setup', () => {
	// Common mocks
	let QueueMock;
	let BullMock;
	let setQueuesMock;
	let createBullBoardMock;
	let ExpressAdapterMock;
	let BullMQAdapterMock;
	let BullAdapterMock;
	let clientKeysMock;
	let consoleSpy;

	// Default config
	const defaultConfig = {
		BULL_PREFIX: 'bull',
		BULL_VERSION: 'BULLMQ',
		BACKOFF_STARTING_DELAY: 500,
		BACKOFF_MAX_DELAY: Infinity,
		BACKOFF_TIME_MULTIPLE: 2,
		BACKOFF_NB_ATTEMPTS: 10,
		BULL_BOARD_TITLE: 'Test Bull Board',
	};

	// Helper function to setup common mocks
	const setupCommonMocks = (config = defaultConfig, queueKeys = ['bull:queue1:jobs', 'bull:queue2:jobs']) => {
		// Setup BullMQ mock
  QueueMock = mock.fn();
  mock.module('bullmq', () => ({
    Queue: QueueMock,
  }));

		// Setup Bull mock
  BullMock = mock.fn();
  mock.module('bull', () => ({ default: BullMock }));

		// Setup Bull Board mocks
  setQueuesMock = mock.fn();
  createBullBoardMock = mock.fn().mockReturnValue({
    setQueues: setQueuesMock,
  });
  mock.module('@bull-board/api', () => ({
    createBullBoard: createBullBoardMock,
  }));

		// Setup Express Adapter mock
  ExpressAdapterMock = mock.fn();
  mock.module('@bull-board/express', () => ({
    // Provide a constructable class and keep a spy on constructor calls
    ExpressAdapter: class {
      constructor(...args) {
        ExpressAdapterMock(...args);
      }
      getRouter() {
        return 'router';
      }
    },
  }));

		// Setup Adapter mocks
  BullMQAdapterMock = mock.fn();
  mock.module('@bull-board/api/bullMQAdapter', () => ({
    BullMQAdapter: class {
      constructor(...args) {
        BullMQAdapterMock(...args);
      }
    },
  }));

  BullAdapterMock = mock.fn();
  mock.module('@bull-board/api/bullAdapter', () => ({
    BullAdapter: class {
      constructor(...args) {
        BullAdapterMock(...args);
      }
    },
  }));

		// Setup Redis mock
  clientKeysMock = mock.fn().mockResolvedValue(queueKeys);
  mock.module('../../src/redis.js', () => ({
    client: {
      keys: clientKeysMock,
      connection: 'redis-connection',
      on: mock.fn(),
    },
    redisConfig: {
      redis: {
        host: 'localhost',
        port: 6379,
      },
    },
  }));

		// Setup config mock
  mock.module('../../src/config.js', () => ({
      config,
    }));

		// Setup backoff mock
  mock.module('exponential-backoff', () => ({
      backOff: mock.fn().mockImplementation((fn) => fn()),
    }));
  };

 beforeEach(() => {
    // Restore all mocks between tests
    mock.restore();
  });

	afterEach(() => {
		// Restore console.error if it was mocked
		if (consoleSpy) {
			consoleSpy.mockRestore();
			consoleSpy = undefined;
		}
	});

	it('should create a Bull board with the correct configuration', async () => {
		// Setup mocks
		setupCommonMocks();

		// Import the module to test
		await import('../../src/bull.js');

		// We don't need to call bullMain for this test as we're just testing the initial setup
		// which happens when the module is imported

		// Verify that createBullBoard was called with the correct configuration
		expect(createBullBoardMock).toHaveBeenCalledWith(expect.objectContaining({
			queues: [],
			serverAdapter: expect.any(Object),
			options: expect.objectContaining({
				uiConfig: expect.objectContaining({
					boardTitle: 'Test Bull Board',
				}),
			}),
		}));

		// Verify that ExpressAdapter was instantiated
		expect(ExpressAdapterMock).toHaveBeenCalled();
	});

	it('should discover Bull queues and add them to the board (BullMQ)', async () => {
		// Setup mocks with BullMQ configuration
		setupCommonMocks();

		// Import the module to test
		const bull = await import('../../src/bull.js');

		// Call the bullMain function
		await bull.bullMain();

		// Verify that Queue constructor was called for each queue
		expect(QueueMock).toHaveBeenCalledWith('queue1', expect.any(Object), 'redis-connection');
		expect(QueueMock).toHaveBeenCalledWith('queue2', expect.any(Object), 'redis-connection');

		// Verify that BullMQAdapter was created for each queue
		expect(BullMQAdapterMock).toHaveBeenCalledTimes(2);

		// Verify that setQueues was called with the adapters
		expect(setQueuesMock).toHaveBeenCalledWith(expect.any(Array));
	});

	it('should discover Bull queues and add them to the board (Bull)', async () => {
		// Setup mocks with Bull configuration
		setupCommonMocks({
			...defaultConfig,
			BULL_VERSION: 'BULL',
		});

		// Import the module to test
		const bull = await import('../../src/bull.js');

		// Call the bullMain function
		await bull.bullMain();

		// Verify that Bull constructor was called for each queue
		expect(BullMock).toHaveBeenCalledWith('queue1', expect.any(Object), 'redis-connection');
		expect(BullMock).toHaveBeenCalledWith('queue2', expect.any(Object), 'redis-connection');

		// Verify that BullAdapter was created for each queue
		expect(BullAdapterMock).toHaveBeenCalledTimes(2);

		// Verify that setQueues was called with the adapters
		expect(setQueuesMock).toHaveBeenCalledWith(expect.any(Array));
	});

	it('should handle error when no queues are found', async () => {
		// Setup mocks with empty queue keys
		setupCommonMocks(defaultConfig, []);

		// Mock console.error to verify it's called
  consoleSpy = spyOn(console, 'error').mockImplementation(() => {});

		// Import the module to test
		const bull = await import('../../src/bull.js');

		// Call the bullMain function
		await bull.bullMain();

		// Verify that console.error was called with the error
		expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
	});

	async function testPrefix(configWithPrefix, reverseCheck = false) {
		setupCommonMocks(configWithPrefix);

		// Import the module to test
		const bull = await import('../../src/bull.js');

		// Call the bullMain function
		await bull.bullMain();

		// Get the appropriate mock based on the version
		const mock = configWithPrefix.BULL_VERSION === 'BULLMQ' ? QueueMock : BullMock;
		const connectionKey = configWithPrefix.BULL_VERSION === 'BULLMQ' ? 'connection' : 'redis';

		if (!reverseCheck) {
			expect.assertions(2);

			// Verify that Queue constructor was called with prefix in configuration
			expect(mock).toHaveBeenCalledWith('queue1', expect.objectContaining({
				[connectionKey]: expect.any(Object),
				prefix: 'test-prefix'
			}), 'redis-connection');
			expect(mock).toHaveBeenCalledWith('queue2', expect.objectContaining({
				[connectionKey]: expect.any(Object),
				prefix: 'test-prefix'
			}), 'redis-connection');
		} else {
			expect.assertions(4);

			// Verify that Queue constructor was called without prefix in configuration
			expect(mock).toHaveBeenCalledWith('queue1', expect.objectContaining({
				[connectionKey]: expect.any(Object),
			}), 'redis-connection');
			expect(mock).toHaveBeenCalledWith('queue2', expect.objectContaining({
				[connectionKey]: expect.any(Object),
			}), 'redis-connection');

			// Verify that prefix is not included in the configuration
			expect(mock).not.toHaveBeenCalledWith('queue1', expect.objectContaining({
				prefix: expect.anything()
			}), 'redis-connection');
			expect(mock).not.toHaveBeenCalledWith('queue2', expect.objectContaining({
				prefix: expect.anything()
			}), 'redis-connection');
		}
	}

	[
		{
			name: 'BullMQ',
			version: 'BULLMQ',
		},
		{
			name: 'Bull',
			version: 'BULL',
		}
	].forEach(({name, version}) => {
		describe(`Prefix Handling (${name})`, () => {
			it(`should include prefix in ${name} queue configuration when BULL_PREFIX is defined`, async () => {
				await testPrefix({
					...defaultConfig,
					BULL_PREFIX: 'test-prefix',
					BULL_VERSION: version,
				})
			});

			it(`should not include prefix in ${name} queue configuration when BULL_PREFIX is undefined`, async () => {
				await testPrefix({
					...defaultConfig,
					BULL_PREFIX: undefined,
					BULL_VERSION: version,
				}, true)
			});

			it(`should not include prefix in ${name} queue configuration when BULL_PREFIX is empty string`, async () => {
				await testPrefix({
					...defaultConfig,
					BULL_PREFIX: '',
					BULL_VERSION: version,
				}, true)
			});

			it(`should not include prefix in ${name} queue configuration when BULL_PREFIX is null`, async () => {
				await testPrefix({
					...defaultConfig,
					BULL_PREFIX: null,
					BULL_VERSION: version,
				}, true)
			});
		})
	})
});
