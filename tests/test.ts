import { expect, test } from "@playwright/test";

test("home page presents the project and primary navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "squander" })).toBeVisible();
  await expect(page.getByRole("link", { name: "phase-2" })).toBeVisible();
  await expect(page.getByRole("link", { name: "npm" })).toBeVisible();
  await expect(page.getByRole("link", { name: "github" })).toHaveAttribute("href", "https://github.com/ancient-cat/squander");
});

test("documentation navigation loads the Phase 2 library", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "phase-2" }).click();

  await expect(page).toHaveURL(/\/docs\/phase-2$/);
  await expect(page.getByRole("heading", { level: 1, name: "Phase 2" })).toBeVisible();
  await expect(page.getByRole("link", { name: "playground" })).toBeVisible();
});
