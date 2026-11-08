import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { run_ecs_benchmark, type EcsBenchmarkMemory, type EcsBenchmarkResult } from "./ecs-benchmark-workload.js";

type Baseline = {
  readonly version: 1;
  readonly time_regression_ratio: number;
  readonly memory_regression_ratio: number;
  readonly profiles: Readonly<Record<string, Readonly<Record<string, EcsBenchmarkResult>>>>;
};

const entity_count = 1_000_000;
const structural_sample = 100_000;
const snapshot_count = 100_000;
const repetitions = 3;
const time_metrics: readonly (keyof EcsBenchmarkResult)[] = [
  "creation_ms",
  "dense_update_ms",
  "sparse_query_ms",
  "structural_ms",
  "snapshot_ms",
  "clear_ms",
];

function memory(): EcsBenchmarkMemory {
  const usage = process.memoryUsage();
  return {
    heap_used_mb: Number((usage.heapUsed / 1024 / 1024).toFixed(1)),
    rss_mb: Number((usage.rss / 1024 / 1024).toFixed(1)),
  };
}

function collect_garbage(): void {
  const node_global = globalThis as typeof globalThis & { gc?: () => void };
  node_global.gc?.();
}

function median(values: readonly number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)] ?? 0;
}

function median_result(results: readonly EcsBenchmarkResult[]): EcsBenchmarkResult {
  const first = results[0];
  if (first === undefined) throw new Error("ECS benchmark produced no result");
  return {
    ...first,
    creation_ms: median(results.map((result) => result.creation_ms)),
    dense_update_ms: median(results.map((result) => result.dense_update_ms)),
    sparse_query_ms: median(results.map((result) => result.sparse_query_ms)),
    structural_ms: median(results.map((result) => result.structural_ms)),
    snapshot_ms: median(results.map((result) => result.snapshot_ms)),
    clear_ms: median(results.map((result) => result.clear_ms)),
  };
}

function profile_key(): string {
  return `${process.platform}-${process.arch}-${process.version}`;
}

function baseline(): Baseline {
  return JSON.parse(readFileSync(new URL("./ecs-performance-baseline.json", import.meta.url), "utf8")) as Baseline;
}

function assert_regression(
  policy: string,
  result: EcsBenchmarkResult,
  expected: EcsBenchmarkResult | undefined,
  thresholds: Baseline,
): void {
  if (expected === undefined) return;
  const enforce = process.env.ECS_BENCHMARK_ENFORCE === "1";
  for (const metric of time_metrics) {
    const actual = result[metric];
    const reference = expected[metric];
    if (typeof actual !== "number" || typeof reference !== "number") continue;
    const limit = reference * thresholds.time_regression_ratio;
    if (enforce) {
      expect(actual, `${policy} ${metric} regression`).toBeLessThanOrEqual(limit);
    } else if (actual > limit) {
      console.warn(`${policy} ${metric} exceeded the advisory benchmark budget: ${actual} > ${limit}`);
    }
  }

  const actual_heap = result.memory.after_clear.heap_used_mb;
  const reference_heap = expected.memory.after_clear.heap_used_mb;
  if (actual_heap !== null && reference_heap !== null) {
    const limit = reference_heap * thresholds.memory_regression_ratio;
    if (enforce) {
      expect(actual_heap, `${policy} heap regression`).toBeLessThanOrEqual(limit);
    } else if (actual_heap > limit) {
      console.warn(`${policy} heap exceeded the advisory benchmark budget: ${actual_heap} > ${limit}`);
    }
  }
}

describe("ecs multi-workload benchmark", () => {
  it("records and guards both entity identity policies", () => {
    const options = { entity_count, structural_sample, snapshot_count, read_memory: memory, collect_garbage };
    const baseline_file = baseline();
    const profile = baseline_file.profiles[profile_key()];
    const results = ["monotonic", "generational"].map((policy) => {
      const entity_policy = policy as "monotonic" | "generational";
      run_ecs_benchmark(entity_policy, { ...options, entity_count: 10_000, structural_sample: 1_000, snapshot_count: 1_000 });
      const measured = median_result(Array.from({ length: repetitions }, () => run_ecs_benchmark(entity_policy, options)));
      assert_regression(entity_policy, measured, profile?.[entity_policy], baseline_file);
      return measured;
    });

    expect(results).toHaveLength(2);
    console.log(
      JSON.stringify({ runtime: process.version, platform: process.platform, arch: process.arch, profile: profile_key(), results }),
    );
  }, 180_000);
});
