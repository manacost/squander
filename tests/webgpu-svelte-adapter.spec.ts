import { expect, test } from "@playwright/test";

test.describe("[svelte-bridge] GameHost", () => {
  test("mounts, publishes state, runs typed commands, and disposes on navigation", async ({ page }) => {
    await page.goto("/docs/examples/svelte");
    await expect(page.getByRole("heading", { level: 1, name: "Svelte 5 UI bridge" })).toBeVisible();
    await expect(page.getByText("Game code", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Public types" })).toBeVisible();
    await expect(page.getByText("create_game_adapter", { exact: false })).toBeVisible();
    await expect(page.getByTestId("adapter-status")).toHaveText("ready");
    await expect(page.getByTestId("adapter-score")).toHaveText("0");
    await page.getByTestId("adapter-increment").click();
    await expect(page.getByTestId("adapter-score")).toHaveText("2");
    await page.goto("/");
    await page.goto("/docs/examples/svelte");
    await expect(page.getByTestId("adapter-status")).toHaveText("ready");
    await expect(page.getByTestId("adapter-score")).toHaveText("0");
  });
});
