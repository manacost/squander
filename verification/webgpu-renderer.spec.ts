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

test("[sprite-drawing] combines horizontal and vertical flips within the same bounds", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 2, height: 2 });
    const texture = renderer.create_texture(new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]), 2, 2);
    const pixels = await renderer.draw_texture(texture, { width: 2, height: 2, flip_x: true, flip_y: true });
    texture.release();
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { top_left: pixel_at(0, 0), top_right: pixel_at(1, 0), bottom_left: pixel_at(0, 1), bottom_right: pixel_at(1, 1) };
  });

  expect(result).toEqual({
    top_left: [255, 255, 255, 255],
    top_right: [0, 0, 255, 255],
    bottom_left: [0, 255, 0, 255],
    bottom_right: [255, 0, 0, 255],
  });
});

test("[shape-drawing] preserves source-over order between a sprite and a rectangle", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 1, height: 1 });
    const red = renderer.create_texture(new Uint8Array([255, 0, 0, 255]), 1, 1);
    const pixels = await renderer.draw_commands([
      { kind: "texture", draw: { texture: red, options: { opacity: 0.5 } } },
      {
        kind: "rectangle",
        draw: { rectangle: { x: 0, y: 0, width: 1, height: 1 }, color: colors.rgba(0, 1, 0, 1), opacity: 0.5 },
      },
    ]);
    red.release();
    renderer.dispose();
    return Array.from(pixels.slice(0, 4));
  });

  expect(result).toEqual([64, 128, 0, 255]);
});

test("[shape-drawing] renders a filled circle from center and radius", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 5, height: 5 });
    const pixels = await renderer.draw_commands([
      { kind: "circle", draw: { circle: { x: 2.5, y: 2.5, radius: 2.5 }, color: colors.rgba(0, 1, 0, 1) } },
    ]);
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { center: pixel_at(2, 2), corner: pixel_at(0, 0) };
  });

  expect(result.center).toEqual([0, 255, 0, 255]);
  expect(result.corner).toEqual([0, 0, 0, 255]);
});

test("[shape-drawing] renders a centered flat-ended line from explicit endpoints", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 5, height: 5 });
    const pixels = await renderer.draw_commands([
      {
        kind: "line",
        draw: { line: { from: { x: 0.5, y: 2.5 }, to: { x: 4.5, y: 2.5 } }, color: colors.rgba(1, 0, 0, 1), stroke_width: 1 },
      },
    ]);
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { center: pixel_at(2, 2), outside: pixel_at(2, 0) };
  });

  expect(result.center).toEqual([255, 0, 0, 255]);
  expect(result.outside).toEqual([0, 0, 0, 255]);
});

test("[shape-drawing] keeps the interior transparent for a centered rectangle outline", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 5, height: 5 });
    const pixels = await renderer.draw_commands([
      {
        kind: "rectangle_outline",
        draw: { rectangle: { x: 0, y: 0, width: 5, height: 5 }, color: colors.rgba(1, 0, 0, 1), stroke_width: 1 },
      },
    ]);
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { edge: pixel_at(0, 2), interior: pixel_at(2, 2) };
  });

  expect(result.edge).toEqual([255, 0, 0, 255]);
  expect(result.interior).toEqual([0, 0, 0, 255]);
});

test("[shape-drawing] keeps the interior transparent for a centered circle outline", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 7, height: 7 });
    const pixels = await renderer.draw_commands([
      {
        kind: "circle_outline",
        draw: { circle: { x: 3.5, y: 3.5, radius: 3.5 }, color: colors.rgba(0, 1, 0, 1), stroke_width: 1 },
      },
    ]);
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { edge: pixel_at(3, 0), interior: pixel_at(3, 3) };
  });

  expect(result.edge).toEqual([0, 255, 0, 255]);
  expect(result.interior).toEqual([0, 0, 0, 255]);
});

test("[shape-drawing] centers wider strokes and ignores degenerate strokes", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 5, height: 5 });
    const pixels = await renderer.draw_commands([
      {
        kind: "line",
        draw: { line: { from: { x: 0.5, y: 2.5 }, to: { x: 4.5, y: 2.5 } }, color: colors.rgba(1, 0, 0, 1), stroke_width: 2 },
      },
      {
        kind: "line",
        draw: { line: { from: { x: 1, y: 1 }, to: { x: 1, y: 1 } }, color: colors.rgba(0, 1, 0, 1), stroke_width: 1 },
      },
      {
        kind: "line",
        draw: { line: { from: { x: 1, y: 1 }, to: { x: 4, y: 1 } }, color: colors.rgba(0, 1, 0, 1), stroke_width: 0 },
      },
    ]);
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { upper: pixel_at(2, 1), lower: pixel_at(2, 2), outside: pixel_at(2, 0) };
  });

  expect(result.upper).toEqual([255, 0, 0, 255]);
  expect(result.lower).toEqual([255, 0, 0, 255]);
  expect(result.outside).toEqual([0, 0, 0, 255]);
});

test("[texture-filtering] keeps nearest and linear sampling independent", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 4, height: 1 });
    const nearest = renderer.create_texture(new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255]), 2, 1, { filter: "nearest" });
    const linear = renderer.create_texture(new Uint8Array([255, 0, 0, 255, 0, 0, 255, 255]), 2, 1, { filter: "linear" });
    const pixels = await renderer.draw_textures([
      { texture: nearest, options: { x: 0, y: 0, width: 2, height: 1 } },
      { texture: linear, options: { x: 1, y: 0, width: 3, height: 1 } },
    ]);
    nearest.release();
    linear.release();
    renderer.dispose();
    const pixel_at = (x: number): number[] => Array.from(pixels.slice(x * 4, x * 4 + 4));
    return { nearest: pixel_at(0), linear: pixel_at(2) };
  });

  expect(result.nearest).toEqual([255, 0, 0, 255]);
  expect(result.linear[0]).toBeGreaterThan(0);
  expect(result.linear[2]).toBeGreaterThan(0);
  expect(result.linear[0]).toBeLessThan(255);
});
