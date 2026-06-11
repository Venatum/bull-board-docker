import { beforeEach, describe, expect, it, mock } from "bun:test";

// Set NODE_ENV to 'test' to prevent automatic execution of bullMain
process.env.NODE_ENV = "test";

describe("Bull Board UI Configuration", () => {
	let createBullBoardMock;
	let ExpressAdapterMock;

	// Cache-busting counter for ESM re-evaluation
	// (distinct query param from bull.test.js, which imports the same module)
	let importCounter = 0;

	const importBull = () => {
		importCounter++;
		return import(`../../src/bull.js?ui=${importCounter}`);
	};

	const mockConfigModule = (mockConfig) => {
		mock.module("../../src/config.js", () => ({
			config: mockConfig,
		}));
	};

	beforeEach(() => {
		// Setup Bull Board mocks
		createBullBoardMock = mock().mockReturnValue({
			setQueues: mock(),
		});
		mock.module("@bull-board/api", () => ({
			createBullBoard: createBullBoardMock,
		}));

		// Setup Express Adapter mock
		ExpressAdapterMock = mock();
		mock.module("@bull-board/express", () => ({
			ExpressAdapter: class {
				constructor(...args) {
					ExpressAdapterMock(...args);
				}
				getRouter() {
					return "router";
				}
			},
		}));

		// Mock other dependencies to avoid errors
		mock.module("../../src/redis.js", () => ({
			client: { connection: "redis-connection", on: mock() },
			redisConfig: { redis: {} },
			isCluster: false,
			clusterConfig: null,
		}));

		mock.module("bullmq", () => ({ Queue: mock() }));
		mock.module("bull", () => ({ default: mock() }));
		mock.module("@bull-board/api/bullMQAdapter", () => ({ BullMQAdapter: mock() }));
		mock.module("@bull-board/api/bullAdapter", () => ({ BullAdapter: mock() }));
		mock.module("exponential-backoff", () => ({ backOff: mock() }));
	});

	it("should have correct nesting for all UI options in uiConfig", async () => {
		const mockConfig = {
			BULL_BOARD_TITLE: "Custom Title",
			BULL_BOARD_LOGO_PATH: "/path/to/logo.png",
			BULL_BOARD_LOGO_WIDTH: "100px",
			BULL_BOARD_LOGO_HEIGHT: "50px",
			BULL_BOARD_FAVICON: "/path/to/favicon.ico",
			BULL_BOARD_FAVICON_ALTERNATIVE: "/path/to/alt-favicon.ico",
			BULL_BOARD_LOCALE: "fr-FR",
			BULL_BOARD_DATE_FORMATS_SHORT: "yyyy-MM-dd",
			BULL_BOARD_DATE_FORMATS_COMMON: "yyyy-MM-dd HH:mm",
			BULL_BOARD_DATE_FORMATS_FULL: "yyyy-MM-dd HH:mm:ss",
		};

		mockConfigModule(mockConfig);

		await importBull();

		expect(createBullBoardMock).toHaveBeenCalledWith(
			expect.objectContaining({
				options: expect.objectContaining({
					uiConfig: expect.objectContaining({
						boardTitle: "Custom Title",
						boardLogo: {
							path: "/path/to/logo.png",
							width: "100px",
							height: "50px",
						},
						favIcon: {
							default: "/path/to/favicon.ico",
							alternative: "/path/to/alt-favicon.ico",
						},
						locale: {
							lng: "fr-FR",
						},
						dateFormats: {
							short: "yyyy-MM-dd",
							common: "yyyy-MM-dd HH:mm",
							full: "yyyy-MM-dd HH:mm:ss",
						},
					}),
				}),
			}),
		);
	});

	it("should handle missing optional UI properties", async () => {
		const mockConfig = {
			BULL_BOARD_TITLE: "Title Only",
			// Other properties are undefined
		};

		mockConfigModule(mockConfig);

		await importBull();

		expect(createBullBoardMock).toHaveBeenCalledWith(
			expect.objectContaining({
				options: expect.objectContaining({
					uiConfig: {
						boardTitle: "Title Only",
						locale: {},
						dateFormats: {},
					},
				}),
			}),
		);
	});

	it("should ignore logo width/height when BULL_BOARD_LOGO_PATH is missing", async () => {
		const mockConfig = {
			BULL_BOARD_LOGO_WIDTH: "100px",
			BULL_BOARD_LOGO_HEIGHT: "50px",
		};

		mockConfigModule(mockConfig);

		await importBull();

		const uiConfig = createBullBoardMock.mock.calls[0][0].options.uiConfig;
		expect(uiConfig).not.toHaveProperty("boardLogo");
	});

	it("should ignore favicon alternative when BULL_BOARD_FAVICON is missing", async () => {
		const mockConfig = {
			BULL_BOARD_FAVICON_ALTERNATIVE: "/path/to/alt-favicon.ico",
		};

		mockConfigModule(mockConfig);

		await importBull();

		const uiConfig = createBullBoardMock.mock.calls[0][0].options.uiConfig;
		expect(uiConfig).not.toHaveProperty("favIcon");
	});

	it("should include logo with only a path when width/height are not set", async () => {
		const mockConfig = {
			BULL_BOARD_LOGO_PATH: "/path/to/logo.png",
			BULL_BOARD_FAVICON: "/path/to/favicon.ico",
		};

		mockConfigModule(mockConfig);

		await importBull();

		const uiConfig = createBullBoardMock.mock.calls[0][0].options.uiConfig;
		expect(uiConfig.boardLogo).toEqual({ path: "/path/to/logo.png" });
		expect(uiConfig.favIcon).toEqual({ default: "/path/to/favicon.ico" });
	});
});
