import { expect, test } from "@playwright/test";

test("[webgpu-runtime] clears and reads back a real canvas texture", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 1, height: 1 });
    const pixels = await renderer.clear({ red: 64 / 255, green: 128 / 255, blue: 191 / 255, alpha: 1 });
    renderer.dispose();
    return {
      secure: window.isSecureContext,
      gpu: "gpu" in navigator,
      pixels: Array.from(pixels.slice(0, 4)),
    };
  });

  expect(result.secure).toBe(true);
  expect(result.gpu).toBe(true);
  expect(result.pixels).toEqual([64, 128, 191, 255]);
});
