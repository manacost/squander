import { expect, test } from "@playwright/test";

test("home page presents the project and primary navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "squander" })).toBeVisible();
  await expect(page.getByRole("link", { name: "core" })).toBeVisible();
  await expect(page.getByRole("link", { name: "npm" })).toBeVisible();
  await expect(page.getByRole("link", { name: "github" })).toHaveAttribute("href", "https://github.com/ancient-cat/squander");
});

test("documentation navigation opens the Core API guides", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "core" }).click();

  await expect(page).toHaveURL(/\/docs\/core$/);
  await expect(page.getByRole("heading", { level: 1, name: "Core" })).toBeVisible();
  await expect(page.locator('a.nested[href="/docs/examples/text"]')).toBeVisible();
});
