import { expect, test } from "@playwright/test";

test("core documentation is present in the sidebar and links to focused guides", async ({ page }) => {
  await page.goto("/docs/core");
  await expect(page.getByRole("link", { name: "v8.0.0" })).toBeVisible();
  await expect(page.getByRole("link", { name: "core" })).toHaveAttribute("href", "/docs/core");
  await expect(page.getByRole("link", { name: "demos" })).toHaveAttribute("href", "/docs/examples/playground");
  const text_link = page.locator('a.nested[href="/docs/examples/text"]');
  await expect(text_link).toHaveAttribute("href", "/docs/examples/text");
  const input_link = page.locator('a.nested[href="/docs/examples/input"]');
  await expect(input_link).toHaveAttribute("href", "/docs/examples/input");
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
  await expect(page.getByRole("heading", { level: 2, name: "Minimum viable example" })).toBeVisible();
  await expect(page.getByText("live rendering")).toBeVisible();
  await expect(page.getByTestId("core-example-status-camera-2d")).toBeVisible();
  await expect(page.locator("pre code span.token").first()).toBeVisible();

  for (const slug of slugs) {
    await page.goto(`/docs/core/${slug}`);
    if (slug === "svelte-bridge") {
      await expect(page.getByRole("link", { name: "Open the focused Svelte bridge example →" })).toBeVisible();
    } else {
      await expect(page.getByTestId(`core-example-status-${slug}`)).toBeVisible();
    }
  }
});

test("Svelte bridge samples render source syntax instead of HTML entities", async ({ page }) => {
  await page.goto("/docs/examples/svelte");
  const host_sample = page.locator("pre code").first();
  await expect(host_sample).toContainText("Readonly<{ score: number }>");
  await expect(host_sample).toContainText("<GameHost initial_state={{ score: 0 }}");
  await expect(host_sample).toContainText("=>");
  await expect(host_sample).not.toContainText("&lt;");
  await expect(host_sample).not.toContainText("=&gt;");
});

test("scene UI documentation explains stacked use cases with copyable samples", async ({ page }) => {
  await page.goto("/docs/examples/scene-ui");
  await expect(page.getByRole("heading", { level: 1, name: "Scene-owned UI" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "What this example shows" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Mount a persistent layer" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Add and remove temporary layers" })).toBeVisible();
  await expect(page.locator("pre code").filter({ hasText: "await scenes.mount(hud" }).first()).toContainText("index: 1");
  await expect(page.locator("pre code").filter({ hasText: "pause_handle" }).first()).toContainText("scenes.remove");
});
