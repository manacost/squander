import { expect, test } from "@playwright/test";

declare global {
  var __scene_evidence:
    { asset_loads: number; asset_destroys: number; events: number; base_events: number; overlay_events: number } | undefined;
  var __remove_scene_overlay: (() => Promise<void>) | undefined;
  var __emit_scene_pulse: (() => void) | undefined;
}

test("[scene-signals] stops receiving scene events after a scene leaves", async ({ page }) => {
  await page.goto("/docs/examples/scenes");
  await expect(page.getByTestId("scene-status")).toHaveText("ready");
  await expect.poll(async () => page.evaluate(() => globalThis.__scene_evidence?.overlay_events ?? 0)).toBeGreaterThan(0);
  await page.evaluate(async () => globalThis.__remove_scene_overlay?.());
  const before_external_pulse = await page.evaluate(() => ({ ...globalThis.__scene_evidence }));
  await page.evaluate(() => globalThis.__emit_scene_pulse?.());
  const after_removal = await page.evaluate(() => ({ ...globalThis.__scene_evidence }));
  expect(after_removal.overlay_events).toBe(before_external_pulse.overlay_events);
  expect(after_removal.base_events).toBe((before_external_pulse.base_events ?? 0) + 1);
});
