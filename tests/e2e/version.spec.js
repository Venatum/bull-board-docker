import { test, expect } from "@playwright/test";

// bullboard-version: BULL_VERSION=BULL, BULL_PREFIX=bullv. Seed created
// "bull-queue" with the Bull engine under bullv — proving the Bull adapter path
// (not BullMQ) discovers Bull-structured keys.
test.describe("bull version feature", () => {
	test("Bull-engine queue is discovered", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("bull-queue").first()).toBeVisible();
	});
});
