import { expect, test } from "@playwright/test";
import package_json from "../package.json" with { type: "json" };

const repository_url = package_json.repository.url.replace(/^git\+/, "").replace(/\.git$/, "");

test("home page presents the project and primary navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "squander", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "core" })).toBeVisible();
  await expect(page.getByRole("link", { name: "npm" })).toBeVisible();
  await expect(page.getByRole("link", { name: "github" })).toHaveAttribute("href", repository_url);
});

test("documentation navigation opens the Core API guides", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "core" }).click();

  await expect(page).toHaveURL(/\/docs\/core$/);
  await expect(page.getByRole("heading", { level: 1, name: "Core" })).toBeVisible();
  await page.getByRole("button", { name: "Toggle core section" }).click();
  await expect(page.locator('a.nested[href="/docs/examples/text"]')).toBeVisible();
  await expect(page.locator('a.nested[href="/docs/examples/textures"]')).toBeVisible();
});
