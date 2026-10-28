import { expect, test } from "@playwright/test";
import type { ResourceHandle } from "../src/lib/core/runtime/resource_ownership.js";
import type { WebGpuTexture } from "../src/lib/core/runtime/webgpu_renderer.js";

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

test("[dynamic-assets] prepares a canvas image source and uploads its pixels", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const source = document.createElement("canvas");
    source.width = 1;
    source.height = 1;
    const source_context = source.getContext("2d");
    if (source_context === null) throw new Error("Canvas 2D preparation is unavailable");
    source_context.fillStyle = "red";
    source_context.fillRect(0, 0, 1, 1);
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 1, height: 1 });
    const texture = renderer.create_texture_from_image(source, 1, 1);
    const pixels = await renderer.draw_texture(texture);
    texture.release();
    renderer.dispose();
    return Array.from(pixels.slice(0, 4));
  });

  expect(result).toEqual([255, 0, 0, 255]);
});

test("[dynamic-assets] decodes Blob and File sources and uploads their pixels", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const source = document.createElement("canvas");
    source.width = 1;
    source.height = 1;
    const source_context = source.getContext("2d");
    if (source_context === null) throw new Error("Canvas 2D is unavailable");
    source_context.fillStyle = "rgb(255 0 0)";
    source_context.fillRect(0, 0, 1, 1);
    const blob = await new Promise<Blob>((resolve, reject) => {
      source.toBlob((value) => (value === null ? reject(new Error("could not encode image")) : resolve(value)), "image/png");
    });
    const file = new File([blob], "pixel.png", { type: "image/png" });
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const renderer = await module.create_webgpu_renderer({ canvas, width: 1, height: 1 });
    const blob_texture = await renderer.create_texture_from_blob(blob);
    const file_texture = await renderer.create_texture_from_blob(file);
    const blob_pixels = await renderer.draw_texture(blob_texture);
    const file_pixels = await renderer.draw_texture(file_texture);
    blob_texture.release();
    file_texture.release();
    renderer.dispose();
    return { blob: Array.from(blob_pixels.slice(0, 4)), file: Array.from(file_pixels.slice(0, 4)) };
  });

  expect(result.blob).toEqual([255, 0, 0, 255]);
  expect(result.file).toEqual([255, 0, 0, 255]);
});

test("[dynamic-assets] loads Blob and File textures through a game-owned renderer", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const source = document.createElement("canvas");
    source.width = 1;
    source.height = 1;
    const source_context = source.getContext("2d");
    if (source_context === null) throw new Error("Canvas 2D is unavailable");
    source_context.fillStyle = "rgb(255 0 0)";
    source_context.fillRect(0, 0, 1, 1);
    const blob = await new Promise<Blob>((resolve, reject) => {
      source.toBlob((value) => (value === null ? reject(new Error("could not encode image")) : resolve(value)), "image/png");
    });
    const file = new File([blob], "pixel.png", { type: "image/png" });
    const game_url = new URL("/src/lib/core/runtime/game.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ game_url)) as typeof import("../src/lib/core/runtime/game.js");
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    let textures: [ResourceHandle<WebGpuTexture>, ResourceHandle<WebGpuTexture>] | undefined;
    const game = module.create_game({
      renderer: { canvas, width: 1, height: 1 },
      scheduler: {
        request_frame: () => 0,
        cancel_frame: () => undefined,
        now_seconds: () => 0,
      },
      setup: async ({ assets }) => {
        const blob_texture = await assets.load_texture(blob);
        const file_texture = await assets.load_texture(file);
        textures = [blob_texture, file_texture];
      },
      update: () => undefined,
      draw: () => undefined,
    });
    await game.ready;
    if (textures === undefined) throw new Error("game setup did not load textures");
    const blob_pixels = await game.renderer.draw_texture(textures[0].read());
    const file_pixels = await game.renderer.draw_texture(textures[1].read());
    textures[0].release();
    textures[1].release();
    await game.dispose();
    return { blob: Array.from(blob_pixels.slice(0, 4)), file: Array.from(file_pixels.slice(0, 4)) };
  });

  expect(result.blob).toEqual([255, 0, 0, 255]);
  expect(result.file).toEqual([255, 0, 0, 255]);
});

