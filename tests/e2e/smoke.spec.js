import { test, expect } from "@playwright/test";

test.describe("bull-board smoke", () => {
	test("healthcheck returns 200 with redis up", async ({ request }) => {
		const res = await request.get("/healthcheck");
		expect(res.status()).toBe(200);

		const body = await res.json();
		expect(body.status).toBe("ok");
		expect(body.info.redis.status).toBe("up");
	});

	test("UI loads and shows the generated queue", async ({ page }) => {
		await page.goto("/");
		// bull-board is a React SPA; the queue discovered from Redis
		// (created by job-generator.js --all) shows up in the queue list.
		await expect(page.getByText("test-queue").first()).toBeVisible();
	});
});
