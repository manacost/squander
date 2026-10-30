import { expect, test } from "@playwright/test";

test("[scene-lifecycle] mounts and renders an ordered scene stack", async ({ page }) => {
  await page.goto("/docs/examples/scenes");
  const gpu_environment = await page.evaluate(async () => {
    const adapter = await navigator.gpu.requestAdapter();
    const device = adapter === null ? null : await adapter.requestDevice();
    if (device !== null) device.destroy();
    return {
      secure_context: window.isSecureContext,
      has_gpu: "gpu" in navigator,
      has_adapter: adapter !== null,
      has_device: device !== null,
      dpr: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  });
  expect(gpu_environment.secure_context).toBe(true);
  expect(gpu_environment.has_gpu).toBe(true);
  expect(gpu_environment.has_adapter).toBe(true);
  expect(gpu_environment.has_device).toBe(true);

  await expect(page.getByTestId("scene-status")).toHaveText("ready");
  await expect.poll(async () => Number(await page.getByTestId("scene-base-ticks").textContent())).toBeGreaterThan(0);
  await expect.poll(async () => Number(await page.getByTestId("scene-overlay-ticks").textContent())).toBeGreaterThan(0);

  const canvas_probe = await page.evaluate(async () => {
    const canvas = document.querySelector("canvas");
    if (canvas === null) return { non_black: 0 };
    const blob = await (await fetch(canvas.toDataURL())).blob();
    const bitmap = await createImageBitmap(blob);
    const probe = document.createElement("canvas");
    probe.width = bitmap.width;
    probe.height = bitmap.height;
    const context = probe.getContext("2d");
    if (context === null) return { non_black: 0 };
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let non_black = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] !== 0 || pixels[index + 1] !== 0 || pixels[index + 2] !== 0) non_black += 1;
    }
    return { non_black };
  });
  expect(canvas_probe.non_black).toBeGreaterThan(0);
});
