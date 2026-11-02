import { expect, test } from "@playwright/test";

declare global {
  var __scene_evidence:
    { asset_loads: number; asset_destroys: number; events: number; base_events: number; overlay_events: number } | undefined;
  var __scene_readback: Uint8Array | undefined;
  var __remove_scene_overlay: (() => Promise<void>) | undefined;
  var __dispose_scene_demo: (() => Promise<void>) | undefined;
}

test("[scene-assets] shares a scene dependency and destroys it after game disposal", async ({ page }) => {
  await page.goto("/docs/examples/scenes");
  await expect(page.getByTestId("scene-status")).toHaveText("ready");
  await expect.poll(async () => page.evaluate(() => globalThis.__scene_evidence?.asset_loads ?? 0)).toBe(1);
  await page.evaluate(async () => globalThis.__remove_scene_overlay?.());
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const pixels = globalThis.__scene_readback;
        if (pixels === undefined) return false;
        return pixels[0] === 255 && pixels[1] === 0 && pixels[2] === 255 && pixels[3] === 255;
      }),
    )
    .toBe(true);
  await page.evaluate(async () => globalThis.__dispose_scene_demo?.());
  await expect.poll(async () => page.evaluate(() => globalThis.__scene_evidence?.asset_destroys ?? 0)).toBe(1);
});
