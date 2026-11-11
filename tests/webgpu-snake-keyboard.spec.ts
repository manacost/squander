import { expect, test } from "@playwright/test";

test("Snake keeps keyboard controls in the game after starting from the menu", async ({ page }) => {
  await page.goto("/docs/examples/snake");
  await expect(page.getByTestId("snake-status")).toHaveText("start");
  await expect(page.locator("canvas")).toHaveAttribute("data-snake-input-ready", "true");

  await page.getByTestId("snake-start").click();
  await expect(page.getByTestId("snake-status")).toHaveText("playing");
  await expect(page.locator("canvas")).toBeFocused();

  const scroll_before_direction = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("ArrowDown");

  await expect(page.getByTestId("snake-direction")).toHaveText("down");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scroll_before_direction);
});
