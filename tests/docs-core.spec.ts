import { expect, test } from "@playwright/test";

test("core documentation is present in the sidebar and links to focused guides", async ({ page }) => {
  await page.goto("/docs/core");
  await expect(page.getByRole("link", { name: "core" })).toHaveAttribute("href", "/docs/core");
  await expect(page.getByRole("link", { name: "demos" })).toHaveAttribute("href", "/docs/examples/playground");
  const text_link = page.locator('a.nested[href="/docs/examples/text"]');
  await expect(text_link).toHaveAttribute("href", "/docs/examples/text");
  await expect(page.getByRole("heading", { level: 1, name: "Core" })).toBeVisible();
  await text_link.click();
  await expect(page).toHaveURL(/\/docs\/examples\/text$/);
  await expect(page.getByRole("heading", { level: 1, name: "Text drawing" })).toBeVisible();
});

test("the removed examples landing page is no longer published", async ({ request }) => {
  const response = await request.get("/docs/examples");
  expect(response.status()).toBe(404);
});

test("Core exposes a focused guide for every remaining runtime area", async ({ page }) => {
  await page.goto("/docs/core");
  const slugs = [
    "asset-loading",
    "dynamic-assets",
    "sprite-drawing",
    "shape-drawing",
    "paths-and-polygons",
    "camera-2d",
    "viewport-sizing",
    "texture-filtering",
    "game-lifecycle",
    "game-timing",
    "webgpu-runtime",
    "resource-ownership",
    "svelte-bridge",
  ];
  for (const slug of slugs) {
    await expect(page.locator(`a.nested[href="/docs/core/${slug}"]`)).toBeVisible();
  }

  await page.goto("/docs/core/camera-2d");
  await expect(page.getByRole("heading", { level: 1, name: "2D cameras" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Public types" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Usage" })).toBeVisible();
  await expect(page.locator("a.button")).toBeVisible();
});
