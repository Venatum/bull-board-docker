import { jest } from '@jest/globals';

describe('Express Application', () => {
  // Common mocks
  let mockApp;
  let mockRouter;
  let consoleSpy;

  // Default config
  const defaultConfig = {
    PORT: 3000,
    BULL_BOARD_HOSTNAME: 'localhost',
    HOME_PAGE: '/',
    LOGIN_PAGE: '/login',
    AUTH_ENABLED: false,
    PROXY_PATH: '/proxy',
  };

  // Helper function to setup common mocks
  const setupCommonMocks = (config = defaultConfig, redisPingResponse = 'PONG') => {
    // Create mock app for testing
    mockApp = {
      set: jest.fn(),
      use: jest.fn(),
      listen: jest.fn().mockImplementation((port, hostname, callback) => {
        if (callback) callback();
        return { on: jest.fn() };
      }),
      get: jest.fn(),
    };

    // Create mock router
    mockRouter = {
      get: jest.fn(),
      post: jest.fn(),
    };

    // Mock express
    jest.doMock('express', () => {
      const express = jest.fn(() => mockApp);
      express.Router = jest.fn(() => mockRouter);
      return express;
    });

    // Mock morgan
    jest.doMock('morgan', () => {
      return jest.fn().mockReturnValue('morgan-middleware');
    });

    // Mock express-session
    jest.doMock('express-session', () => {
      return jest.fn().mockReturnValue('session-middleware');
    });

    // Mock passport
    jest.doMock('passport', () => ({
      initialize: jest.fn().mockReturnValue('passport-init-middleware'),
      session: jest.fn().mockReturnValue('passport-session-middleware'),
    }));

    // Mock body-parser
    jest.doMock('body-parser', () => ({
      urlencoded: jest.fn().mockReturnValue('body-parser-middleware'),
    }));

    // Mock connect-ensure-login
    jest.doMock('connect-ensure-login', () => ({
      ensureLoggedIn: jest.fn().mockReturnValue('ensure-logged-in-middleware'),
    }));

    // Mock config
    jest.doMock('../../src/config', () => ({
      config,
    }));

    // Mock login
    jest.doMock('../../src/login', () => ({
      authRouter: 'auth-router',
    }));

    // Mock bull
    jest.doMock('../../src/bull', () => ({
      router: 'bull-router',
    }));

    // Mock redis
    const redisMock = {
      client: {
        ping: jest.fn().mockResolvedValue(redisPingResponse),
        on: jest.fn(),
      },
    };

    jest.doMock('../../src/redis', () => redisMock);

    return redisMock;
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset modules to ensure clean imports
    jest.resetModules();

    // Mock console.log to prevent output during tests
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    // Restore console.log
    if (consoleSpy) {
      consoleSpy.mockRestore();
      consoleSpy = undefined;
    }
  });

  describe('Application Setup', () => {
    it('should set up the Express application correctly', () => {
      // Setup mocks
      setupCommonMocks();

      // Import the module to test
      require('../../src/index');

      // Verify that app.set was called with the correct arguments
      expect(mockApp.set).toHaveBeenCalledWith('views', expect.stringContaining('/views'));
      expect(mockApp.set).toHaveBeenCalledWith('view engine', 'ejs');

      // Verify that app.use was called with the correct middleware
      expect(mockApp.use).toHaveBeenCalledWith('session-middleware');
      expect(mockApp.use).toHaveBeenCalledWith('passport-init-middleware');
      expect(mockApp.use).toHaveBeenCalledWith('passport-session-middleware');
      expect(mockApp.use).toHaveBeenCalledWith('body-parser-middleware');

      // Verify that app.listen was called with the correct arguments
      expect(mockApp.listen).toHaveBeenCalledWith(3000, 'localhost', expect.any(Function));
    });
  });

  describe('Routing', () => {
    it('should set up routes correctly when authentication is disabled', () => {
      // Setup mocks with authentication disabled
      setupCommonMocks();

      // Import the module to test
      require('../../src/index');

      // Verify that app.use was called with the correct routes
      expect(mockApp.use).toHaveBeenCalledWith('/', 'bull-router');

      // Verify that app.use was not called with auth router
      const authRouterCall = mockApp.use.mock.calls.find(call => call[0] === '/login' && call[1] === 'auth-router');
      expect(authRouterCall).toBeUndefined();
    });

    it('should set up routes correctly when authentication is enabled', () => {
      // Setup mocks with authentication enabled
      setupCommonMocks({
        ...defaultConfig,
        AUTH_ENABLED: true,
      });

      // Import the module to test
      require('../../src/index');

      // Verify that app.use was called with the correct routes
      expect(mockApp.use).toHaveBeenCalledWith('/login', 'auth-router');
      expect(mockApp.use).toHaveBeenCalledWith('/', 'ensure-logged-in-middleware', 'bull-router');
    });

    it('should set up proxy path middleware when PROXY_PATH is configured', () => {
      // Setup mocks
      setupCommonMocks();

      // Import the module to test
      require('../../src/index');

      // Find the middleware function that sets req.proxyUrl
      const proxyMiddleware = mockApp.use.mock.calls.find(call => typeof call[0] === 'function')[0];
      expect(proxyMiddleware).toBeDefined();

      // Create mock request and response objects
      const req = {};
      const res = {};
      const next = jest.fn();

      // Call the middleware
      proxyMiddleware(req, res, next);

      // Verify that req.proxyUrl was set correctly
      expect(req.proxyUrl).toBe('/proxy');

      // Verify that next was called
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Health Check', () => {
    it('should set up health check endpoint with successful Redis connection', async () => {
      // Setup mocks with successful Redis ping
      setupCommonMocks();

      // Import the module to test
      require('../../src/index');

      // Get the health check middleware
      const healthCheckMiddleware = mockApp.use.mock.calls.find(call => call[0] === '/healthcheck')[1];
      expect(healthCheckMiddleware).toBeDefined();

      // Create mock request and response objects
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Call the middleware
      await healthCheckMiddleware(req, res);

      // Verify that res.status and res.json were called with the correct arguments
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ok',
        info: expect.objectContaining({
          redis: expect.objectContaining({
            status: 'up',
            description: expect.any(String),
          }),
        }),
      }));
    });

    it('should handle Redis error in health check endpoint', async () => {
      // Setup mocks with Redis error
      const redisMock = setupCommonMocks(defaultConfig);
      redisMock.client.ping.mockRejectedValue(new Error('Redis connection error'));

      // Import the module to test
      require('../../src/index');

      // Find the health check route handler
      const healthCheckRoute = mockApp.use.mock.calls.find(call => call[0] === '/healthcheck');
      expect(healthCheckRoute).toBeDefined();

      // Get the handler
      const handler = healthCheckRoute[1];

      // Create mock request and response objects
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Call the handler
      await handler(req, res);

      // Verify that res.status and res.json were called with the correct arguments
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        info: expect.objectContaining({
          redis: expect.objectContaining({
            status: undefined,
            description: expect.any(String),
            error: 'Redis connection error',
          }),
        }),
      }));
    });
  });
});
