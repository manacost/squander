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

test("[sprite-drawing] uploads and draws a persistent texture", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 1, height: 1 });
    const texture = renderer.create_texture(new Uint8Array([12, 34, 56, 255]), 1, 1);
    const pixels = await renderer.draw_texture(texture);
    texture.release();
    renderer.dispose();
    return Array.from(pixels.slice(0, 4));
  });

  expect(result).toEqual([12, 34, 56, 255]);
});

test("[sprite-drawing] samples an atlas region with tint and opacity", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 1, height: 1 });
    const texture = renderer.create_texture(new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255]), 2, 1);
    const pixels = await renderer.draw_texture(texture, {
      region: { x: 1, y: 0, width: 1, height: 1 },
      tint: { red: 0.5, green: 1, blue: 1, alpha: 1 },
      opacity: 0.5,
    });
    texture.release();
    renderer.dispose();
    return Array.from(pixels.slice(0, 4));
  });

  expect(result).toEqual([0, 0, 128, 255]);
});

test("[sprite-drawing] composites translucent sprites in submission order", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 1, height: 1 });
    const red = renderer.create_texture(new Uint8Array([255, 0, 0, 255]), 1, 1);
    const blue = renderer.create_texture(new Uint8Array([0, 0, 255, 255]), 1, 1);
    const pixels = await renderer.draw_textures([
      { texture: red, options: { opacity: 0.5 } },
      { texture: blue, options: { opacity: 0.5 } },
    ]);
    red.release();
    blue.release();
    renderer.dispose();
    return Array.from(pixels.slice(0, 4));
  });

  expect(result).toEqual([64, 0, 128, 255]);
});

test("[sprite-drawing] places, flips, and rotates a sprite around a normalized origin", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 4, height: 4 });
    const texture = renderer.create_texture(new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255]), 2, 1);
    const pixels = await renderer.draw_texture(texture, {
      x: 2,
      y: 2,
      width: 2,
      height: 1,
      origin: { x: 0.5, y: 0.5 },
      rotation: Math.PI * 2,
      flip_x: true,
    });
    texture.release();
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { left: pixel_at(1, 1), right: pixel_at(2, 1), outside: pixel_at(0, 0) };
  });

  expect(result.left).toEqual([0, 0, 255, 255]);
  expect(result.right).toEqual([255, 0, 0, 255]);
  expect(result.outside).toEqual([0, 0, 0, 255]);
});

test("[sprite-drawing] preserves submission order for multiple sprites", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 2, height: 2 });
    const red = renderer.create_texture(new Uint8Array([255, 0, 0, 255]), 1, 1);
    const blue = renderer.create_texture(new Uint8Array([0, 0, 255, 255]), 1, 1);
    const pixels = await renderer.draw_textures([
      { texture: red, options: { x: 0, y: 0, width: 2, height: 2 } },
      { texture: blue, options: { x: 1, y: 1, width: 1, height: 1 } },
    ]);
    red.release();
    blue.release();
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { covered: pixel_at(1, 1), preserved: pixel_at(0, 0) };
  });

  expect(result.covered).toEqual([0, 0, 255, 255]);
  expect(result.preserved).toEqual([255, 0, 0, 255]);
});
