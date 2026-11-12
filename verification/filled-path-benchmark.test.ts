import { describe, expect, it } from "vitest";
import { close, flatten_path, line_to, move_to, quadratic_to } from "../src/lib/core/runtime/path_flattening.js";
import { triangulate_subpaths } from "../src/lib/core/runtime/triangulation.js";

const create_workload = (segments: number, offset: number) => {
  const outer = [
    move_to(offset, offset),
    quadratic_to(offset + segments / 2, -segments / 4, offset + segments, offset),
    line_to(offset + segments, offset + segments),
    line_to(offset, offset + segments),
    close(),
  ];
  const hole = [
    move_to(offset + segments / 4, offset + segments / 4),
    line_to(offset + segments / 4, offset + (segments * 3) / 4),
    line_to(offset + (segments * 3) / 4, offset + (segments * 3) / 4),
    line_to(offset + (segments * 3) / 4, offset + segments / 4),
    close(),
  ];
  return [flatten_path(outer, 0.25)[0], flatten_path(hole, 0.25)[0]];
};

const median = (values: readonly number[]): number => {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)] ?? 0;
};

describe("filled path tessellation benchmark", () => {
  it("records static and dynamic preparation workloads", () => {
    const results = [10, 100, 1_000].map((segments) => {
      const static_subpaths = create_workload(segments, 0);
      const static_samples: number[] = [];
      const dynamic_samples: number[] = [];
      for (let repetition = 0; repetition < 5; repetition += 1) {
        const static_start = performance.now();
        triangulate_subpaths(static_subpaths);
        static_samples.push(performance.now() - static_start);
        const dynamic_start = performance.now();
        triangulate_subpaths(create_workload(segments, repetition));
        dynamic_samples.push(performance.now() - dynamic_start);
      }
      return { segments, static_ms: Number(median(static_samples).toFixed(3)), dynamic_ms: Number(median(dynamic_samples).toFixed(3)) };
    });
    process.stderr.write(`${JSON.stringify({ node: process.version, results })}\n`);
    expect(results.every((result) => result.static_ms >= 0 && result.dynamic_ms >= 0)).toBe(true);
  });
});
