// Set NODE_ENV to 'test' to prevent automatic execution of bullMain
process.env.NODE_ENV = 'test';

import { jest } from '@jest/globals';

describe('Bull Queue Setup', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset modules to ensure clean imports
    jest.resetModules();
  });

  it('should create a Bull board with the correct configuration', async () => {
    // Mock all dependencies
    jest.doMock('bullmq', () => ({
      Queue: jest.fn(),
    }));

    jest.doMock('bull', () => {
      return jest.fn();
    });

    const createBullBoardMock = jest.fn().mockReturnValue({
      setQueues: jest.fn(),
    });
    jest.doMock('@bull-board/api', () => ({
      createBullBoard: createBullBoardMock,
    }));

    const ExpressAdapterMock = jest.fn().mockImplementation(() => ({
      getRouter: jest.fn().mockReturnValue('router'),
    }));
    jest.doMock('@bull-board/express', () => ({
      ExpressAdapter: ExpressAdapterMock,
    }));

    jest.doMock('@bull-board/api/bullMQAdapter', () => ({
      BullMQAdapter: jest.fn(),
    }));

    jest.doMock('@bull-board/api/bullAdapter', () => ({
      BullAdapter: jest.fn(),
    }));

    jest.doMock('../../src/redis', () => ({
      client: {
        keys: jest.fn().mockResolvedValue(['bull:queue1:jobs', 'bull:queue2:jobs']),
        connection: 'redis-connection',
        on: jest.fn(),
      },
      redisConfig: {
        redis: {
          host: 'localhost',
          port: 6379,
        },
      },
    }));

    jest.doMock('../../src/config', () => ({
      config: {
        BULL_PREFIX: 'bull',
        BULL_VERSION: 'BULLMQ',
        BACKOFF_STARTING_DELAY: 500,
        BACKOFF_MAX_DELAY: Infinity,
        BACKOFF_TIME_MULTIPLE: 2,
        BACKOFF_NB_ATTEMPTS: 10,
        BULL_BOARD_TITLE: 'Test Bull Board',
      },
    }));

    jest.doMock('exponential-backoff', () => ({
      backOff: jest.fn().mockImplementation((fn, options) => fn()),
    }));

    // Import the module to test
    const bull = require('../../src/bull');

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
    // Mock all dependencies
    const QueueMock = jest.fn();
    jest.doMock('bullmq', () => ({
      Queue: QueueMock,
    }));

    jest.doMock('bull', () => {
      return jest.fn();
    });

    const setQueuesMock = jest.fn();
    const createBullBoardMock = jest.fn().mockReturnValue({
      setQueues: setQueuesMock,
    });
    jest.doMock('@bull-board/api', () => ({
      createBullBoard: createBullBoardMock,
    }));

    jest.doMock('@bull-board/express', () => ({
      ExpressAdapter: jest.fn().mockImplementation(() => ({
        getRouter: jest.fn().mockReturnValue('router'),
      })),
    }));

    const BullMQAdapterMock = jest.fn();
    jest.doMock('@bull-board/api/bullMQAdapter', () => ({
      BullMQAdapter: BullMQAdapterMock,
    }));

    jest.doMock('@bull-board/api/bullAdapter', () => ({
      BullAdapter: jest.fn(),
    }));

    const clientKeysMock = jest.fn().mockResolvedValue(['bull:queue1:jobs', 'bull:queue2:jobs']);
    jest.doMock('../../src/redis', () => ({
      client: {
        keys: clientKeysMock,
        connection: 'redis-connection',
        on: jest.fn(),
      },
      redisConfig: {
        redis: {
          host: 'localhost',
          port: 6379,
        },
      },
    }));

    jest.doMock('../../src/config', () => ({
      config: {
        BULL_PREFIX: 'bull',
        BULL_VERSION: 'BULLMQ',
        BACKOFF_STARTING_DELAY: 500,
        BACKOFF_MAX_DELAY: Infinity,
        BACKOFF_TIME_MULTIPLE: 2,
        BACKOFF_NB_ATTEMPTS: 10,
        BULL_BOARD_TITLE: 'Test Bull Board',
      },
    }));

    jest.doMock('exponential-backoff', () => ({
      backOff: jest.fn().mockImplementation((fn, options) => fn()),
    }));

    // Import the module to test
    const bull = require('../../src/bull');

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
    // Mock all dependencies
    jest.doMock('bullmq', () => ({
      Queue: jest.fn(),
    }));

    const BullMock = jest.fn();
    jest.doMock('bull', () => {
      return BullMock;
    });

    const setQueuesMock = jest.fn();
    const createBullBoardMock = jest.fn().mockReturnValue({
      setQueues: setQueuesMock,
    });
    jest.doMock('@bull-board/api', () => ({
      createBullBoard: createBullBoardMock,
    }));

    jest.doMock('@bull-board/express', () => ({
      ExpressAdapter: jest.fn().mockImplementation(() => ({
        getRouter: jest.fn().mockReturnValue('router'),
      })),
    }));

    jest.doMock('@bull-board/api/bullMQAdapter', () => ({
      BullMQAdapter: jest.fn(),
    }));

    const BullAdapterMock = jest.fn();
    jest.doMock('@bull-board/api/bullAdapter', () => ({
      BullAdapter: BullAdapterMock,
    }));

    const clientKeysMock = jest.fn().mockResolvedValue(['bull:queue1:jobs', 'bull:queue2:jobs']);
    jest.doMock('../../src/redis', () => ({
      client: {
        keys: clientKeysMock,
        connection: 'redis-connection',
        on: jest.fn(),
      },
      redisConfig: {
        redis: {
          host: 'localhost',
          port: 6379,
        },
      },
    }));

    // Change the Bull version
    jest.doMock('../../src/config', () => ({
      config: {
        BULL_PREFIX: 'bull',
        BULL_VERSION: 'BULL',
        BACKOFF_STARTING_DELAY: 500,
        BACKOFF_MAX_DELAY: Infinity,
        BACKOFF_TIME_MULTIPLE: 2,
        BACKOFF_NB_ATTEMPTS: 10,
        BULL_BOARD_TITLE: 'Test Bull Board',
      },
    }));

    jest.doMock('exponential-backoff', () => ({
      backOff: jest.fn().mockImplementation((fn, options) => fn()),
    }));

    // Import the module to test
    const bull = require('../../src/bull');

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
    // Mock all dependencies
    jest.doMock('bullmq', () => ({
      Queue: jest.fn(),
    }));

    jest.doMock('bull', () => {
      return jest.fn();
    });

    const setQueuesMock = jest.fn();
    const createBullBoardMock = jest.fn().mockReturnValue({
      setQueues: setQueuesMock,
    });
    jest.doMock('@bull-board/api', () => ({
      createBullBoard: createBullBoardMock,
    }));

    jest.doMock('@bull-board/express', () => ({
      ExpressAdapter: jest.fn().mockImplementation(() => ({
        getRouter: jest.fn().mockReturnValue('router'),
      })),
    }));

    jest.doMock('@bull-board/api/bullMQAdapter', () => ({
      BullMQAdapter: jest.fn(),
    }));

    jest.doMock('@bull-board/api/bullAdapter', () => ({
      BullAdapter: jest.fn(),
    }));

    // Mock the Redis client to return no queue keys
    const clientKeysMock = jest.fn().mockResolvedValue([]);
    jest.doMock('../../src/redis', () => ({
      client: {
        keys: clientKeysMock,
        connection: 'redis-connection',
        on: jest.fn(),
      },
      redisConfig: {
        redis: {
          host: 'localhost',
          port: 6379,
        },
      },
    }));

    jest.doMock('../../src/config', () => ({
      config: {
        BULL_PREFIX: 'bull',
        BULL_VERSION: 'BULLMQ',
        BACKOFF_STARTING_DELAY: 500,
        BACKOFF_MAX_DELAY: Infinity,
        BACKOFF_TIME_MULTIPLE: 2,
        BACKOFF_NB_ATTEMPTS: 10,
        BULL_BOARD_TITLE: 'Test Bull Board',
      },
    }));

    jest.doMock('exponential-backoff', () => ({
      backOff: jest.fn().mockImplementation((fn, options) => fn()),
    }));

    // Mock console.error to verify it's called
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Import the module to test
    const bull = require('../../src/bull');

    // Call the bullMain function
    await bull.bullMain();

    // Verify that console.error was called with the error
    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

    // Restore console.error
    consoleSpy.mockRestore();
  });
});
