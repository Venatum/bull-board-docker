import { jest } from '@jest/globals';

describe('Configuration', () => {
  // Save the original process.env
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset modules to ensure clean imports
    jest.resetModules();

    // Create a fresh copy of process.env for each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore the original process.env
    process.env = originalEnv;
  });

  it('should load default configuration when environment variables are not set', () => {
    // Import the module to test
    const { config } = require('../../src/config');

    // Verify default values
    expect(config.REDIS_PORT).toBe(6379);
    expect(config.REDIS_HOST).toBe('localhost');
    expect(config.REDIS_DB).toBe('0');
    expect(config.BULL_PREFIX).toBe('bull');
    expect(config.BULL_VERSION).toBe('BULLMQ');
    expect(config.PORT).toBe(3000);
    expect(config.BULL_BOARD_HOSTNAME).toBe('0.0.0.0');
    expect(config.HOME_PAGE).toBe('/');
  });

  it('should load configuration from environment variables', () => {
    // Set environment variables
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_HOST = 'redis-server';
    process.env.REDIS_DB = '1';
    process.env.REDIS_USER = 'user';
    process.env.REDIS_PASSWORD = 'password';
    process.env.REDIS_USE_TLS = 'true';
    process.env.BULL_PREFIX = 'custom-bull';
    process.env.BULL_VERSION = 'BULL';
    process.env.PORT = '4000';
    process.env.BULL_BOARD_HOSTNAME = '127.0.0.1';
    process.env.PROXY_PATH = '/custom-path';
    process.env.USER_LOGIN = 'admin';
    process.env.USER_PASSWORD = 'admin';

    // Import the module to test
    jest.isolateModules(() => {
      const { config } = require('../../src/config');

      // Verify that environment variables were loaded correctly
      expect(config.REDIS_PORT).toBe(6380);
      expect(config.REDIS_HOST).toBe('redis-server');
      expect(config.REDIS_DB).toBe('1');
      expect(config.REDIS_USER).toBe('user');
      expect(config.REDIS_PASSWORD).toBe('password');
      expect(config.REDIS_USE_TLS).toBe('true');
      expect(config.BULL_PREFIX).toBe('custom-bull');
      expect(config.BULL_VERSION).toBe('BULL');
      expect(config.PORT).toBe('4000');
      expect(config.BULL_BOARD_HOSTNAME).toBe('127.0.0.1');
      expect(config.PROXY_PATH).toBe('/custom-path');
      expect(config.USER_LOGIN).toBe('admin');
      expect(config.USER_PASSWORD).toBe('admin');
      expect(config.AUTH_ENABLED).toBe(true);
      expect(config.HOME_PAGE).toBe('/custom-path');
      expect(config.LOGIN_PAGE).toBe('/custom-path/login');
    });
  });

  it('should normalize paths correctly', () => {
    // Set environment variables with trailing slashes
    process.env.PROXY_PATH = '/custom-path/';

    // Import the module to test
    jest.isolateModules(() => {
      const { config, PROXY_PATH } = require('../../src/config');

      // Verify that paths were normalized correctly
      expect(PROXY_PATH).toBe('/custom-path');
      expect(config.PROXY_PATH).toBe('/custom-path');
      expect(config.HOME_PAGE).toBe('/custom-path');
      expect(config.LOGIN_PAGE).toBe('/custom-path/login');
    });
  });

  it('should handle empty proxy path', () => {
    // Set environment variables with empty proxy path
    process.env.PROXY_PATH = '';

    // Import the module to test
    jest.isolateModules(() => {
      const { config, PROXY_PATH } = require('../../src/config');

      // Verify that paths were handled correctly
      expect(PROXY_PATH).toBe('');
      expect(config.PROXY_PATH).toBe('');
      expect(config.HOME_PAGE).toBe('/');
      expect(config.LOGIN_PAGE).toBe('/login');
    });
  });

  it('should handle undefined proxy path', () => {
    // Unset PROXY_PATH
    delete process.env.PROXY_PATH;

    // Import the module to test
    jest.isolateModules(() => {
      const { config, PROXY_PATH } = require('../../src/config');

      // Verify that paths were handled correctly
      expect(PROXY_PATH).toBe('');
      expect(config.PROXY_PATH).toBeFalsy();
      expect(config.HOME_PAGE).toBe('/');
      expect(config.LOGIN_PAGE).toBe('/login');
    });
  });

  it('should set AUTH_ENABLED to true when USER_LOGIN and USER_PASSWORD are set', () => {
    // Set environment variables
    process.env.USER_LOGIN = 'admin';
    process.env.USER_PASSWORD = 'password';

    // Import the module to test
    jest.isolateModules(() => {
      const { config } = require('../../src/config');

      // Verify that AUTH_ENABLED is true
      expect(config.AUTH_ENABLED).toBe(true);
    });
  });

  it('should set AUTH_ENABLED to false when USER_LOGIN is not set', () => {
    // Set environment variables
    process.env.USER_PASSWORD = 'password';
    delete process.env.USER_LOGIN;

    // Import the module to test
    jest.isolateModules(() => {
      const { config } = require('../../src/config');

      // Verify that AUTH_ENABLED is false
      expect(config.AUTH_ENABLED).toBe(false);
    });
  });

  it('should set AUTH_ENABLED to false when USER_PASSWORD is not set', () => {
    // Set environment variables
    process.env.USER_LOGIN = 'admin';
    delete process.env.USER_PASSWORD;

    // Import the module to test
    jest.isolateModules(() => {
      const { config } = require('../../src/config');

      // Verify that AUTH_ENABLED is false
      expect(config.AUTH_ENABLED).toBe(false);
    });
  });
});
