import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { create_renderer_benchmark_workload, renderer_benchmark_sizes } from "./renderer-benchmark-workload.js";

type RendererCpuBenchmark = Readonly<{
  sprite_count: number;
  command_preparation_ms: number;
  expected_batch_breaks: number;
  expected_production_readbacks: number;
}>;

const repetitions = 5;

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)] ?? 0;
}

function run_cpu_benchmark(sprite_count: number): RendererCpuBenchmark {
  const workload = create_renderer_benchmark_workload(sprite_count);
  const samples = Array.from({ length: repetitions }, () => {
    const start = performance.now();
    const prepared = create_renderer_benchmark_workload(sprite_count);
    if (prepared.sprites.length !== workload.sprites.length) throw new Error("renderer workload preparation changed its sprite count");
    return Number((performance.now() - start).toFixed(2));
  });
  return {
    sprite_count,
    command_preparation_ms: median(samples),
    expected_batch_breaks: workload.expected_batch_breaks,
    expected_production_readbacks: workload.expected_production_readbacks,
  };
}

describe("renderer CPU benchmark workload", () => {
  it("records shared-texture preparation at the planned sprite sizes", () => {
    const results = renderer_benchmark_sizes.map(run_cpu_benchmark);
    expect(results.map((result) => result.sprite_count)).toEqual([100, 1_000, 10_000]);
    expect(results.every((result) => result.expected_batch_breaks === 0)).toBe(true);
    expect(results.every((result) => result.expected_production_readbacks === 0)).toBe(true);
    console.log(JSON.stringify({ runtime: process.version, platform: process.platform, arch: process.arch, results }));
  });
});
