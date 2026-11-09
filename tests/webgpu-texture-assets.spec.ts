import { expect, test } from "@playwright/test";

test("loads the bundled texture through the asset cache and renders its pixels", async ({ page }) => {
  await page.goto("/docs/examples/textures");

  const environment = await page.evaluate(async () => {
    const adapter = "gpu" in navigator ? await navigator.gpu.requestAdapter() : null;
    const device = adapter === null ? null : await adapter.requestDevice();
    device?.destroy();
    return { secure: window.isSecureContext, gpu: "gpu" in navigator, adapter: adapter !== null, device: device !== null };
  });
  expect(environment).toEqual({ secure: true, gpu: true, adapter: true, device: true });

  await expect(page.getByTestId("texture-status")).toHaveText("ready");
  await expect(page.getByTestId("texture-dimensions")).toHaveText("32 × 32");
  await expect(page.getByTestId("texture-background")).toHaveText("0,170,170,255");
  await expect(page.getByTestId("texture-sample")).toHaveText("217,87,99,255");

  const initial_rotation = await page.getByTestId("texture-rotation").textContent();
  await page.waitForTimeout(250);
  const later_rotation = await page.getByTestId("texture-rotation").textContent();
  expect(later_rotation).not.toBe(initial_rotation);
});
