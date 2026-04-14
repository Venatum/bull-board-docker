import {describe, expect, it, beforeEach, mock} from 'bun:test';

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
			use: mock.fn(),
			authenticate: mock.fn().mockReturnValue('passport-authenticate-middleware'),
			serializeUser: mock.fn(),
			deserializeUser: mock.fn(),
		};
		mock.module('passport', () => ({default: mockPassport}));

		// Mock passport-local
		mockLocalStrategy = mock.fn();
		mock.module('passport-local', () => ({
			Strategy: mockLocalStrategy,
		}));

		// Mock express
		mockRouter = {
			route: mock.fn().mockReturnThis(),
			get: mock.fn().mockReturnThis(),
			post: mock.fn().mockReturnThis(),
		};
		mock.module('express', () => ({
			default: {
				Router: mock.fn().mockReturnValue(mockRouter),
			},
		}));

		// Mock config
		mock.module('../../src/config.js', () => ({
			config,
		}));

		return {mockPassport, mockLocalStrategy, mockRouter};
	};

	beforeEach(() => {
		mock.restore();
	});

	describe('Passport Strategy', () => {
		it('should set up Passport.js with LocalStrategy', async () => {
			setupCommonMocks();

			await import('../../src/login.js');

			expect(mockPassport.use).toHaveBeenCalledWith(expect.any(mockLocalStrategy));

			const strategyCallback = mockLocalStrategy.mock.calls[0][0];

			const doneCb = mock.fn();
			strategyCallback('admin', 'password', doneCb);
			expect(doneCb).toHaveBeenCalledWith(null, {user: 'bull-board'});

			doneCb.mockClear();
			strategyCallback('wrong', 'password', doneCb);
			expect(doneCb).toHaveBeenCalledWith(null, false);

			doneCb.mockClear();
			strategyCallback('admin', 'wrong', doneCb);
			expect(doneCb).toHaveBeenCalledWith(null, false);
		});
	});

	describe('User Serialization', () => {
		it('should set up serialization and deserialization', async () => {
			setupCommonMocks();

			await import('../../src/login.js');

			expect(mockPassport.serializeUser).toHaveBeenCalled();
			expect(mockPassport.deserializeUser).toHaveBeenCalled();

			const serializeCallback = mockPassport.serializeUser.mock.calls[0][0];

			const doneCb = mock.fn();
			const user = {user: 'bull-board'};
			serializeCallback(user, doneCb);
			expect(doneCb).toHaveBeenCalledWith(null, user);

			const deserializeCallback = mockPassport.deserializeUser.mock.calls[0][0];

			doneCb.mockClear();
			deserializeCallback(user, doneCb);
			expect(doneCb).toHaveBeenCalledWith(null, user);
		});
	});

	describe('Authentication Routes', () => {
		it('should set up authentication routes', async () => {
			setupCommonMocks();

			await import('../../src/login.js');

			expect(mockRouter.route).toHaveBeenCalledWith('/');
			expect(mockRouter.get).toHaveBeenCalled();

			const getHandler = mockRouter.get.mock.calls[0][0];

			const req = {};
			const res = {
				render: mock.fn(),
			};

			getHandler(req, res);

			expect(res.render).toHaveBeenCalledWith('login');
			expect(mockRouter.post).toHaveBeenCalledWith('passport-authenticate-middleware');
			expect(mockPassport.authenticate).toHaveBeenCalledWith('local', {
				successRedirect: '/',
				failureRedirect: '/login',
			});
		});

		it('should use custom redirect paths from config', async () => {
			setupCommonMocks({
				USER_LOGIN: 'admin',
				USER_PASSWORD: 'password',
				HOME_PAGE: '/custom-home',
				LOGIN_PAGE: '/custom-login',
			});

			await import('../../src/login.js');

			expect(mockPassport.authenticate).toHaveBeenCalledWith('local', {
				successRedirect: '/custom-home',
				failureRedirect: '/custom-login',
			});
		});
	});
});
