import {describe, it, expect, beforeEach, afterEach, mock, spyOn} from 'bun:test';

// override scope wise to avoid log flood
console.log = () => null;

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
			set: mock.fn(),
			use: mock.fn(),
			listen: mock.fn().mockImplementation((port, hostname, callback) => {
				if (callback) callback();
				return {on: mock.fn()};
			}),
			get: mock.fn(),
		};

		// Create mock router
		mockRouter = {
			get: mock.fn(),
			post: mock.fn(),
		};

		// Mock express
		mock.module('express', () => {
			const express = mock.fn(() => mockApp);
			express.Router = mock.fn(() => mockRouter);
			return {default: express};
		});

		// Mock morgan
		mock.module('morgan', () => {
			return {default: mock.fn().mockReturnValue('morgan-middleware')};
		});

		// Mock express-session
		mock.module('express-session', () => {
			return {default: mock.fn().mockReturnValue('session-middleware')};
		});

		// Mock passport
		mock.module('passport', () => ({
			default: {
				initialize: mock.fn().mockReturnValue('passport-init-middleware'),
				session: mock.fn().mockReturnValue('passport-session-middleware'),
			},
		}));

		// Mock body-parser
		mock.module('body-parser', () => ({
			default: {
				urlencoded: mock.fn().mockReturnValue('body-parser-middleware'),
			},
		}));

		// Mock connect-ensure-login
		mock.module('connect-ensure-login', () => ({
			ensureLoggedIn: mock.fn().mockReturnValue('ensure-logged-in-middleware'),
		}));

		// Mock config
		mock.module('../../src/config.js', () => ({
			config,
		}));

		// Mock login
		mock.module('../../src/login.js', () => ({
			authRouter: 'auth-router',
		}));

		// Mock bull
		mock.module('../../src/bull.js', () => ({
			router: 'bull-router',
		}));

		// Mock redis
		const redisMock = {
			client: {
				ping: mock.fn().mockResolvedValue(redisPingResponse),
				on: mock.fn(),
			},
		};

		mock.module('../../src/redis.js', () => redisMock);

		return redisMock;
	};

	beforeEach(() => {
		// Restore any previous mocks
		mock.restore();

		// Mock console.log to prevent output during tests
		consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		// Restore console.log
		if (consoleSpy) {
			consoleSpy.mockRestore();
			consoleSpy = undefined;
		}
	});

	describe('Application Setup', () => {
		it('should set up the Express application correctly', async () => {
			setupCommonMocks();

			await import('../../src/index.js');

			expect(mockApp.set).toHaveBeenCalledWith('views', expect.stringContaining('/views'));
			expect(mockApp.set).toHaveBeenCalledWith('view engine', 'ejs');

			expect(mockApp.use).toHaveBeenCalledWith('session-middleware');
			expect(mockApp.use).toHaveBeenCalledWith('passport-init-middleware');
			expect(mockApp.use).toHaveBeenCalledWith('passport-session-middleware');
			expect(mockApp.use).toHaveBeenCalledWith('body-parser-middleware');

			expect(mockApp.listen).toHaveBeenCalledWith(3000, 'localhost', expect.any(Function));
		});
	});

	describe('Routing', () => {
		it('should set up routes correctly when authentication is disabled', async () => {
			setupCommonMocks();

			await import('../../src/index.js');

			expect(mockApp.use).toHaveBeenCalledWith('/', 'bull-router');

			const authRouterCall = mockApp.use.mock.calls.find(
				(call) => call[0] === '/login' && call[1] === 'auth-router',
			);
			expect(authRouterCall).toBeUndefined();
		});

		it('should set up routes correctly when authentication is enabled', async () => {
			setupCommonMocks({
				...defaultConfig,
				AUTH_ENABLED: true,
			});

			await import('../../src/index.js');

			expect(mockApp.use).toHaveBeenCalledWith('/login', 'auth-router');
			expect(mockApp.use).toHaveBeenCalledWith(
				'/',
				'ensure-logged-in-middleware',
				'bull-router',
			);
		});

		it('should set up proxy path middleware when PROXY_PATH is configured', async () => {
			setupCommonMocks();

			await import('../../src/index.js');

			const proxyMiddleware = mockApp.use.mock.calls.find(
				(call) => typeof call[0] === 'function',
			)[0];
			expect(proxyMiddleware).toBeDefined();

			const req = {};
			const res = {};
			const next = mock.fn();

			proxyMiddleware(req, res, next);

			expect(req.proxyUrl).toBe('/proxy');
			expect(next).toHaveBeenCalled();
		});
	});

	describe('Health Check', () => {
		it('should set up health check endpoint with successful Redis connection', async () => {
			setupCommonMocks();

			await import('../../src/index.js');

			const healthCheckMiddleware = mockApp.use.mock.calls.find(
				(call) => call[0] === '/healthcheck',
			)[1];
			expect(healthCheckMiddleware).toBeDefined();

			const req = {};
			const res = {
				status: mock.fn().mockReturnThis(),
				json: mock.fn(),
			};

			await healthCheckMiddleware(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'ok',
					info: expect.objectContaining({
						redis: expect.objectContaining({
							status: 'up',
							description: expect.any(String),
						}),
					}),
				}),
			);
		});

		it('should handle Redis error in health check endpoint', async () => {
			const redisMock = setupCommonMocks(defaultConfig);
			redisMock.client.ping.mockRejectedValue(new Error('Redis connection error'));

			await import('../../src/index.js');

			const healthCheckRoute = mockApp.use.mock.calls.find(
				(call) => call[0] === '/healthcheck',
			);
			expect(healthCheckRoute).toBeDefined();

			const handler = healthCheckRoute[1];

			const req = {};
			const res = {
				status: mock.fn().mockReturnThis(),
				json: mock.fn(),
			};

			await handler(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'error',
					info: expect.objectContaining({
						redis: expect.objectContaining({
							status: undefined,
							description: expect.any(String),
							error: 'Redis connection error',
						}),
					}),
				}),
			);
		});
	});
});
