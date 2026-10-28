import { expect, test } from "@playwright/test";

test.describe("[svelte-bridge] GameHost", () => {
  test("mounts, publishes state, runs typed commands, and disposes on navigation", async ({ page }) => {
    await page.goto("/docs/phase-2/svelte");
    await expect(page.getByTestId("adapter-status")).toHaveText("ready");
    await expect(page.getByTestId("adapter-score")).toHaveText("0");
    await expect(page.getByTestId("adapter-right-status")).toHaveText("ready");
    await expect(page.getByTestId("adapter-right-score")).toHaveText("10");
    await page.getByTestId("adapter-increment").click();
    await expect(page.getByTestId("adapter-score")).toHaveText("2");
    await expect(page.getByTestId("adapter-right-score")).toHaveText("10");
    await page.goto("/");
    await page.goto("/docs/phase-2/svelte");
    await expect(page.getByTestId("adapter-status")).toHaveText("ready");
    await expect(page.getByTestId("adapter-score")).toHaveText("0");
  });
});
