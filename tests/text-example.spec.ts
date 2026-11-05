import { expect, test } from "@playwright/test";

test("text example documentation exposes the bundled-font guide", async ({ page }) => {
  await page.goto("/docs/examples/text");
  await expect(page.getByRole("heading", { level: 1, name: "Text drawing" })).toBeVisible();
  await expect(page.getByText("A bundled font loaded through SvelteKit's base-aware asset helper.")).toBeVisible();
  await expect(page.getByText("const font_handle = await assets.load_font(", { exact: false })).toBeVisible();
  await expect(page.getByText("renderer.draw_commands(", { exact: false })).toBeVisible();
});
