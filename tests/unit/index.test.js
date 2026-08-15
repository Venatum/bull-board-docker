import { describe, it, expect, beforeEach, afterEach, mock, spyOn, jest } from "bun:test";

// override scope wise to avoid log flood
console.log = () => null;

describe("Express Application", () => {
	// Common mocks
	let mockApp;
	let mockRouter;
	let mockServer;
	let consoleSpy;

	// Cache-busting counter for ESM re-evaluation
	let importCounter = 0;
	const importIndex = async () => {
		importCounter++;
		return await import(`../../src/index.js?v=${importCounter}`);
	};

	// Default config
	const defaultConfig = {
		PORT: 3000,
		BULL_BOARD_HOSTNAME: "localhost",
		HOME_PAGE: "/",
		LOGIN_PAGE: "/login",
		AUTH_ENABLED: false,
		PROXY_PATH: "/proxy",
	};

	// Helper function to setup common mocks
	const setupCommonMocks = (config = defaultConfig, redisPingResponse = "PONG") => {
		// Create mock app for testing
		mockApp = {
			set: mock(),
			use: mock(),
			listen: mock().mockImplementation((port, hostname, callback) => {
				if (callback) callback();
				mockServer = {
					on: mock(),
					close: mock().mockImplementation((cb) => {
						if (cb) cb();
					}),
				};
				return mockServer;
			}),
			get: mock(),
		};

		// Create mock router
		mockRouter = {
			get: mock(),
			post: mock(),
		};

		// Mock express
		mock.module("express", () => {
			const express = mock(() => mockApp);
			express.Router = mock(() => mockRouter);
			return { default: express };
		});

		// Mock morgan
		mock.module("morgan", () => {
			return { default: mock().mockReturnValue("morgan-middleware") };
		});

		// Mock express-session
		mock.module("express-session", () => {
			return { default: mock().mockReturnValue("session-middleware") };
		});

		// Mock passport
		mock.module("passport", () => ({
			default: {
				initialize: mock().mockReturnValue("passport-init-middleware"),
				session: mock().mockReturnValue("passport-session-middleware"),
			},
		}));

		// Mock body-parser
		mock.module("body-parser", () => ({
			default: {
				urlencoded: mock().mockReturnValue("body-parser-middleware"),
			},
		}));

		// Mock connect-ensure-login
		mock.module("connect-ensure-login", () => ({
			ensureLoggedIn: mock().mockReturnValue("ensure-logged-in-middleware"),
		}));

		// Mock config
		mock.module("../../src/config.js", () => ({
			config,
		}));

		// Mock login
		mock.module("../../src/login.js", () => ({
			authRouter: "auth-router",
		}));

		// Mock bull
		mock.module("../../src/bull.js", () => ({
			router: "bull-router",
		}));

		// Mock redis
		const redisMock = {
			client: {
				ping: mock().mockResolvedValue(redisPingResponse),
				on: mock(),
			},
			redisConfig: { redis: { host: "localhost", port: 6379 } },
			isCluster: false,
			clusterConfig: null,
		};

		mock.module("../../src/redis.js", () => redisMock);

		return redisMock;
	};

	beforeEach(() => {
		// Clear all mocks before each test
		mock.restore();

		// Mock console.log to prevent output during tests
		consoleSpy = spyOn(console, "log").mockImplementation();
	});

	afterEach(() => {
		// Restore console.log
		if (consoleSpy) {
			consoleSpy.mockRestore();
			consoleSpy = undefined;
		}
	});

	describe("Application Setup", () => {
		it("should set up the Express application correctly", async () => {
			// Setup mocks
			setupCommonMocks();

			// Import the module to test
			await importIndex();

			// Verify that app.set was called with the correct arguments
			expect(mockApp.set).toHaveBeenCalledWith("views", expect.stringContaining("/views"));
			expect(mockApp.set).toHaveBeenCalledWith("view engine", "ejs");

			// Verify that app.use was called with the correct middleware
			expect(mockApp.use).toHaveBeenCalledWith("session-middleware");
			expect(mockApp.use).toHaveBeenCalledWith("passport-init-middleware");
			expect(mockApp.use).toHaveBeenCalledWith("passport-session-middleware");
			expect(mockApp.use).toHaveBeenCalledWith("body-parser-middleware");

			// Verify that app.listen was called with the correct arguments
			expect(mockApp.listen).toHaveBeenCalledWith(3000, "localhost", expect.any(Function));
		});
	});

	describe("Routing", () => {
		it("should set up routes correctly when authentication is disabled", async () => {
			// Setup mocks with authentication disabled
			setupCommonMocks();

			// Import the module to test
			await importIndex();

			// Verify that app.use was called with the correct routes
			expect(mockApp.use).toHaveBeenCalledWith("/", "bull-router");

			// Verify that app.use was not called with auth router
			const authRouterCall = mockApp.use.mock.calls.find(
				(call) => call[0] === "/login" && call[1] === "auth-router",
			);
			expect(authRouterCall).toBeUndefined();
		});

		it("should set up routes correctly when authentication is enabled", async () => {
			// Setup mocks with authentication enabled
			setupCommonMocks({
				...defaultConfig,
				AUTH_ENABLED: true,
			});

			// Import the module to test
			await importIndex();

			// Verify that app.use was called with the correct routes
			expect(mockApp.use).toHaveBeenCalledWith("/login", "auth-router");
			expect(mockApp.use).toHaveBeenCalledWith("/", "ensure-logged-in-middleware", "bull-router");
		});

		it("should set up proxy path middleware when PROXY_PATH is configured", async () => {
			// Setup mocks
			setupCommonMocks();

			// Import the module to test
			await importIndex();

			// Find the middleware function that sets req.proxyUrl
			const proxyMiddleware = mockApp.use.mock.calls.find(
				(call) => typeof call[0] === "function",
			)[0];
			expect(proxyMiddleware).toBeDefined();

			// Create mock request and response objects
			const req = {};
			const res = {};
			const next = mock();

			// Call the middleware
			proxyMiddleware(req, res, next);

			// Verify that req.proxyUrl was set correctly
			expect(req.proxyUrl).toBe("/proxy");

			// Verify that next was called
			expect(next).toHaveBeenCalled();
		});
	});

	describe("Health Check", () => {
		it("should set up health check endpoint with successful Redis connection", async () => {
			// Setup mocks with successful Redis ping
			setupCommonMocks();

			// Import the module to test
			await importIndex();

			// Get the health check middleware
			const healthCheckMiddleware = mockApp.use.mock.calls.find(
				(call) => call[0] === "/healthcheck",
			)[1];
			expect(healthCheckMiddleware).toBeDefined();

			// Create mock request and response objects
			const req = {};
			const res = {
				status: mock().mockReturnThis(),
				json: mock(),
			};

			// Call the middleware
			await healthCheckMiddleware(req, res);

			// Verify that res.status and res.json were called with the correct arguments
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "ok",
					info: expect.objectContaining({
						redis: expect.objectContaining({
							status: "up",
							description: expect.any(String),
						}),
					}),
				}),
			);
		});

		it("should handle Redis error in health check endpoint", async () => {
			// Setup mocks with Redis error
			const redisMock = setupCommonMocks(defaultConfig);
			redisMock.client.ping.mockRejectedValue(new Error("Redis connection error"));

			// Import the module to test
			await importIndex();

			// Find the health check route handler
			const healthCheckRoute = mockApp.use.mock.calls.find((call) => call[0] === "/healthcheck");
			expect(healthCheckRoute).toBeDefined();

			// Get the handler
			const handler = healthCheckRoute[1];

			// Create mock request and response objects
			const req = {};
			const res = {
				status: mock().mockReturnThis(),
				json: mock(),
			};

			// Call the handler
			await handler(req, res);

			// Verify that res.status and res.json were called with the correct arguments
			expect(res.status).toHaveBeenCalledWith(503);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "error",
					info: expect.objectContaining({
						redis: expect.objectContaining({
							status: undefined,
							description: expect.any(String),
							error: "Redis connection error",
						}),
					}),
				}),
			);
		});
	});

	describe("Graceful Shutdown", () => {
		it("should register SIGTERM and SIGINT handlers", async () => {
			const processOnSpy = spyOn(process, "on");
			setupCommonMocks();

			await importIndex();

			expect(processOnSpy).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
			expect(processOnSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
			processOnSpy.mockRestore();
		});

		it("should close server and Redis connection on SIGTERM", async () => {
			const processOnSpy = spyOn(process, "on");
			const processExitSpy = spyOn(process, "exit").mockImplementation(() => {});
			const redisMock = setupCommonMocks({
				...defaultConfig,
				GRACEFUL_SHUTDOWN_TIMEOUT: 10000,
			});
			redisMock.client.quit = mock().mockResolvedValue("OK");

			await importIndex();

			const sigtermHandler = processOnSpy.mock.calls.find((call) => call[0] === "SIGTERM")[1];

			await sigtermHandler();

			expect(mockServer.close).toHaveBeenCalledWith(expect.any(Function));
			expect(redisMock.client.quit).toHaveBeenCalled();
			expect(processExitSpy).toHaveBeenCalledWith(0);

			processOnSpy.mockRestore();
			processExitSpy.mockRestore();
		});

		it("should exit with code 1 when client.quit() rejects during shutdown", async () => {
			const processOnSpy = spyOn(process, "on");
			const processExitSpy = spyOn(process, "exit").mockImplementation(() => {});
			const consoleErrorSpy = spyOn(console, "error").mockImplementation();
			const redisMock = setupCommonMocks({
				...defaultConfig,
				GRACEFUL_SHUTDOWN_TIMEOUT: 10000,
			});
			redisMock.client.quit = mock().mockRejectedValue(new Error("Redis quit failed"));

			await importIndex();

			const sigtermHandler = processOnSpy.mock.calls.find((call) => call[0] === "SIGTERM")[1];

			await sigtermHandler();

			expect(redisMock.client.quit).toHaveBeenCalled();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Error closing Redis connection:",
				expect.any(Error),
			);
			expect(processExitSpy).toHaveBeenCalledWith(1);

			processOnSpy.mockRestore();
			processExitSpy.mockRestore();
			consoleErrorSpy.mockRestore();
		});

		it("should force-exit with code 1 when shutdown exceeds the timeout", async () => {
			jest.useFakeTimers();
			const processOnSpy = spyOn(process, "on");
			const processExitSpy = spyOn(process, "exit").mockImplementation(() => {});
			const consoleErrorSpy = spyOn(console, "error").mockImplementation();
			setupCommonMocks({
				...defaultConfig,
				GRACEFUL_SHUTDOWN_TIMEOUT: 5000,
			});

			await importIndex();

			// Simulate a hanging server.close() — never invokes its callback
			mockServer.close = mock();

			const sigtermHandler = processOnSpy.mock.calls.find((call) => call[0] === "SIGTERM")[1];
			sigtermHandler();

			expect(processExitSpy).not.toHaveBeenCalled();

			jest.advanceTimersByTime(5000);

			expect(consoleErrorSpy).toHaveBeenCalledWith("Forced shutdown after timeout");
			expect(processExitSpy).toHaveBeenCalledWith(1);

			jest.useRealTimers();
			processOnSpy.mockRestore();
			processExitSpy.mockRestore();
			consoleErrorSpy.mockRestore();
		});

		it("does not arm the force-kill timer when the timeout is 0", async () => {
			jest.useFakeTimers();
			const setTimeoutSpy = spyOn(globalThis, "setTimeout");
			const processOnSpy = spyOn(process, "on");
			const processExitSpy = spyOn(process, "exit").mockImplementation(() => {});
			setupCommonMocks({
				...defaultConfig,
				GRACEFUL_SHUTDOWN_TIMEOUT: 0,
			});

			await importIndex();

			// Simulate a hanging server.close() — never invokes its callback
			mockServer.close = mock();

			const sigtermHandler = processOnSpy.mock.calls.find((call) => call[0] === "SIGTERM")[1];
			sigtermHandler();

			expect(setTimeoutSpy).not.toHaveBeenCalled();

			jest.advanceTimersByTime(60000);

			expect(processExitSpy).not.toHaveBeenCalled();

			jest.useRealTimers();
			setTimeoutSpy.mockRestore();
			processOnSpy.mockRestore();
			processExitSpy.mockRestore();
		});

		it("should not shutdown twice on repeated signals", async () => {
			const processOnSpy = spyOn(process, "on");
			const processExitSpy = spyOn(process, "exit").mockImplementation(() => {});
			const redisMock = setupCommonMocks({
				...defaultConfig,
				GRACEFUL_SHUTDOWN_TIMEOUT: 10000,
			});
			redisMock.client.quit = mock().mockResolvedValue("OK");

			await importIndex();

			const sigtermHandler = processOnSpy.mock.calls.find((call) => call[0] === "SIGTERM")[1];

			await sigtermHandler();
			await sigtermHandler();

			expect(mockServer.close).toHaveBeenCalledTimes(1);

			processOnSpy.mockRestore();
			processExitSpy.mockRestore();
		});
	});
});
