import { expect, test } from "@playwright/test";

test("Snake runs a real WebGPU game loop with accessible state controls", async ({ page }) => {
  test.setTimeout(20_000);

  await page.goto("/docs/examples/snake");

  const environment = await page.evaluate(async () => {
    const has_gpu = "gpu" in navigator;
    const adapter = has_gpu ? await navigator.gpu.requestAdapter() : null;
    const device = adapter === null ? null : await adapter.requestDevice();
    const info = adapter?.info;
    return {
      secure_context: window.isSecureContext,
      navigator_gpu: has_gpu,
      adapter: adapter !== null,
      device: device !== null,
      browser: navigator.userAgent,
      dpr: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      adapter_info:
        info === undefined
          ? undefined
          : { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description },
      fixture: { logical_width: 750, logical_height: 750, grid_width: 50, grid_height: 50 },
    };
  });
  console.log(`[snake-webgpu] ${JSON.stringify(environment)}`);
  expect(environment.secure_context).toBe(true);
  expect(environment.navigator_gpu).toBe(true);
  expect(environment.adapter).toBe(true);
  expect(environment.device).toBe(true);

  await expect(page.getByRole("heading", { level: 1, name: "Snake" })).toBeVisible();
  await expect(page.getByTestId("snake-status")).toHaveText("start");
  await expect(page.getByTestId("snake-start-menu")).toBeVisible();
  await expect(page.getByTestId("snake-touch-up")).toBeDisabled();

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const readback = (globalThis as { __snake_readback?: Uint8Array }).__snake_readback;
        return readback?.length ?? 0;
      }),
    )
    .toBeGreaterThan(0);

  const canvas_readback = await page.evaluate(() => {
    const readback = (globalThis as { __snake_readback?: Uint8Array }).__snake_readback;
    if (readback === undefined) return { non_background_samples: 0, length: 0 };
    const width = 750;
    const height = 750;
    const bytes_per_row = Math.ceil((width * 4) / 256) * 256;
    let non_background_samples = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = y * bytes_per_row + x * 4;
        if (readback[offset] !== 5 || readback[offset + 1] !== 7 || readback[offset + 2] !== 13) non_background_samples += 1;
      }
    }
    return { non_background_samples, length: readback.length };
  });
  expect(canvas_readback.length).toBeGreaterThan(0);
  expect(canvas_readback.non_background_samples).toBeGreaterThan(100);

  await page.getByTestId("snake-start").click();
  await expect(page.getByTestId("snake-status")).toHaveText("playing");
  await expect(page.getByTestId("snake-touch-up")).toBeEnabled();

  await page.locator("canvas").focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByTestId("snake-direction")).toHaveText("up");
  await page.getByTestId("snake-touch-left").click();
  await expect(page.getByTestId("snake-direction")).toHaveText("left");

  await page.getByTestId("snake-pause").click();
  await expect(page.getByTestId("snake-status")).toHaveText("paused");
  await expect(page.getByTestId("snake-pause-menu")).toBeVisible();
  await page.getByTestId("snake-resume").click();
  await expect(page.getByTestId("snake-status")).toHaveText("playing");

  await expect(page.getByTestId("snake-game-over-menu")).toBeVisible({ timeout: 8_000 });
  await expect(page.getByTestId("snake-status")).toHaveText("game-over");
  await page.getByTestId("snake-restart").click();
  await expect(page.getByTestId("snake-status")).toHaveText("playing");
});
