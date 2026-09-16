import { defineConfig, devices } from "@playwright/test";

const chrome = devices["Desktop Chrome"];

export default defineConfig({
	testDir: "tests/e2e",
	timeout: 30_000,
	expect: { timeout: 30_000 },
	retries: process.env.CI ? 1 : 0,
	reporter: [["list"], ["html", { open: "never" }], ...(process.env.CI ? [["github"]] : [])],
	use: { trace: "on-first-retry" },
	projects: [
		{
			name: "smoke",
			testMatch: /smoke\.spec\.js/,
			use: { ...chrome, baseURL: process.env.E2E_SMOKE_URL || "http://localhost:3000" },
		},
		{
			name: "auth",
			testMatch: /auth\.spec\.js/,
			use: { ...chrome, baseURL: process.env.E2E_AUTH_URL || "http://localhost:3001" },
		},
		{
			name: "proxy",
			testMatch: /proxy\.spec\.js/,
			use: { ...chrome, baseURL: process.env.E2E_PROXY_URL || "http://localhost:3002" },
		},
		{
			name: "prefix",
			testMatch: /prefix\.spec\.js/,
			use: { ...chrome, baseURL: process.env.E2E_PREFIX_URL || "http://localhost:3003" },
		},
		{
			name: "version",
			testMatch: /version\.spec\.js/,
			use: { ...chrome, baseURL: process.env.E2E_VERSION_URL || "http://localhost:3004" },
		},
	],
});
