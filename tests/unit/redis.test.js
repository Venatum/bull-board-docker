import { jest } from '@jest/globals';

// Mock setup
let mockClient;
let createClientMock;

// Mock the ioredis module
jest.mock('ioredis', () => {
  const originalModule = jest.requireActual('ioredis');
  return {
    ...originalModule,
    createClient: jest.fn(),
  };
});

// Mock the config module
jest.mock('../../src/config', () => ({
  config: {
    REDIS_PORT: 6379,
    REDIS_HOST: 'localhost',
    REDIS_DB: '0',
    REDIS_USER: 'testuser',
    REDIS_PASSWORD: 'testpassword',
    REDIS_USE_TLS: 'false',
    REDIS_FAMILY: 4,
    REDIS_KEEP_ALIVE: 5000,
    REDIS_NO_DELAY: true,
    REDIS_ENABLE_OFFLINE_QUEUE: true,
    REDIS_ENABLE_READY_CHECK: true,
  },
}));

describe('Redis Client', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset modules to ensure clean imports
    jest.resetModules();

    // Set up the mock client
    mockClient = { on: jest.fn() };

    // Get the createClient mock
    createClientMock = require('ioredis').createClient;
    createClientMock.mockReturnValue(mockClient);
  });

  it('should create a Redis client with the correct configuration', () => {
    // Import the module to test
    const { redisConfig } = require('../../src/redis');

    // Verify that createClient was called with the correct configuration
    expect(createClientMock).toHaveBeenCalledWith(redisConfig.redis);

    // Verify the Redis configuration
    expect(redisConfig.redis).toEqual(expect.objectContaining({
      port: 6379,
      host: 'localhost',
      db: '0',
      username: 'testuser',
      password: 'testpassword',
      tls: false,
      keepAlive: 5000,
      noDelay: true,
      enableOfflineQueue: true,
      enableReadyCheck: true,
    }));
  });

  it('should register an error handler for the Redis client', () => {
    // Mock console.log to verify it's called
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Import the module to test
    require('../../src/redis');

    // Verify that the on method was called with 'error'
    expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));

    // Get the error callback
    const errorCallback = mockClient.on.mock.calls.find(call => call[0] === 'error')[1];

    // Simulate an error event
    const error = new Error('Redis connection error');
    errorCallback(error);

    // Verify that console.log was called with the error
    expect(consoleSpy).toHaveBeenCalledWith('Redis Client Error', error);

    // Restore console.log
    consoleSpy.mockRestore();
  });

  it('should parse DSN to sentinels correctly', () => {
    // Reset modules and set up mocks
    jest.resetModules();

    // Mock the config module with sentinel configuration
    jest.mock('../../src/config', () => ({
      config: {
        SENTINEL_HOSTS: 'host1:26379,host2:26379',
        SENTINEL_NAME: 'mymaster',
        SENTINEL_ROLE: 'master',
      },
    }));

    // Set up the createClient mock again after resetting modules
    const ioredis = require('ioredis');
    ioredis.createClient = jest.fn().mockReturnValue({ on: jest.fn() });

    // Import the module to test
    const { redisConfig } = require('../../src/redis');

    // Verify the sentinel configuration
    expect(redisConfig.redis).toEqual(expect.objectContaining({
      sentinels: [
        { host: 'host1', port: 26379 },
        { host: 'host2', port: 26379 },
      ],
      name: 'mymaster',
      role: 'master',
    }));
  });

  it('should handle semicolon-separated DSN', () => {
    // Reset modules and set up mocks
    jest.resetModules();

    // Mock the config module with semicolon-separated sentinel configuration
    jest.mock('../../src/config', () => ({
      config: {
        SENTINEL_HOSTS: 'host1:26379;host2:26379',
        SENTINEL_NAME: 'mymaster',
        SENTINEL_ROLE: 'master',
      },
    }));

    // Set up the createClient mock again after resetting modules
    const ioredis = require('ioredis');
    ioredis.createClient = jest.fn().mockReturnValue({ on: jest.fn() });

    // Import the module to test
    const { redisConfig } = require('../../src/redis');

    // Verify the sentinel configuration
    expect(redisConfig.redis).toEqual(expect.objectContaining({
      sentinels: [
        { host: 'host1', port: 26379 },
        { host: 'host2', port: 26379 },
      ],
      name: 'mymaster',
      role: 'master',
    }));
  });
});
