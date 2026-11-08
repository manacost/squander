import { expect, test } from "@playwright/test";

test("ECS Arena runs a real WebGPU loop and exposes ECS-backed state", async ({ page }) => {
  test.setTimeout(20_000);

  await page.goto("/scenes/ecs-arena");

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
      fixture: { logical_width: 800, logical_height: 500 },
    };
  });
  console.log(`[ecs-arena-webgpu] ${JSON.stringify(environment)}`);
  expect(environment.secure_context).toBe(true);
  expect(environment.navigator_gpu).toBe(true);
  expect(environment.adapter).toBe(true);
  expect(environment.device).toBe(true);

  await expect(page.getByRole("heading", { level: 1, name: "ECS Arena" })).toBeVisible();
  await expect(page.getByTestId("ecs-arena-status")).toHaveText("playing");
  await expect(page.getByTestId("ecs-arena-entities")).toHaveText("3");
  await expect(page.locator("canvas")).toHaveAttribute("data-ecs-render-ready", "true");

  const canvas_probe = await page.evaluate(async () => {
    const canvas = document.querySelector("canvas");
    if (canvas === null) return { non_background: 0, width: 0, height: 0 };
    const blob = await (await fetch(canvas.toDataURL())).blob();
    const bitmap = await createImageBitmap(blob);
    const probe = document.createElement("canvas");
    probe.width = bitmap.width;
    probe.height = bitmap.height;
    const context = probe.getContext("2d");
    if (context === null) return { non_background: 0, width: bitmap.width, height: bitmap.height };
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let non_background = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] !== 6 || pixels[index + 1] !== 9 || pixels[index + 2] !== 19) non_background += 1;
    }
    return { non_background, width: bitmap.width, height: bitmap.height };
  });
  expect(canvas_probe.width).toBeGreaterThan(0);
  expect(canvas_probe.height).toBeGreaterThan(0);
  expect(canvas_probe.non_background).toBeGreaterThan(100);

  await page.locator("canvas").focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("ecs-arena-event")).toHaveText("Projectile spawned");
  await expect(page.getByTestId("ecs-arena-projectiles")).toHaveText("1");
  await expect.poll(async () => Number(await page.getByTestId("ecs-arena-score").textContent())).toBeGreaterThan(0);

  await page.getByTestId("ecs-arena-pause").click();
  await expect(page.getByTestId("ecs-arena-status")).toHaveText("paused");
  await page.getByTestId("ecs-arena-pause").click();
  await expect(page.getByTestId("ecs-arena-status")).toHaveText("playing");

  await page.keyboard.press("KeyR");
  await expect(page.getByTestId("ecs-arena-score")).toHaveText("0");
  await expect(page.getByTestId("ecs-arena-entities")).toHaveText("3");
});
