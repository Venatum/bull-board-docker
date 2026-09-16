import { test, expect } from "@playwright/test";

// bullboard-auth: USER_LOGIN=admin / USER_PASSWORD=secret, BULL_PREFIX=authq.
const USER = "admin";
const PASS = "secret";

test.describe("auth feature", () => {
	test("unauthenticated request to / redirects to /login", async ({ request }) => {
		const res = await request.get("/", { maxRedirects: 0 });
		expect(res.status()).toBe(302);
		expect(res.headers()["location"]).toContain("/login");
	});

	test("login page renders a form", async ({ page }) => {
		await page.goto("/login");
		await expect(page.locator('input[name="username"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
	});

	test("wrong credentials do not grant access", async ({ page }) => {
		await page.goto("/login");
		await page.locator('input[name="username"]').fill(USER);
		await page.locator('input[name="password"]').fill("wrong-password");
		await page.getByRole("button", { name: "Login" }).click();
		await expect(page).toHaveURL(/\/login/);
	});

	test("correct credentials grant access to the board", async ({ page }) => {
		await page.goto("/login");
		await page.locator('input[name="username"]').fill(USER);
		await page.locator('input[name="password"]').fill(PASS);
		await page.getByRole("button", { name: "Login" }).click();
		await expect(page.getByText("test-queue").first()).toBeVisible();
	});

	test("healthcheck stays open (not behind auth)", async ({ request }) => {
		const res = await request.get("/healthcheck");
		expect(res.status()).toBe(200);
	});
});
