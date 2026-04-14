import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";

// override scope wise to avoid log flood
console.log = () => null;

describe("Express Application", () => {
	let importCounter = 0;
	const importIndex = async () => {
		importCounter++;
		return await import(`../../src/index.js?v=${importCounter}`);
	};

	let mockApp;
	let mockRouter;
	let consoleSpy;

	const defaultConfig = {
		PORT: 3000,
		BULL_BOARD_HOSTNAME: "localhost",
		HOME_PAGE: "/",
		LOGIN_PAGE: "/login",
		AUTH_ENABLED: false,
		PROXY_PATH: "/proxy",
	};

	const setupCommonMocks = (config = defaultConfig, redisPingResponse = "PONG") => {
		mockApp = {
			set: mock(),
			use: mock(),
			listen: mock().mockImplementation((port, hostname, callback) => {
				if (callback) callback();
				return { on: mock() };
			}),
			get: mock(),
		};

		mockRouter = {
			get: mock(),
			post: mock(),
		};

		mock.module("express", () => {
			const express = mock(() => mockApp);
			express.Router = mock(() => mockRouter);
			return { default: express };
		});

		mock.module("morgan", () => ({ default: mock().mockReturnValue("morgan-middleware") }));
		mock.module("express-session", () => ({
			default: mock().mockReturnValue("session-middleware"),
		}));
		mock.module("passport", () => ({
			default: {
				initialize: mock().mockReturnValue("passport-init-middleware"),
				session: mock().mockReturnValue("passport-session-middleware"),
			},
		}));
		mock.module("body-parser", () => ({
			default: { urlencoded: mock().mockReturnValue("body-parser-middleware") },
		}));
		mock.module("connect-ensure-login", () => ({
			ensureLoggedIn: mock().mockReturnValue("ensure-logged-in-middleware"),
		}));
		mock.module("../../src/config.js", () => ({ config }));
		mock.module("../../src/login.js", () => ({ authRouter: "auth-router" }));
		mock.module("../../src/bull.js", () => ({ router: "bull-router" }));

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
		mock.restore();
		consoleSpy = spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		if (consoleSpy) {
			consoleSpy.mockRestore();
			consoleSpy = undefined;
		}
	});

	describe("Application Setup", () => {
		it("should set up the Express application correctly", async () => {
			setupCommonMocks();
			await importIndex();

			expect(mockApp.set).toHaveBeenCalledWith("views", expect.stringContaining("/views"));
			expect(mockApp.set).toHaveBeenCalledWith("view engine", "ejs");
			expect(mockApp.use).toHaveBeenCalledWith("session-middleware");
			expect(mockApp.use).toHaveBeenCalledWith("passport-init-middleware");
			expect(mockApp.use).toHaveBeenCalledWith("passport-session-middleware");
			expect(mockApp.use).toHaveBeenCalledWith("body-parser-middleware");
			expect(mockApp.listen).toHaveBeenCalledWith(3000, "localhost", expect.any(Function));
		});
	});

	describe("Routing", () => {
		it("should set up routes correctly when authentication is disabled", async () => {
			setupCommonMocks();
			await importIndex();

			expect(mockApp.use).toHaveBeenCalledWith("/", "bull-router");
			const authRouterCall = mockApp.use.mock.calls.find(
				(call) => call[0] === "/login" && call[1] === "auth-router",
			);
			expect(authRouterCall).toBeUndefined();
		});

		it("should set up routes correctly when authentication is enabled", async () => {
			setupCommonMocks({ ...defaultConfig, AUTH_ENABLED: true });
			await importIndex();

			expect(mockApp.use).toHaveBeenCalledWith("/login", "auth-router");
			expect(mockApp.use).toHaveBeenCalledWith("/", "ensure-logged-in-middleware", "bull-router");
		});

		it("should set up proxy path middleware when PROXY_PATH is configured", async () => {
			setupCommonMocks();
			await importIndex();

			const proxyMiddleware = mockApp.use.mock.calls.find(
				(call) => typeof call[0] === "function",
			)[0];
			expect(proxyMiddleware).toBeDefined();

			const req = {};
			const res = {};
			const next = mock();
			proxyMiddleware(req, res, next);
			expect(req.proxyUrl).toBe("/proxy");
			expect(next).toHaveBeenCalled();
		});
	});

	describe("Health Check", () => {
		it("should set up health check endpoint with successful Redis connection", async () => {
			setupCommonMocks();
			await importIndex();

			const healthCheckMiddleware = mockApp.use.mock.calls.find(
				(call) => call[0] === "/healthcheck",
			)[1];
			expect(healthCheckMiddleware).toBeDefined();

			const req = {};
			const res = { status: mock().mockReturnThis(), json: mock() };
			await healthCheckMiddleware(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				expect.objectContaining({
					status: "ok",
					info: expect.objectContaining({
						redis: expect.objectContaining({ status: "up", description: expect.any(String) }),
					}),
				}),
			);
		});

		it("should handle Redis error in health check endpoint", async () => {
			const redisMock = setupCommonMocks(defaultConfig);
			redisMock.client.ping.mockRejectedValue(new Error("Redis connection error"));
			await importIndex();

			const healthCheckRoute = mockApp.use.mock.calls.find((call) => call[0] === "/healthcheck");
			expect(healthCheckRoute).toBeDefined();
			const handler = healthCheckRoute[1];

			const req = {};
			const res = { status: mock().mockReturnThis(), json: mock() };
			await handler(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
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
});
