import { jest } from '@jest/globals';

describe('Authentication', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset modules to ensure clean imports
    jest.resetModules();
  });

  it('should set up Passport.js with LocalStrategy', async () => {
    // Mock the dependencies
    jest.doMock('passport', () => ({
      use: jest.fn(),
      authenticate: jest.fn().mockReturnValue('passport-authenticate-middleware'),
      serializeUser: jest.fn(),
      deserializeUser: jest.fn(),
    }));

    jest.doMock('passport-local', () => ({
      Strategy: jest.fn(),
    }));

    jest.doMock('express', () => {
      const routerMock = {
        route: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
      };

      return {
        Router: jest.fn().mockReturnValue(routerMock),
      };
    });

    jest.doMock('../../src/config', () => ({
      config: {
        USER_LOGIN: 'admin',
        USER_PASSWORD: 'password',
        HOME_PAGE: '/',
        LOGIN_PAGE: '/login',
      },
    }));

    // Import the mocked modules
    const passport = require('passport');
    const { Strategy: LocalStrategy } = require('passport-local');

    // Import the module to test
    require('../../src/login');

    // Verify that passport.use was called with a LocalStrategy
    expect(passport.use).toHaveBeenCalledWith(expect.any(LocalStrategy));

    // Get the strategy callback
    const strategyCallback = LocalStrategy.mock.calls[0][0];

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

  it('should set up serialization and deserialization', async () => {
    // Mock the dependencies
    jest.doMock('passport', () => ({
      use: jest.fn(),
      authenticate: jest.fn().mockReturnValue('passport-authenticate-middleware'),
      serializeUser: jest.fn(),
      deserializeUser: jest.fn(),
    }));

    jest.doMock('passport-local', () => ({
      Strategy: jest.fn(),
    }));

    jest.doMock('express', () => {
      const routerMock = {
        route: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
      };

      return {
        Router: jest.fn().mockReturnValue(routerMock),
      };
    });

    jest.doMock('../../src/config', () => ({
      config: {
        USER_LOGIN: 'admin',
        USER_PASSWORD: 'password',
        HOME_PAGE: '/',
        LOGIN_PAGE: '/login',
      },
    }));

    // Import the mocked modules
    const passport = require('passport');

    // Import the module to test
    require('../../src/login');

    // Verify that passport.serializeUser and passport.deserializeUser were called
    expect(passport.serializeUser).toHaveBeenCalled();
    expect(passport.deserializeUser).toHaveBeenCalled();

    // Get the serialization callback
    const serializeCallback = passport.serializeUser.mock.calls[0][0];

    // Test the serialization callback
    const doneCb = jest.fn();
    const user = { user: 'bull-board' };
    serializeCallback(user, doneCb);
    expect(doneCb).toHaveBeenCalledWith(null, user);

    // Get the deserialization callback
    const deserializeCallback = passport.deserializeUser.mock.calls[0][0];

    // Test the deserialization callback
    doneCb.mockClear();
    deserializeCallback(user, doneCb);
    expect(doneCb).toHaveBeenCalledWith(null, user);
  });

  it('should set up authentication routes', async () => {
    // Mock the dependencies
    jest.doMock('passport', () => ({
      use: jest.fn(),
      authenticate: jest.fn().mockReturnValue('passport-authenticate-middleware'),
      serializeUser: jest.fn(),
      deserializeUser: jest.fn(),
    }));

    jest.doMock('passport-local', () => ({
      Strategy: jest.fn(),
    }));

    jest.doMock('express', () => {
      const routerMock = {
        route: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        post: jest.fn().mockReturnThis(),
      };

      return {
        Router: jest.fn().mockReturnValue(routerMock),
      };
    });

    jest.doMock('../../src/config', () => ({
      config: {
        USER_LOGIN: 'admin',
        USER_PASSWORD: 'password',
        HOME_PAGE: '/',
        LOGIN_PAGE: '/login',
      },
    }));

    // Import the mocked modules
    const express = require('express');
    const passport = require('passport');

    // Import the module to test
    require('../../src/login');

    // Verify that router.route was called with the correct path
    expect(express.Router().route).toHaveBeenCalledWith('/');

    // Verify that router.get was called
    expect(express.Router().get).toHaveBeenCalled();

    // Get the GET route handler
    const getHandler = express.Router().get.mock.calls[0][0];

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
    expect(express.Router().post).toHaveBeenCalledWith('passport-authenticate-middleware');

    // Verify that passport.authenticate was called with the correct arguments
    expect(passport.authenticate).toHaveBeenCalledWith('local', {
      successRedirect: '/',
      failureRedirect: '/login',
    });
  });
});
