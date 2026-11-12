import { describe, expect, it } from "vitest";
import { create_stroke_geometry } from "../src/lib/core/runtime/stroke_geometry.js";

const create_subpath = (segments: number, offset: number) => ({
  points: Array.from({ length: segments + 1 }, (_, index) => ({
    x: offset + index * 4,
    y: offset + Math.sin(index / 3) * 8,
  })),
  closed: false,
});

const median = (values: readonly number[]): number => {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)] ?? 0;
};

describe("stroke preparation benchmark", () => {
  it("records static and dynamic cap/join workloads", () => {
    const results = [10, 100, 1_000].map((segments) => {
      const static_subpaths = [create_subpath(segments, 0)];
      const static_samples: number[] = [];
      const dynamic_samples: number[] = [];
      for (let repetition = 0; repetition < 5; repetition += 1) {
        const static_start = performance.now();
        create_stroke_geometry(static_subpaths, 4, { cap: "round", join: "round" });
        static_samples.push(performance.now() - static_start);
        const dynamic_start = performance.now();
        create_stroke_geometry([create_subpath(segments, repetition)], 4, { cap: "round", join: "round" });
        dynamic_samples.push(performance.now() - dynamic_start);
      }
      return { segments, static_ms: Number(median(static_samples).toFixed(3)), dynamic_ms: Number(median(dynamic_samples).toFixed(3)) };
    });
    process.stderr.write(`${JSON.stringify({ node: process.version, results })}\n`);
    expect(results.every((result) => result.static_ms >= 0 && result.dynamic_ms >= 0)).toBe(true);
  });
});
