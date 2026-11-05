import { expect, test } from "@playwright/test";

declare global {
  var __scene_ui_readback: Uint8Array | undefined;
  var __scene_ui_late_mount_rejected: boolean | undefined;
  var __pending_scene_ui: { mount: () => Promise<void> } | undefined;
  var __release_scene_ui_switch: (() => void) | undefined;
}

test("[scene-ui] Game owns scene UI through onReady", async ({ page }) => {
  await page.goto("/scene-ui");
  const gpu_environment = await page.evaluate(async () => {
    const adapter = await navigator.gpu.requestAdapter();
    const device = adapter === null ? null : await adapter.requestDevice();
    const adapter_info = adapter === null ? null : "info" in adapter ? adapter.info : null;
    if (device !== null) device.destroy();
    return {
      secure_context: window.isSecureContext,
      has_gpu: "gpu" in navigator,
      has_adapter: adapter !== null,
      has_device: device !== null,
      adapter_info,
      dpr: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
  test.info().annotations.push({
    type: "webgpu-environment",
    description: JSON.stringify({ browser: page.context().browser()?.version(), os: process.platform, ...gpu_environment }),
  });
  expect(gpu_environment.secure_context).toBe(true);
  expect(gpu_environment.has_gpu).toBe(true);
  expect(gpu_environment.has_adapter).toBe(true);
  expect(gpu_environment.has_device).toBe(true);
  await expect(page.getByTestId("scene-ui-error")).toContainText("GameRuntimeError");
  await expect(page.getByText("failed scene UI")).toHaveCount(0);
  await expect(page.getByText("pending scene")).toHaveCount(0);
  const labels = page.getByTestId("scene-ui-label");
  await expect(labels).toHaveText(["first scene", "secondary", "second host", "secondary", "teardown scene"]);
  await page.getByTestId("scene-ui-update").first().click();
  await expect(labels).toHaveText(["updated scene", "secondary", "second host", "secondary", "teardown scene"]);
  await page.getByTestId("scene-ui-advance").first().click();
  await expect(labels).toHaveText(["switching", "secondary", "second host", "secondary", "teardown scene"]);
  await page.evaluate(() => globalThis.__release_scene_ui_switch?.());
  await expect(labels).toHaveText(["second scene", "second host", "secondary", "teardown scene"]);
  await expect(page.getByTestId("scene-ui-panel")).toHaveCount(4);
  await expect.poll(async () => page.evaluate(() => globalThis.__scene_ui_late_mount_rejected)).toBe(true);
  await page.getByTestId("remove-scene-ui-game").click();
  await expect(labels).toHaveText(["second scene", "second host", "secondary"]);
  await page.getByTestId("remove-pending-scene-ui-game").click();
  await expect.poll(async () => page.evaluate(() => globalThis.__pending_scene_ui !== undefined)).toBe(true);
  const pending_mount_rejected = await page.evaluate(async () => {
    try {
      await globalThis.__pending_scene_ui?.mount();
      return false;
    } catch {
      return true;
    }
  });
  expect(pending_mount_rejected).toBe(true);
  await expect.poll(async () => page.evaluate(() => globalThis.__scene_ui_readback?.length ?? 0)).toBeGreaterThan(0);
  const readback = await page.evaluate(() => Array.from(globalThis.__scene_ui_readback ?? []).slice(0, 4));
  expect(readback.some((channel) => channel !== 0)).toBe(true);
});

test("[scene-ui] public example composes removable stack layers", async ({ page }) => {
  await page.goto("/docs/examples/scene-ui");
  await expect(page.getByRole("region", { name: "HUD scene" })).toBeVisible();

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("region", { name: "Pause scene" })).toBeVisible();
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("region", { name: "Pause scene" })).toHaveCount(0);

  await page.getByRole("button", { name: "Dialogue" }).click();
  await expect(page.getByRole("region", { name: "Dialogue scene" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialogue" }).click();
  await expect(page.getByRole("region", { name: "Dialogue scene" })).toHaveCount(0);
});