test("[dynamic-assets] rejects malformed input while allowing a valid retry", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const source = document.createElement("canvas");
    source.width = 1;
    source.height = 1;
    const source_context = source.getContext("2d");
    if (source_context === null) throw new Error("Canvas 2D is unavailable");
    source_context.fillStyle = "rgb(0 255 0)";
    source_context.fillRect(0, 0, 1, 1);
    const valid_blob = await new Promise<Blob>((resolve, reject) => {
      source.toBlob((value) => (value === null ? reject(new Error("could not encode image")) : resolve(value)), "image/png");
    });
    const game_url = new URL("/src/lib/core/runtime/game.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ game_url)) as typeof import("../src/lib/core/runtime/game.js");
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const game = module.create_game({
      renderer: { canvas, width: 1, height: 1 },
      scheduler: {
        request_frame: () => 0,
        cancel_frame: () => undefined,
        now_seconds: () => 0,
      },
      update: () => undefined,
      draw: () => undefined,
    });
    await game.ready;
    let error_name = "";
    try {
      await game.assets.load_texture(new Blob(["not an image"], { type: "image/png" }));
    } catch (error) {
      error_name = error instanceof Error ? error.name : "unknown";
    }
    const texture = await game.assets.load_texture(valid_blob);
    const pixels = await game.renderer.draw_texture(texture.read());
    texture.release();
    const state = game.get_state();
    await game.dispose();
    return { error_name, pixels: Array.from(pixels.slice(0, 4)), state };
  });

  expect(result.error_name).toBe("ImageDecodeError");
  expect(result.pixels).toEqual([0, 255, 0, 255]);
  expect(result.state).toBe("running");
});

test("[viewport-sizing] exposes and updates the game-owned viewport", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const game_url = new URL("/src/lib/core/runtime/game.ts", location.origin).href;
    const viewport_url = new URL("/src/lib/core/runtime/viewport_sizing.ts", location.origin).href;
    const game_module = (await import(/* @vite-ignore */ game_url)) as typeof import("../src/lib/core/runtime/game.js");
    const viewport_module = (await import(/* @vite-ignore */ viewport_url)) as typeof import("../src/lib/core/runtime/viewport_sizing.js");
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const initial_viewport = viewport_module.calculate_fixed_viewport({
      logical_width: 2,
      logical_height: 1,
      css_width: 2,
      css_height: 2,
      device_pixel_ratio: 1,
    });
    const game = game_module.create_game({
      renderer: { canvas, width: 2, height: 2, viewport: initial_viewport },
      scheduler: {
        request_frame: () => 0,
        cancel_frame: () => undefined,
        now_seconds: () => 0,
      },
      update: () => undefined,
      draw: () => undefined,
    });
    await game.ready;
    const before = game.get_viewport();
    const after = viewport_module.calculate_responsive_viewport({ css_width: 3, css_height: 2, device_pixel_ratio: 2 });
    game.resize(after);
    const after_resize = game.get_viewport();
    await game.dispose();
    return { before, after_resize };
  });

  expect(result.before).toMatchObject({ logical_width: 2, logical_height: 1, offset_y: 0.5 });
  expect(result.after_resize).toMatchObject({
    logical_width: 3,
    logical_height: 2,
    physical_width: 6,
    physical_height: 4,
    offset_x: 0,
    offset_y: 0,
  });
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

test("[shape-drawing] preserves source-over order across sprite, rectangle, and circle commands", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 2, height: 2 });
    const red = renderer.create_texture(new Uint8Array([255, 0, 0, 255]), 1, 1);
    const circle = { kind: "circle" as const, draw: { circle: { x: 1, y: 1, radius: 1 }, color: colors.rgba(0, 0, 1, 1), opacity: 0.5 } };
    const rectangle = {
      kind: "rectangle" as const,
      draw: { rectangle: { x: 0, y: 0, width: 2, height: 2 }, color: colors.rgba(0, 1, 0, 1), opacity: 0.5 },
    };
    const sprite_then_shapes = await renderer.draw_commands([
      { kind: "texture", draw: { texture: red, options: { width: 2, height: 2, opacity: 0.5 } } },
      rectangle,
      circle,
    ]);
    const shapes_then_sprite = await renderer.draw_commands([
      circle,
      rectangle,
      { kind: "texture", draw: { texture: red, options: { width: 2, height: 2, opacity: 0.5 } } },
    ]);
    red.release();
    renderer.dispose();
    const pixel_at = (pixels: Uint8Array, x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { sprite_then_shapes: pixel_at(sprite_then_shapes, 1, 1), shapes_then_sprite: pixel_at(shapes_then_sprite, 1, 1) };
  });

  expect(result.sprite_then_shapes).toEqual([32, 64, 128, 255]);
  expect(result.shapes_then_sprite).toEqual([128, 64, 32, 255]);
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

