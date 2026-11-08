import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

type BrowserBenchmarkResult = {
  readonly policy: "monotonic" | "generational";
  readonly creation_ms: number;
  readonly dense_update_ms: number;
  readonly sparse_query_ms: number;
  readonly structural_ms: number;
  readonly snapshot_ms: number;
  readonly clear_ms: number;
  readonly memory: {
    readonly before_clear: { readonly heap_used_mb: number | null; readonly rss_mb: number | null };
  };
};

type BrowserWorkloadOptions = {
  readonly entity_count: number;
  readonly structural_sample: number;
  readonly snapshot_count: number;
  readonly read_memory: () => { readonly heap_used_mb: number | null; readonly rss_mb: number | null };
};

type BrowserWorkloadModule = {
  readonly run_ecs_benchmark: (policy: "monotonic" | "generational", options: BrowserWorkloadOptions) => BrowserBenchmarkResult;
};

type BrowserBaseline = {
  readonly version: 1;
  readonly time_regression_ratio: number;
  readonly memory_regression_ratio: number;
  readonly profiles: Readonly<Record<string, Readonly<Record<string, BrowserBenchmarkResult>>>>;
};

const repetitions = 5;
const time_metrics: readonly (keyof BrowserBenchmarkResult)[] = [
  "creation_ms",
  "dense_update_ms",
  "sparse_query_ms",
  "structural_ms",
  "snapshot_ms",
  "clear_ms",
];

function baseline(): BrowserBaseline {
  return JSON.parse(readFileSync("verification/ecs-browser-baseline.json", "utf8")) as BrowserBaseline;
}

test("ECS browser CPU workloads run on the trusted local origin", async ({ page }) => {
  await page.goto("/");
  const environment = await page.evaluate(() => ({
    secure_context: window.isSecureContext,
    browser: navigator.userAgent,
    dpr: window.devicePixelRatio,
    viewport: { width: window.innerWidth, height: window.innerHeight },
  }));
  expect(environment.secure_context).toBe(true);
  const browser_version = page.context().browser()?.version() ?? "unknown";

  const results = await page.evaluate(
    async ({ repetitions: count }) => {
      const workload = (await import("/verification/ecs-benchmark-workload.ts")) as BrowserWorkloadModule;
      const options: BrowserWorkloadOptions = {
        entity_count: 100_000,
        structural_sample: 10_000,
        snapshot_count: 10_000,
        read_memory: () => ({ heap_used_mb: null, rss_mb: null }),
      };
      const median = (values: number[]): number => {
        const ordered = [...values].sort((left, right) => left - right);
        return ordered[Math.floor(ordered.length / 2)] ?? 0;
      };
      const policies: readonly ("monotonic" | "generational")[] = ["monotonic", "generational"];
      return policies.map((policy) => {
        workload.run_ecs_benchmark(policy, { ...options, entity_count: 5_000, structural_sample: 500, snapshot_count: 500 });
        const runs = Array.from({ length: count }, () => workload.run_ecs_benchmark(policy, options));
        const first = runs[0];
        return {
          ...first,
          creation_ms: median(runs.map((run) => run.creation_ms)),
          dense_update_ms: median(runs.map((run) => run.dense_update_ms)),
          sparse_query_ms: median(runs.map((run) => run.sparse_query_ms)),
          structural_ms: median(runs.map((run) => run.structural_ms)),
          snapshot_ms: median(runs.map((run) => run.snapshot_ms)),
          clear_ms: median(runs.map((run) => run.clear_ms)),
        };
      });
    },
    { repetitions },
  );

  const profile = `${process.platform}-chromium-${browser_version}`;
  const baseline_file = baseline();
  if (process.env.ECS_BENCHMARK_ENFORCE === "1" && profile in baseline_file.profiles) {
    const expected_profile = baseline_file.profiles[profile];
    for (const result of results) {
      const expected = expected_profile[result.policy];
      for (const metric of time_metrics) {
        expect(result[metric], `${result.policy} ${metric} regression`).toBeLessThanOrEqual(
          expected[metric] * baseline_file.time_regression_ratio,
        );
      }
    }
  }

  test.info().annotations.push({
    type: "ecs-browser-environment",
    description: JSON.stringify({ ...environment, profile, results }),
  });
  console.log(JSON.stringify({ environment: { ...environment, browser_version }, profile, results }));
});
