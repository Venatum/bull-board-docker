import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "tests/e2e",
	timeout: 30_000,
	expect: { timeout: 30_000 },
	retries: process.env.CI ? 1 : 0,
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
		trace: "on-first-retry",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
