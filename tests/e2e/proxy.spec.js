import { test, expect } from "@playwright/test";

// bullboard-proxy: PROXY_PATH=/monitor + auth (admin/secret), BULL_PREFIX=proxyq.
const USER = "admin";
const PASS = "secret";

test.describe("proxy path feature", () => {
	test("root path does not serve the board (404)", async ({ request }) => {
		const res = await request.get("/", { maxRedirects: 0 });
		expect(res.status()).toBe(404);
	});

	test("/monitor redirects unauthenticated to /monitor/login", async ({ request }) => {
		const res = await request.get("/monitor", { maxRedirects: 0 });
		expect(res.status()).toBe(302);
		expect(res.headers()["location"]).toContain("/monitor/login");
	});

	test("login page renders under the proxy path", async ({ page }) => {
		await page.goto("/monitor/login");
		await expect(page.locator('input[name="username"]')).toBeVisible();
	});

	test("login under proxy path grants access to the board", async ({ page }) => {
		// src/bull.js calls serverAdapter.setBasePath(config.HOME_PAGE), so under
		// PROXY_PATH the served HTML's <base> correctly points at /monitor/ and the
		// SPA's static assets resolve and render the board.
		await page.goto("/monitor/login");
		await page.locator('input[name="username"]').fill(USER);
		await page.locator('input[name="password"]').fill(PASS);
		await page.getByRole("button", { name: "Login" }).click();
		await expect(page.getByText("test-queue").first()).toBeVisible();
	});

	test("healthcheck stays at root (outside proxy path)", async ({ request }) => {
		const res = await request.get("/healthcheck");
		expect(res.status()).toBe(200);
	});
});
