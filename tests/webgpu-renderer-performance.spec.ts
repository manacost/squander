import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

type RendererBenchmarkResult = Readonly<{
  sprite_count: number;
  cpu_preparation_ms: number;
  production_frame_ms: number;
  diagnostic_frame_ms: number;
  submissions: number;
  batch_breaks: number;
  production_readbacks: number;
  diagnostic_readbacks: number;
}>;

type RendererBenchmarkModule = typeof import("../verification/renderer-benchmark-workload.js");

type RendererBenchmarkBaseline = Readonly<{
  version: number;
  time_regression_ratio: number;
  profiles: Readonly<Partial<Record<string, Partial<Record<string, { production_frame_ms: number }>>>>>;
}>;

function baseline(): RendererBenchmarkBaseline {
  return JSON.parse(readFileSync("verification/renderer-performance-baseline.json", "utf8")) as RendererBenchmarkBaseline;
}

test("renderer production and diagnostic workloads record separate costs", async ({ page, browser }) => {
  await page.goto("/");
  const environment = await page.evaluate(async () => {
    if (!window.isSecureContext) throw new Error("renderer benchmark requires a secure context");
    if (!("gpu" in navigator)) throw new Error("renderer benchmark requires navigator.gpu");
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter === null) throw new Error("renderer benchmark adapter creation failed");
    const device = await adapter.requestDevice();
    const info = adapter.info;
    return {
      secure_context: window.isSecureContext,
      browser_gpu: true,
      adapter: true,
      device: true,
      adapter_vendor: info.vendor,
      adapter_architecture: info.architecture,
      adapter_device: info.device,
      adapter_description: info.description,
      dpr: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      fixture: { width: 800, height: 450 },
      device_lost_promise: device.lost instanceof Promise,
    };
  });
  const browser_version = browser.version();

  const results = await page.evaluate(async () => {
    const renderer_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const workload_url = new URL("/verification/renderer-benchmark-workload.ts", location.origin).href;
    const renderer_module = (await import(/* @vite-ignore */ renderer_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const workload_module = (await import(/* @vite-ignore */ workload_url)) as RendererBenchmarkModule;
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const renderer = await renderer_module.create_webgpu_renderer({ canvas, width: 800, height: 450 });
    const texture = renderer.create_texture(new Uint8Array(4 * 4 * 4).fill(255), 4, 4, { filter: "nearest" });
    const elapsed = async (run: () => Promise<void>): Promise<number> => {
      const start = performance.now();
      await run();
      return Number((performance.now() - start).toFixed(2));
    };
    const median = (values: readonly number[]): number => {
      const ordered = [...values].sort((left, right) => left - right);
      return ordered[Math.floor(ordered.length / 2)] ?? 0;
    };
    const measured: RendererBenchmarkResult[] = [];
    for (const sprite_count of workload_module.renderer_benchmark_sizes) {
      const workload = workload_module.create_renderer_benchmark_workload(sprite_count);
      const preparation_samples: number[] = [];
      const production_samples: number[] = [];
      const diagnostic_samples: number[] = [];
      let commands = workload_module.prepare_renderer_benchmark_commands(workload, texture);
      for (let warmup = 0; warmup < 2; warmup += 1) {
        const frame = renderer.begin_frame();
        frame.draw_commands(commands);
        await frame.submit();
      }
      for (let repetition = 0; repetition < 3; repetition += 1) {
        preparation_samples.push(
          await elapsed(async () => {
            commands = workload_module.prepare_renderer_benchmark_commands(workload, texture);
          }),
        );
        production_samples.push(
          await elapsed(async () => {
            const frame = renderer.begin_frame();
            frame.draw_commands(commands);
            await frame.submit();
          }),
        );
      }
      diagnostic_samples.push(
        await elapsed(async () => {
          const frame = renderer.begin_frame();
          const capture = frame.capture();
          frame.draw_commands(commands);
          await frame.submit();
          await capture;
        }),
      );
      measured.push({
        sprite_count,
        cpu_preparation_ms: median(preparation_samples),
        production_frame_ms: median(production_samples),
        diagnostic_frame_ms: median(diagnostic_samples),
        submissions: 1,
        batch_breaks: workload.expected_batch_breaks,
        production_readbacks: workload.expected_production_readbacks,
        diagnostic_readbacks: 1,
      });
    }
    texture.release();
    renderer.dispose();
    return measured;
  });

  expect(environment.secure_context).toBe(true);
  expect(environment.browser_gpu).toBe(true);
  expect(environment.adapter).toBe(true);
  expect(environment.device).toBe(true);
  expect(environment.device_lost_promise).toBe(true);
  expect(results.map((result) => result.sprite_count)).toEqual([100, 1_000, 10_000]);
  expect(results.every((result) => result.submissions === 1)).toBe(true);
  expect(results.every((result) => result.batch_breaks === 0)).toBe(true);
  expect(results.every((result) => result.production_readbacks === 0)).toBe(true);
  expect(results.every((result) => result.diagnostic_readbacks === 1)).toBe(true);

  const profile = `${process.platform}-chromium-${browser_version}`;
  const expected_profile = baseline().profiles[profile];
  if (process.env.RENDERER_BENCHMARK_ENFORCE === "1" && expected_profile !== undefined) {
    for (const result of results) {
      const expected = expected_profile[String(result.sprite_count)];
      if (expected === undefined) continue;
      expect(result.production_frame_ms, `${String(result.sprite_count)} sprite production timing regression`).toBeLessThanOrEqual(
        expected.production_frame_ms * baseline().time_regression_ratio,
      );
    }
  }

  test.info().annotations.push({
    type: "renderer-benchmark-environment",
    description: JSON.stringify({ browser_version, os: process.platform, profile, environment, results }),
  });
  void test.info().attach("renderer-benchmark.json", {
    body: JSON.stringify({ browser_version, os: process.platform, profile, environment, results }, null, 2),
    contentType: "application/json",
  });
  console.log(JSON.stringify({ browser_version, os: process.platform, profile, environment, results }));
});
