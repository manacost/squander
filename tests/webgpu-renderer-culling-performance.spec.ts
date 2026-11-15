import { expect, test } from "@playwright/test";

type CullingBenchmarkModule = typeof import("../verification/renderer-culling-workload.js");

type CullingBenchmarkResult = Readonly<{
  sprite_count: number;
  expected_visible_commands: number;
  expected_skipped_commands: number;
  cpu_filter_ms: number;
  unculled_frame_ms: number;
  culled_frame_ms: number;
}>;

test("[render-culling] records CPU-bound and GPU-bound workload measurements", async ({ page, browser }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    if (!window.isSecureContext) throw new Error("culling benchmark requires a secure context");
    if (!("gpu" in navigator)) throw new Error("culling benchmark requires navigator.gpu");
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter === null) throw new Error("culling benchmark adapter creation failed");
    const device = await adapter.requestDevice();
    const renderer_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const camera_url = new URL("/src/lib/core/runtime/camera.ts", location.origin).href;
    const workload_url = new URL("/verification/renderer-culling-workload.ts", location.origin).href;
    const renderer_module = (await import(/* @vite-ignore */ renderer_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const camera_module = (await import(/* @vite-ignore */ camera_url)) as typeof import("../src/lib/core/runtime/camera.js");
    const workload_module = (await import(/* @vite-ignore */ workload_url)) as CullingBenchmarkModule;
    const camera = camera_module.create_camera({ x: 400, y: 225, viewport: { logical_width: 800, logical_height: 450 } });
    const render = async (cull_offscreen: boolean): Promise<CullingBenchmarkResult[]> => {
      const canvas = document.createElement("canvas");
      document.body.append(canvas);
      const renderer = await renderer_module.create_webgpu_renderer({ canvas, width: 800, height: 450, cull_offscreen });
      const texture = renderer.create_texture(new Uint8Array([255, 255, 255, 255]), 1, 1, { filter: "nearest" });
      const elapsed = async (run: () => Promise<unknown>): Promise<number> => {
        const start = performance.now();
        await run();
        return Number((performance.now() - start).toFixed(2));
      };
      const measured: CullingBenchmarkResult[] = [];
      for (const sprite_count of workload_module.renderer_culling_benchmark_sizes) {
        const workload = workload_module.create_renderer_culling_benchmark_workload(sprite_count);
        const commands = workload_module.bind_renderer_culling_workload(workload, texture);
        const cpu_start = performance.now();
        let visible_reference = 0;
        for (let repetition = 0; repetition < 3; repetition += 1) {
          visible_reference = workload.sprites.filter((sprite) =>
            camera.is_in_view({ x: sprite.x, y: sprite.y, width: 16, height: 16 }),
          ).length;
        }
        const cpu_filter_ms = Number((performance.now() - cpu_start).toFixed(2));
        if (visible_reference !== workload.expected_visible_commands) throw new Error("culling reference count mismatch");
        for (let warmup = 0; warmup < 1; warmup += 1) {
          await camera.draw(() => renderer.draw_commands(commands));
        }
        const frame_samples: number[] = [];
        for (let repetition = 0; repetition < 3; repetition += 1) {
          frame_samples.push(await elapsed(() => camera.draw(() => renderer.draw_commands(commands))));
        }
        const ordered = [...frame_samples].sort((left, right) => left - right);
        measured.push({
          sprite_count,
          expected_visible_commands: workload.expected_visible_commands,
          expected_skipped_commands: workload.expected_skipped_commands,
          cpu_filter_ms,
          unculled_frame_ms: cull_offscreen ? 0 : (ordered[1] ?? 0),
          culled_frame_ms: cull_offscreen ? (ordered[1] ?? 0) : 0,
        });
      }
      texture.release();
      renderer.dispose();
      return measured;
    };
    const unculled = await render(false);
    const culled = await render(true);
    device.destroy();
    return { secure: window.isSecureContext, gpu: "gpu" in navigator, unculled, culled };
  });

  expect(result.secure).toBe(true);
  expect(result.gpu).toBe(true);
  expect(result.unculled.map((entry) => entry.sprite_count)).toEqual([100, 1_000, 10_000]);
  expect(result.culled.map((entry) => entry.expected_visible_commands)).toEqual([50, 500, 5_000]);
  expect(result.culled.map((entry) => entry.expected_skipped_commands)).toEqual([50, 500, 5_000]);
  console.log(JSON.stringify({ browser_version: browser.version(), os: process.platform, result }));
  test.info().annotations.push({
    type: "renderer-culling-environment",
    description: JSON.stringify({
      browser_version: browser.version(),
      os: process.platform,
      unculled: result.unculled,
      culled: result.culled,
    }),
  });
  void test.info().attach("renderer-culling-benchmark.json", {
    body: JSON.stringify({ browser_version: browser.version(), os: process.platform, result }, null, 2),
    contentType: "application/json",
  });
});
