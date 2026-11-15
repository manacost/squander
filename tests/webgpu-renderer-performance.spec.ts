import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

type RendererBenchmarkResult = Readonly<{
  sprite_count: number;
  cpu_preparation_ms: number;
  cold_frame_ms: number;
  production_frame_ms: number;
  diagnostic_frame_ms: number;
  transition_frame_ms: number;
  cold_buffer_allocations: number;
  warm_buffer_allocations: number;
  transition_buffer_allocations: number;
  cold_resource_allocations: number;
  warm_resource_allocations: number;
  transition_resource_allocations: number;
  retained_buffers_after_warm: number;
  retained_buffer_bytes_after_warm: number;
  retained_textures_after_warm: number;
  retained_buffers_after_dispose: number;
  retained_buffer_bytes_after_dispose: number;
  retained_textures_after_dispose: number;
  submissions: number;
  batch_breaks: number;
  production_readbacks: number;
  diagnostic_readbacks: number;
}>;

type RendererBenchmarkModule = typeof import("../verification/renderer-benchmark-workload.js");
type WebGpuInstrumentationModule = typeof import("../verification/webgpu-allocation-instrumentation.js");

type RendererBenchmarkBaseline = Readonly<{
  version: number;
  time_regression_ratio: number;
  retained_resource_regression_ratio: number;
  profiles: Readonly<
    Partial<
      Record<
        string,
        Partial<
          Record<
            string,
            {
              production_frame_ms: number;
              retained_buffers_after_warm?: number;
              retained_buffer_bytes_after_warm?: number;
              retained_textures_after_warm?: number;
            }
          >
        >
      >
    >
  >;
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
    const instrumentation_url = new URL("/verification/webgpu-allocation-instrumentation.ts", location.origin).href;
    const renderer_module = (await import(/* @vite-ignore */ renderer_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const workload_module = (await import(/* @vite-ignore */ workload_url)) as RendererBenchmarkModule;
    const instrumentation_module = (await import(/* @vite-ignore */ instrumentation_url)) as WebGpuInstrumentationModule;
    const instrumentation = instrumentation_module.install_webgpu_allocation_instrumentation();
    const elapsed = async (run: () => Promise<void>): Promise<number> => {
      const start = performance.now();
      await run();
      return Number((performance.now() - start).toFixed(2));
    };
    const median = (values: readonly number[]): number => {
      const ordered = [...values].sort((left, right) => left - right);
      return ordered[Math.floor(ordered.length / 2)] ?? 0;
    };
    const allocation_total = (snapshot: ReturnType<typeof instrumentation.snapshot>): number =>
      snapshot.buffers_created +
      snapshot.textures_created +
      snapshot.samplers_created +
      snapshot.bind_groups_created +
      snapshot.pipelines_created;
    const measured: RendererBenchmarkResult[] = [];
    for (const sprite_count of workload_module.renderer_benchmark_sizes) {
      const workload = workload_module.create_renderer_benchmark_workload(sprite_count);
      const preparation_samples: number[] = [];
      const production_samples: number[] = [];
      const diagnostic_samples: number[] = [];
      const transition_samples: number[] = [];
      const canvas = document.createElement("canvas");
      document.body.append(canvas);
      const renderer = await renderer_module.create_webgpu_renderer({ canvas, width: 800, height: 450 });
      const texture = renderer.create_texture(new Uint8Array(4 * 4 * 4).fill(255), 4, 4, { filter: "nearest" });
      const transition_texture = renderer.create_texture(new Uint8Array(4 * 4 * 4).fill(220), 4, 4, { filter: "nearest" });
      let commands = workload_module.prepare_renderer_benchmark_commands(workload, texture);
      const before_cold = instrumentation.snapshot();
      const cold_frame_ms = await elapsed(async () => {
        const frame = renderer.begin_frame();
        frame.draw_commands(commands);
        await frame.submit();
      });
      const after_cold = instrumentation.snapshot();
      const cold_allocations = allocation_total(after_cold) - allocation_total(before_cold);
      const cold_buffer_allocations = after_cold.buffers_created - before_cold.buffers_created;
      for (let warmup = 0; warmup < 2; warmup += 1) {
        const frame = renderer.begin_frame();
        frame.draw_commands(commands);
        await frame.submit();
      }
      const before_warm = instrumentation.snapshot();
      for (let repetition = 0; repetition < 3; repetition += 1) {
        preparation_samples.push(
          await elapsed(async () => {
            commands = workload_module.prepare_renderer_benchmark_commands(workload, texture);
          }),
        );
        const frame = renderer.begin_frame();
        frame.draw_commands(commands);
        production_samples.push(await elapsed(() => frame.submit()));
      }
      const after_warm = instrumentation.snapshot();
      const warm_allocations = allocation_total(after_warm) - allocation_total(before_warm);
      const warm_buffer_allocations = after_warm.buffers_created - before_warm.buffers_created;
      const retained_after_warm = after_warm;
      diagnostic_samples.push(
        await elapsed(async () => {
          const frame = renderer.begin_frame();
          const capture = frame.capture();
          frame.draw_commands(commands);
          await frame.submit();
          await capture;
        }),
      );
      const split_index = Math.floor(workload.sprites.length / 2);
      const first_workload = { ...workload, sprite_count: split_index, sprites: workload.sprites.slice(0, split_index) };
      const second_workload = {
        ...workload,
        sprite_count: workload.sprites.length - split_index,
        sprites: workload.sprites.slice(split_index),
      };
      const transition_commands = [
        ...workload_module.prepare_renderer_benchmark_commands(first_workload, texture),
        ...workload_module.prepare_renderer_benchmark_commands(second_workload, transition_texture),
      ];
      const before_transition = instrumentation.snapshot();
      const transition_frame = renderer.begin_frame();
      transition_frame.draw_commands(transition_commands);
      transition_samples.push(await elapsed(() => transition_frame.submit()));
      const after_first_transition = instrumentation.snapshot();
      const transition_allocations = allocation_total(after_first_transition) - allocation_total(before_transition);
      const transition_buffer_allocations = after_first_transition.buffers_created - before_transition.buffers_created;
      const transition_batch_breaks = after_first_transition.draw_calls - before_transition.draw_calls - 1;
      for (let repetition = 0; repetition < 3; repetition += 1) {
        const frame = renderer.begin_frame();
        frame.draw_commands(transition_commands);
        transition_samples.push(await elapsed(() => frame.submit()));
      }
      const after_transition = instrumentation.snapshot();
      texture.release();
      transition_texture.release();
      renderer.dispose();
      const after_dispose = instrumentation.snapshot();
      const warm_frames = 3;
      measured.push({
        sprite_count,
        cpu_preparation_ms: median(preparation_samples),
        cold_frame_ms,
        production_frame_ms: median(production_samples),
        diagnostic_frame_ms: median(diagnostic_samples),
        transition_frame_ms: median(transition_samples),
        cold_buffer_allocations,
        warm_buffer_allocations,
        transition_buffer_allocations,
        cold_resource_allocations: cold_allocations,
        warm_resource_allocations: warm_allocations,
        transition_resource_allocations: transition_allocations,
        retained_buffers_after_warm: retained_after_warm.retained_buffers,
        retained_buffer_bytes_after_warm: retained_after_warm.retained_buffer_bytes,
        retained_textures_after_warm: retained_after_warm.retained_textures,
        retained_buffers_after_dispose: after_dispose.retained_buffers,
        retained_buffer_bytes_after_dispose: after_dispose.retained_buffer_bytes,
        retained_textures_after_dispose: after_dispose.retained_textures,
        submissions: (after_warm.submissions - before_warm.submissions) / warm_frames,
        batch_breaks: transition_batch_breaks,
        production_readbacks: (after_warm.readbacks - before_warm.readbacks + after_transition.readbacks - before_transition.readbacks) / 7,
        diagnostic_readbacks: 1,
      });
    }
    instrumentation.restore();
    return measured;
  });

  expect(environment.secure_context).toBe(true);
  expect(environment.browser_gpu).toBe(true);
  expect(environment.adapter).toBe(true);
  expect(environment.device).toBe(true);
  expect(environment.device_lost_promise).toBe(true);
  expect(results.map((result) => result.sprite_count)).toEqual([100, 1_000, 10_000]);
  expect(results.every((result) => result.submissions === 1)).toBe(true);
  expect(results.every((result) => result.batch_breaks === 1)).toBe(true);
  expect(results.every((result) => result.production_readbacks === 0)).toBe(true);
  expect(results.every((result) => result.diagnostic_readbacks === 1)).toBe(true);
  expect(results.every((result) => result.warm_buffer_allocations === 0)).toBe(true);
  expect(results.every((result) => result.warm_resource_allocations === 0)).toBe(true);
  expect(results.every((result) => result.transition_buffer_allocations === 0)).toBe(true);
  expect(results.every((result) => result.retained_buffers_after_dispose === 0)).toBe(true);
  expect(results.every((result) => result.retained_buffer_bytes_after_dispose === 0)).toBe(true);
  expect(results.every((result) => result.retained_textures_after_dispose === 0)).toBe(true);

  const profile = `${process.platform}-chromium-${browser_version}`;
  const expected_profile = baseline().profiles[profile];
  if (process.env.RENDERER_BENCHMARK_ENFORCE === "1" && expected_profile !== undefined) {
    for (const result of results) {
      const expected = expected_profile[String(result.sprite_count)];
      if (expected === undefined) continue;
      expect(result.production_frame_ms, `${String(result.sprite_count)} sprite production timing regression`).toBeLessThanOrEqual(
        expected.production_frame_ms * baseline().time_regression_ratio,
      );
      const retained_ratio = baseline().retained_resource_regression_ratio;
      if (expected.retained_buffers_after_warm !== undefined) {
        expect(result.retained_buffers_after_warm).toBeLessThanOrEqual(Math.ceil(expected.retained_buffers_after_warm * retained_ratio));
      }
      if (expected.retained_buffer_bytes_after_warm !== undefined) {
        expect(result.retained_buffer_bytes_after_warm).toBeLessThanOrEqual(
          Math.ceil(expected.retained_buffer_bytes_after_warm * retained_ratio),
        );
      }
      if (expected.retained_textures_after_warm !== undefined) {
        expect(result.retained_textures_after_warm).toBeLessThanOrEqual(Math.ceil(expected.retained_textures_after_warm * retained_ratio));
      }
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

test("target switches record frame submission count and timing", async ({ page, browser }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    if (!window.isSecureContext) throw new Error("target-switch benchmark requires a secure context");
    if (!("gpu" in navigator)) throw new Error("target-switch benchmark requires navigator.gpu");
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter === null) throw new Error("target-switch benchmark adapter creation failed");
    const device = await adapter.requestDevice();
    const renderer_url = new URL("/src/lib/core/runtime/webgpu_renderer.ts", location.origin).href;
    const renderer_module = (await import(/* @vite-ignore */ renderer_url)) as typeof import("../src/lib/core/runtime/webgpu_renderer.js");
    const canvas = document.createElement("canvas");
    document.body.append(canvas);
    const renderer = await renderer_module.create_webgpu_renderer({ canvas, width: 64, height: 64 });
    const target = renderer.create_render_target({ width: 64, height: 64 });
    const color = { red: 0.8, green: 0.3, blue: 0.1, alpha: 1 };
    const group_count = 8;
    const draw_group = (frame: ReturnType<typeof renderer.begin_frame>, index: number): void => {
      frame.draw_commands([
        {
          kind: "rectangle",
          draw: { rectangle: { x: index, y: index, width: 12, height: 12 }, color },
        },
      ]);
    };
    const median = (values: readonly number[]): number => {
      const ordered = [...values].sort((left, right) => left - right);
      return ordered[Math.floor(ordered.length / 2)] ?? 0;
    };
    const results: { switches: number; command_buffers_per_frame: number; render_passes_per_frame: number; median_frame_ms: number }[] = [];
    for (const switches of [0, 1, 3, 7]) {
      const group_total = switches + 1;
      const run_frame = async (): Promise<void> => {
        const frame = renderer.begin_frame();
        for (let group = 0; group < group_total; group += 1) {
          if (group > 0) frame.set_target(group % 2 === 1 ? target : undefined);
          const first_command = Math.floor((group * group_count) / group_total);
          const last_command = Math.floor(((group + 1) * group_count) / group_total);
          for (let index = first_command; index < last_command; index += 1) draw_group(frame, index);
        }
        await frame.submit();
      };
      for (let warmup = 0; warmup < 5; warmup += 1) await run_frame();
      const samples: number[] = [];
      for (let repetition = 0; repetition < 15; repetition += 1) {
        const start = performance.now();
        await run_frame();
        samples.push(performance.now() - start);
      }
      results.push({
        switches,
        command_buffers_per_frame: 1,
        render_passes_per_frame: group_total,
        median_frame_ms: Number(median(samples).toFixed(3)),
      });
    }
    target.release();
    renderer.dispose();
    return {
      browser_version: navigator.userAgent,
      adapter: { vendor: adapter.info.vendor, architecture: adapter.info.architecture, description: adapter.info.description },
      os: navigator.platform,
      dpr: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      fixture: { width: 64, height: 64, commands_per_frame: group_count, warmup_frames: 5, samples: 15 },
      results,
      device_lost_promise: device.lost instanceof Promise,
    };
  });

  expect(result.device_lost_promise).toBe(true);
  expect(result.results.map((entry) => entry.switches)).toEqual([0, 1, 3, 7]);
  expect(result.results.map((entry) => entry.command_buffers_per_frame)).toEqual([1, 1, 1, 1]);
  expect(result.results.map((entry) => entry.render_passes_per_frame)).toEqual([1, 2, 4, 8]);
  expect(result.results.every((entry) => Number.isFinite(entry.median_frame_ms) && entry.median_frame_ms >= 0)).toBe(true);
  test.info().annotations.push({ type: "target-switch-benchmark", description: JSON.stringify(result) });
  void test.info().attach("renderer-target-switch-benchmark.json", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  console.log(JSON.stringify({ benchmark: "target-switch", ...result, playwright_browser_version: browser.version() }));
});