test("[paths-and-polygons] renders indexed triangle geometry with real readback", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 4, height: 4 });
    const pixels = await renderer.draw_commands([
      {
        kind: "triangles",
        draw: {
          vertices: [
            { x: 0, y: 0 },
            { x: 4, y: 0 },
            { x: 0, y: 4 },
          ],
          indices: [0, 1, 2],
          color: colors.rgba(0, 1, 0, 1),
        },
      },
    ]);
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { inside: pixel_at(0, 0), outside: pixel_at(3, 3) };
  });

  expect(result.inside).toEqual([0, 255, 0, 255]);
  expect(result.outside).toEqual([0, 0, 0, 255]);
});

test("[paths-and-polygons] renders prepared stroke geometry with real readback", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const stroke_url = new URL("/src/lib/core/runtime/path_flattening.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const stroke = (await import(/* @vite-ignore */ stroke_url)) as typeof import("../src/lib/core/runtime/path_flattening.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 5, height: 5 });
    const subpaths = stroke.flatten_path([stroke.move_to(0.5, 2.5), stroke.line_to(4.5, 2.5)], 0.25);
    const pixels = await renderer.draw_commands([
      {
        kind: "stroke",
        draw: { subpaths, width: 1, color: colors.rgba(1, 0, 0, 1) },
      },
    ]);
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { inside: pixel_at(2, 2), outside: pixel_at(2, 0) };
  });

  expect(result.inside).toEqual([255, 0, 0, 255]);
  expect(result.outside).toEqual([0, 0, 0, 255]);
});

test("[paths-and-polygons] renders a concave polygon fill and preserves its notch", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 5, height: 5 });
    const pixels = await renderer.draw_commands([
      {
        kind: "polygon",
        draw: {
          points: [
            { x: 0, y: 0 },
            { x: 4, y: 0 },
            { x: 4, y: 1 },
            { x: 1, y: 1 },
            { x: 1, y: 4 },
            { x: 0, y: 4 },
          ],
          color: colors.rgba(0, 1, 0, 1),
        },
      },
    ]);
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { filled: pixel_at(0, 0), notch: pixel_at(2, 2) };
  });

  expect(result.filled).toEqual([0, 255, 0, 255]);
  expect(result.notch).toEqual([0, 0, 0, 255]);
});

test("[paths-and-polygons] renders a polygon outline without filling its interior", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 5, height: 5 });
    const pixels = await renderer.draw_commands([
      {
        kind: "polygon_outline",
        draw: {
          points: [
            { x: 0.5, y: 0.5 },
            { x: 4.5, y: 0.5 },
            { x: 4.5, y: 4.5 },
            { x: 0.5, y: 4.5 },
          ],
          stroke_width: 1,
          color: colors.rgba(1, 0, 0, 1),
        },
      },
    ]);
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { edge: pixel_at(2, 0), interior: pixel_at(2, 2) };
  });

  expect(result.edge).toEqual([255, 0, 0, 255]);
  expect(result.interior).toEqual([0, 0, 0, 255]);
});

test("[paths-and-polygons] submits game-owned geometry and rejects released handles", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const owner_url = new URL("/src/lib/core/runtime/geometry_ownership.ts", location.origin).href;
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const owner_module = (await import(/* @vite-ignore */ owner_url)) as typeof import("../src/lib/core/runtime/geometry_ownership.js");
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 4, height: 4 });
    const owner = owner_module.create_geometry_owner();
    const geometry = owner.create({
      vertices: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 4 },
      ],
      indices: [0, 1, 2],
    });
    const pixels = await renderer.draw_commands([{ kind: "geometry", draw: { geometry, owner, color: colors.rgba(0, 0, 1, 1) } }]);
    geometry.release();
    let rejected = false;
    try {
      await renderer.draw_commands([{ kind: "geometry", draw: { geometry, owner, color: colors.rgba(0, 0, 1, 1) } }]);
    } catch (error) {
      rejected = error instanceof Error && error.message === "geometry handle is released";
    }
    owner.dispose();
    renderer.dispose();
    return { pixel: Array.from(pixels.slice(0, 4)), rejected };
  });

  expect(result.pixel).toEqual([0, 0, 255, 255]);
  expect(result.rejected).toBe(true);
});

