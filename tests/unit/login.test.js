import { jest } from '@jest/globals';

describe('Authentication', () => {
  // Default config
  const defaultConfig = {
    USER_LOGIN: 'admin',
    USER_PASSWORD: 'password',
    HOME_PAGE: '/',
    LOGIN_PAGE: '/login',
  };

  // Common mocks
  let mockPassport;
  let mockLocalStrategy;
  let mockRouter;

  // Helper function to setup common mocks
  const setupCommonMocks = (config = defaultConfig) => {
    // Mock passport
    mockPassport = {
      use: jest.fn(),
      authenticate: jest.fn().mockReturnValue('passport-authenticate-middleware'),
      serializeUser: jest.fn(),
      deserializeUser: jest.fn(),
    };
    jest.doMock('passport', () => mockPassport);

    // Mock passport-local
    mockLocalStrategy = jest.fn();
    jest.doMock('passport-local', () => ({
      Strategy: mockLocalStrategy,
    }));

    // Mock express
    mockRouter = {
      route: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnThis(),
      post: jest.fn().mockReturnThis(),
    };
    jest.doMock('express', () => ({
      Router: jest.fn().mockReturnValue(mockRouter),
    }));

    // Mock config
    jest.doMock('../../src/config', () => ({
      config,
    }));

    return { mockPassport, mockLocalStrategy, mockRouter };
  };

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset modules to ensure clean imports
    jest.resetModules();
  });

  describe('Passport Strategy', () => {
    it('should set up Passport.js with LocalStrategy', async () => {
      // Setup mocks
      setupCommonMocks();

      // Import the module to test
      require('../../src/login');

      // Verify that passport.use was called with a LocalStrategy
      expect(mockPassport.use).toHaveBeenCalledWith(expect.any(mockLocalStrategy));

      // Get the strategy callback
      const strategyCallback = mockLocalStrategy.mock.calls[0][0];

      // Test the strategy with correct credentials
      const doneCb = jest.fn();
      strategyCallback('admin', 'password', doneCb);
      expect(doneCb).toHaveBeenCalledWith(null, { user: 'bull-board' });

      // Test the strategy with incorrect username
      doneCb.mockClear();
      strategyCallback('wrong', 'password', doneCb);
      expect(doneCb).toHaveBeenCalledWith(null, false);

      // Test the strategy with incorrect password
      doneCb.mockClear();
      strategyCallback('admin', 'wrong', doneCb);
      expect(doneCb).toHaveBeenCalledWith(null, false);
    });
  });

  describe('User Serialization', () => {
    it('should set up serialization and deserialization', async () => {
      // Setup mocks
      setupCommonMocks();

      // Import the module to test
      require('../../src/login');

      // Verify that passport.serializeUser and passport.deserializeUser were called
      expect(mockPassport.serializeUser).toHaveBeenCalled();
      expect(mockPassport.deserializeUser).toHaveBeenCalled();

      // Get the serialization callback
      const serializeCallback = mockPassport.serializeUser.mock.calls[0][0];

      // Test the serialization callback
      const doneCb = jest.fn();
      const user = { user: 'bull-board' };
      serializeCallback(user, doneCb);
      expect(doneCb).toHaveBeenCalledWith(null, user);

      // Get the deserialization callback
      const deserializeCallback = mockPassport.deserializeUser.mock.calls[0][0];

      // Test the deserialization callback
      doneCb.mockClear();
      deserializeCallback(user, doneCb);
      expect(doneCb).toHaveBeenCalledWith(null, user);
    });
  });

  describe('Authentication Routes', () => {
    it('should set up authentication routes', async () => {
      // Setup mocks
      setupCommonMocks();

      // Import the module to test
      require('../../src/login');

      // Verify that router.route was called with the correct path
      expect(mockRouter.route).toHaveBeenCalledWith('/');

      // Verify that router.get was called
      expect(mockRouter.get).toHaveBeenCalled();

      // Get the GET route handler
      const getHandler = mockRouter.get.mock.calls[0][0];

      // Create mock request and response objects
      const req = {};
      const res = {
        render: jest.fn(),
      };

      // Call the handler
      getHandler(req, res);

      // Verify that res.render was called with the correct template
      expect(res.render).toHaveBeenCalledWith('login');

      // Verify that router.post was called with passport.authenticate
      expect(mockRouter.post).toHaveBeenCalledWith('passport-authenticate-middleware');

      // Verify that passport.authenticate was called with the correct arguments
      expect(mockPassport.authenticate).toHaveBeenCalledWith('local', {
        successRedirect: '/',
        failureRedirect: '/login',
      });
    });

    it('should use custom redirect paths from config', async () => {
      // Setup mocks with custom paths
      setupCommonMocks({
        USER_LOGIN: 'admin',
        USER_PASSWORD: 'password',
        HOME_PAGE: '/custom-home',
        LOGIN_PAGE: '/custom-login',
      });

      // Import the module to test
      require('../../src/login');

      // Verify that passport.authenticate was called with the correct arguments
      expect(mockPassport.authenticate).toHaveBeenCalledWith('local', {
        successRedirect: '/custom-home',
        failureRedirect: '/custom-login',
      });
    });
  });
});
