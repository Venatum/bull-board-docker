import {jest} from '@jest/globals';

// Create mock app for testing
const mockApp = {
	set: jest.fn(),
	use: jest.fn(),
	listen: jest.fn().mockImplementation((port, hostname, callback) => {
		if (callback) callback();
		return {on: jest.fn()};
	}),
	get: jest.fn(),
};

// Create mock router
const mockRouter = {
	get: jest.fn(),
	post: jest.fn(),
};

// Mock express
jest.mock('express', () => {
	const express = jest.fn(() => mockApp);
	express.Router = jest.fn(() => mockRouter);
	return express;
});

// Mock morgan
jest.mock('morgan', () => {
	return jest.fn().mockReturnValue('morgan-middleware');
});

jest.mock('express-session', () => {
	return jest.fn().mockReturnValue('session-middleware');
});

jest.mock('passport', () => ({
	initialize: jest.fn().mockReturnValue('passport-init-middleware'),
	session: jest.fn().mockReturnValue('passport-session-middleware'),
}));

jest.mock('body-parser', () => ({
	urlencoded: jest.fn().mockReturnValue('body-parser-middleware'),
}));

jest.mock('connect-ensure-login', () => ({
	ensureLoggedIn: jest.fn().mockReturnValue('ensure-logged-in-middleware'),
}));

jest.mock('../../src/config', () => ({
	config: {
		PORT: 3000,
		BULL_BOARD_HOSTNAME: 'localhost',
		HOME_PAGE: '/',
		LOGIN_PAGE: '/login',
		AUTH_ENABLED: false,
		PROXY_PATH: '/proxy',
	},
}));

jest.mock('../../src/login', () => ({
	authRouter: 'auth-router',
}));

jest.mock('../../src/bull', () => ({
	router: 'bull-router',
}));

jest.mock('../../src/redis', () => ({
	client: {
		ping: jest.fn().mockResolvedValue('PONG'),
		on: jest.fn(),
	},
}));

describe('Express Application', () => {
	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();

		// Reset modules to ensure clean imports
		jest.resetModules();

		// Reset mock app and router
		Object.values(mockApp).forEach(mock => {
			if (typeof mock === 'function' && mock.mockClear) {
				mock.mockClear();
			}
		});

		Object.values(mockRouter).forEach(mock => {
			if (typeof mock === 'function' && mock.mockClear) {
				mock.mockClear();
			}
		});

		// Mock console.log to prevent output during tests
		jest.spyOn(console, 'log').mockImplementation();
	});

	afterEach(() => {
		// Restore console.log
		console.log.mockRestore();
	});

	it('should set up the Express application correctly', () => {
		// Import the module to test
		require('../../src/index');

		// Use the mockApp directly
		const app = mockApp;

		// Verify that app.set was called with the correct arguments
		expect(app.set).toHaveBeenCalledWith('views', expect.stringContaining('/views'));
		expect(app.set).toHaveBeenCalledWith('view engine', 'ejs');

		// Verify that app.use was called with the correct middleware
		expect(app.use).toHaveBeenCalledWith('session-middleware');
		expect(app.use).toHaveBeenCalledWith('passport-init-middleware');
		expect(app.use).toHaveBeenCalledWith('passport-session-middleware');
		expect(app.use).toHaveBeenCalledWith('body-parser-middleware');

		// Verify that app.listen was called with the correct arguments
		expect(app.listen).toHaveBeenCalledWith(3000, 'localhost', expect.any(Function));
	});

	it('should set up routes correctly when authentication is disabled', () => {
		// Import the module to test
		require('../../src/index');

		// Use the mockApp directly
		const app = mockApp;

		// Verify that app.use was called with the correct routes
		expect(app.use).toHaveBeenCalledWith('/', 'bull-router');

		// Verify that app.use was not called with auth router
		const authRouterCall = app.use.mock.calls.find(call => call[0] === '/login' && call[1] === 'auth-router');
		expect(authRouterCall).toBeUndefined();
	});

	it('should set up routes correctly when authentication is enabled', () => {
		// Mock config with authentication enabled
		jest.mock('../../src/config', () => ({
			config: {
				PORT: 3000,
				BULL_BOARD_HOSTNAME: 'localhost',
				HOME_PAGE: '/',
				LOGIN_PAGE: '/login',
				AUTH_ENABLED: true,
				PROXY_PATH: '/proxy',
			},
		}));

		// Import the module to test
		jest.isolateModules(() => {
			require('../../src/index');
		});

		// Use the mockApp directly
		const app = mockApp;

		// Verify that app.use was called with the correct routes
		expect(app.use).toHaveBeenCalledWith('/login', 'auth-router');
		expect(app.use).toHaveBeenCalledWith('/', 'ensure-logged-in-middleware', 'bull-router');
	});

	it('should set up proxy path middleware when PROXY_PATH is configured', () => {
		// Import the module to test
		require('../../src/index');

		// Use the mockApp directly
		// Find the middleware function that sets req.proxyUrl
		const proxyMiddleware = mockApp.use.mock.calls.find(call => typeof call[0] === 'function')[0];

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

	it('should set up health check endpoint', async () => {
		// Import the module to test
		require('../../src/index');

		// Use the mockApp directly
		// Get the health check middleware
		const healthCheckMiddleware = mockApp.use.mock.calls.find(call => call[0] === '/healthcheck')[1];
		expect(healthCheckMiddleware).toBeDefined();

		// Create mock request and response objects
		const req = {};
		const res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		};

		// Mock Redis client to return PONG
		const {client} = require('../../src/redis');
		client.ping.mockResolvedValue('PONG');

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
		// Mock Redis client to throw an error
		const {client} = require('../../src/redis');
		client.ping.mockRejectedValue(new Error('Redis connection error'));

		// Import the module to test
		jest.isolateModules(() => {
			require('../../src/index');
		});

		// Use the mockApp directly
		// Find the health check route handler
		const healthCheckRoute = mockApp.use.mock.calls.find(call => call[0] === '/healthcheck');
		expect(healthCheckRoute).toBeDefined();

		// Create a mock request handler
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
