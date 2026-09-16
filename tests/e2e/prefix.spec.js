import { test, expect } from "@playwright/test";

// bullboard-prefix: BULL_PREFIX=myapp. Seed created "prefixed-queue" under myapp.
// "test-queue" only exists under the default prefix "bull" (seeded by smoke), so
// it must NOT appear here — proving discovery scans myapp, not bull.
test.describe("custom prefix feature", () => {
	test("queue under the custom prefix is discovered", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("prefixed-queue").first()).toBeVisible();
	});

	test("queue from the default prefix is not shown", async ({ page }) => {
		await page.goto("/");
		// Wait until the board has actually rendered its queue, so the negative
		// assertion below cannot pass vacuously against a still-empty board.
		await expect(page.getByText("prefixed-queue").first()).toBeVisible();
		await expect(page.getByText("test-queue")).toHaveCount(0);
	});
});