test("[paths-and-polygons] replaces cached GPU geometry after an owned update", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const owner_url = new URL("/src/lib/core/runtime/geometry_ownership.ts", location.origin).href;
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const owner_module = (await import(/* @vite-ignore */ owner_url)) as typeof import("../src/lib/core/runtime/geometry_ownership.js");
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 4, height: 4 });
    const owner = owner_module.create_geometry_owner();
    const geometry = owner.create({
      vertices: [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 0, y: 2 },
      ],
      indices: [0, 1, 2],
    });
    const draw = () => renderer.draw_commands([{ kind: "geometry", draw: { geometry, owner, color: colors.rgba(1, 1, 0, 1) } }]);
    const first = await draw();
    geometry.update(owner, {
      vertices: [
        { x: 0, y: 2 },
        { x: 4, y: 2 },
        { x: 0, y: 4 },
      ],
      indices: [0, 1, 2],
    });
    const second = await draw();
    geometry.release();
    owner.dispose();
    renderer.dispose();
    const pixel_at = (pixels: Uint8Array, x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return {
      first_top: pixel_at(first, 1, 0),
      first_bottom: pixel_at(first, 0, 3),
      second_top: pixel_at(second, 1, 0),
      second_bottom: pixel_at(second, 0, 3),
    };
  });

  expect(result.first_top).toEqual([255, 255, 0, 255]);
  expect(result.first_bottom).toEqual([0, 0, 0, 255]);
  expect(result.second_top).toEqual([0, 0, 0, 255]);
  expect(result.second_bottom).toEqual([255, 255, 0, 255]);
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

test("[shape-drawing] places a clockwise corner join on the outer side", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const colors_url = new URL("/src/lib/core/runtime/colors.ts", location.origin).href;
    const path_url = new URL("/src/lib/core/runtime/path_flattening.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const colors = (await import(/* @vite-ignore */ colors_url)) as typeof import("../src/lib/core/runtime/colors.js");
    const path = (await import(/* @vite-ignore */ path_url)) as typeof import("../src/lib/core/runtime/path_flattening.js");
    const renderer = await module.create_webgpu_renderer({ canvas, width: 12, height: 12 });
    const subpaths = path.flatten_path([path.move_to(3.5, 3.5), path.line_to(7.5, 3.5), path.line_to(7.5, 7.5)], 0.25);
    const pixels = await renderer.draw_commands([{ kind: "stroke", draw: { subpaths, width: 4, color: colors.rgba(0, 1, 0, 1) } }]);
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { outer: pixel_at(8, 1), inner: pixel_at(7, 4) };
  });

  expect(result.outer).toEqual([0, 255, 0, 255]);
  expect(result.inner).toEqual([0, 255, 0, 255]);
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

test("[texture-filtering] applies minification policy without mipmaps", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const pixels = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
    const renderer = await module.create_webgpu_renderer({ canvas, width: 1, height: 1 });
    const nearest = renderer.create_texture(pixels, 2, 2, { magnification: "nearest", minification: "nearest" });
    const linear = renderer.create_texture(pixels, 2, 2, { magnification: "linear", minification: "linear" });
    const nearest_pixels = await renderer.draw_texture(nearest, { width: 1, height: 1 });
    const linear_pixels = await renderer.draw_texture(linear, { width: 1, height: 1 });
    nearest.release();
    linear.release();
    renderer.dispose();
    return { nearest: Array.from(nearest_pixels.slice(0, 4)), linear: Array.from(linear_pixels.slice(0, 4)) };
  });

  expect(result.nearest[3]).toBe(255);
  expect(result.linear).toEqual([128, 128, 128, 255]);
  expect(result.nearest).not.toEqual(result.linear);
});

