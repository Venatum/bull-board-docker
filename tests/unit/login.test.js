import { describe, expect, it, beforeEach, mock } from "bun:test";

describe("Authentication", () => {
	let importCounter = 0;
	const importLogin = async () => {
		importCounter++;
		return await import(`../../src/login.js?v=${importCounter}`);
	};

	const defaultConfig = {
		USER_LOGIN: "admin",
		USER_PASSWORD: "password",
		HOME_PAGE: "/",
		LOGIN_PAGE: "/login",
	};

	let mockPassport;
	let mockLocalStrategy;
	let mockRouter;

	const setupCommonMocks = (config = defaultConfig) => {
		mockPassport = {
			use: mock(),
			authenticate: mock().mockReturnValue("passport-authenticate-middleware"),
			serializeUser: mock(),
			deserializeUser: mock(),
		};
		mock.module("passport", () => ({ default: mockPassport }));

		mockLocalStrategy = mock();
		mock.module("passport-local", () => ({ Strategy: mockLocalStrategy }));

		mockRouter = {
			route: mock().mockReturnThis(),
			get: mock().mockReturnThis(),
			post: mock().mockReturnThis(),
		};
		mock.module("express", () => ({
			default: { Router: mock().mockReturnValue(mockRouter) },
		}));

		mock.module("../../src/config.js", () => ({ config }));

		return { mockPassport, mockLocalStrategy, mockRouter };
	};

	beforeEach(() => {
		mock.restore();
	});

	describe("Passport Strategy", () => {
		it("should set up Passport.js with LocalStrategy", async () => {
			setupCommonMocks();
			await importLogin();

			expect(mockPassport.use).toHaveBeenCalledTimes(1);

			const strategyCallback = mockLocalStrategy.mock.calls[0][0];
			const doneCb = mock();
			strategyCallback("admin", "password", doneCb);
			expect(doneCb).toHaveBeenCalledWith(null, { user: "bull-board" });

			doneCb.mockClear();
			strategyCallback("wrong", "password", doneCb);
			expect(doneCb).toHaveBeenCalledWith(null, false);

			doneCb.mockClear();
			strategyCallback("admin", "wrong", doneCb);
			expect(doneCb).toHaveBeenCalledWith(null, false);
		});
	});

	describe("User Serialization", () => {
		it("should set up serialization and deserialization", async () => {
			setupCommonMocks();
			await importLogin();

			expect(mockPassport.serializeUser).toHaveBeenCalled();
			expect(mockPassport.deserializeUser).toHaveBeenCalled();

			const serializeCallback = mockPassport.serializeUser.mock.calls[0][0];
			const doneCb = mock();
			const user = { user: "bull-board" };
			serializeCallback(user, doneCb);
			expect(doneCb).toHaveBeenCalledWith(null, user);

			const deserializeCallback = mockPassport.deserializeUser.mock.calls[0][0];
			doneCb.mockClear();
			deserializeCallback(user, doneCb);
			expect(doneCb).toHaveBeenCalledWith(null, user);
		});
	});

	describe("Authentication Routes", () => {
		it("should set up authentication routes", async () => {
			setupCommonMocks();
			await importLogin();

			expect(mockRouter.route).toHaveBeenCalledWith("/");
			expect(mockRouter.get).toHaveBeenCalled();

			const getHandler = mockRouter.get.mock.calls[0][0];
			const req = {};
			const res = { render: mock() };
			getHandler(req, res);

			expect(res.render).toHaveBeenCalledWith("login");
			expect(mockRouter.post).toHaveBeenCalledWith("passport-authenticate-middleware");
			expect(mockPassport.authenticate).toHaveBeenCalledWith("local", {
				successRedirect: "/",
				failureRedirect: "/login",
			});
		});

		it("should use custom redirect paths from config", async () => {
			setupCommonMocks({
				USER_LOGIN: "admin",
				USER_PASSWORD: "password",
				HOME_PAGE: "/custom-home",
				LOGIN_PAGE: "/custom-login",
			});
			await importLogin();

			expect(mockPassport.authenticate).toHaveBeenCalledWith("local", {
				successRedirect: "/custom-home",
				failureRedirect: "/custom-login",
			});
		});
	});
});