test("[camera-2d] applies a synchronous camera scope to GPU geometry", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const renderer_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const camera_url = new URL("/src/lib/core/runtime/camera.ts", location.origin).href;
    const renderer_module = (await import(/* @vite-ignore */ renderer_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const camera_module = (await import(/* @vite-ignore */ camera_url)) as typeof import("../src/lib/core/runtime/camera.js");
    const renderer = await renderer_module.create_webgpu_renderer({ canvas, width: 4, height: 4 });
    const camera = camera_module.create_camera({ viewport: { logical_width: 4, logical_height: 4 } });
    const texture = renderer.create_texture(new Uint8Array([255, 0, 0, 255]), 1, 1);
    const pixels = await camera.draw(() => renderer.draw_texture(texture, { x: 0, y: 0, width: 1, height: 1 }));
    texture.release();
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { centered: pixel_at(2, 2), screen_origin: pixel_at(0, 0) };
  });

  expect(result.centered).toEqual([255, 0, 0, 255]);
  expect(result.screen_origin).toEqual([0, 0, 0, 255]);
});

test("[camera-2d] applies zoom and inverse rotation to world geometry", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const renderer_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const camera_url = new URL("/src/lib/core/runtime/camera.ts", location.origin).href;
    const renderer_module = (await import(/* @vite-ignore */ renderer_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const camera_module = (await import(/* @vite-ignore */ camera_url)) as typeof import("../src/lib/core/runtime/camera.js");
    const renderer = await renderer_module.create_webgpu_renderer({ canvas, width: 4, height: 4 });
    const camera = camera_module.create_camera({ viewport: { logical_width: 4, logical_height: 4 }, zoom: 2, rotation: Math.PI / 2 });
    const texture = renderer.create_texture(new Uint8Array([0, 255, 0, 255]), 1, 1);
    const pixels = await camera.draw(() => renderer.draw_texture(texture, { x: 0, y: 0, width: 0.5, height: 0.5 }));
    texture.release();
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { rotated: pixel_at(2, 1), opposite: pixel_at(1, 2) };
  });

  expect(result.rotated).toEqual([0, 255, 0, 255]);
  expect(result.opposite).toEqual([0, 0, 0, 255]);
});

test("[viewport-sizing] maps logical content into fixed-fit letterbox bounds", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const renderer = await module.create_webgpu_renderer({
      canvas,
      width: 4,
      height: 4,
      viewport: {
        logical_width: 4,
        logical_height: 2,
        css_width: 4,
        css_height: 4,
        physical_width: 4,
        physical_height: 4,
        content_width: 4,
        content_height: 2,
        offset_x: 0,
        offset_y: 1,
      },
    });
    const texture = renderer.create_texture(new Uint8Array([255, 0, 0, 255]), 1, 1);
    const pixels = await renderer.draw_texture(texture, { x: 0, y: 0, width: 1, height: 1 });
    texture.release();
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { content: pixel_at(0, 1), top_bar: pixel_at(0, 0) };
  });

  expect(result.content).toEqual([255, 0, 0, 255]);
  expect(result.top_bar).toEqual([0, 0, 0, 255]);
});

test("[viewport-sizing] applies runtime resize and DPR without changing logical placement", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const module_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const module = (await import(/* @vite-ignore */ module_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const renderer = await module.create_webgpu_renderer({
      canvas,
      width: 2,
      height: 2,
      viewport: {
        logical_width: 2,
        logical_height: 2,
        css_width: 2,
        css_height: 2,
        physical_width: 2,
        physical_height: 2,
        content_width: 2,
        content_height: 2,
        offset_x: 0,
        offset_y: 0,
      },
    });
    const texture = renderer.create_texture(new Uint8Array([255, 0, 0, 255]), 1, 1);
    renderer.resize({
      logical_width: 4,
      logical_height: 2,
      css_width: 4,
      css_height: 2,
      physical_width: 8,
      physical_height: 4,
      content_width: 4,
      content_height: 2,
      offset_x: 0,
      offset_y: 0,
    });
    const pixels = await renderer.draw_texture(texture, { x: 3, y: 0, width: 1, height: 1 });
    texture.release();
    renderer.dispose();
    const pixel_at = (x: number, y: number): number[] => Array.from(pixels.slice(y * 256 + x * 4, y * 256 + x * 4 + 4));
    return { logical_landmark: pixel_at(6, 1), unchanged_area: pixel_at(0, 0) };
  });

  expect(result.logical_landmark).toEqual([255, 0, 0, 255]);
  expect(result.unchanged_area).toEqual([0, 0, 0, 255]);
});
