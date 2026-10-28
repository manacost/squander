import { describe, expect, it } from "vitest";
import { close, cubic_to, flatten_path, line_to, move_to, quadratic_to } from "./path_flattening.js";

describe("[paths-and-polygons] path flattening", () => {
  it("preserves quadratic and cubic endpoints while approximating curves", () => {
    const result = flatten_path([move_to(0, 0), quadratic_to(5, 10, 10, 0), cubic_to(15, -10, 25, 10, 30, 0)], 0.25);
    const points = result[0].points;

    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points.at(-1)).toEqual({ x: 30, y: 0 });
    expect(points.length).toBeGreaterThan(4);
  });

  it("handles zero-length curve chords and the recursion depth guard", () => {
    const result = flatten_path([move_to(0, 0), quadratic_to(10, 0, 0, 0), cubic_to(10, 10, -10, 10, 0, 0)], Number.MIN_VALUE);

    expect(result[0].points.at(-1)).toEqual({ x: 0, y: 0 });
    expect(result[0].points.length).toBeGreaterThan(2);
  });

  it("keeps disconnected subpaths separate and records closure", () => {
    const result = flatten_path([move_to(0, 0), line_to(10, 0), close(), move_to(20, 0), line_to(30, 0)], 1);

    expect(result).toEqual([
      {
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 0, y: 0 },
        ],
        closed: true,
      },
      {
        points: [
          { x: 20, y: 0 },
          { x: 30, y: 0 },
        ],
        closed: false,
      },
    ]);
  });

  it("does not duplicate an already-closed endpoint", () => {
    expect(flatten_path([move_to(0, 0), line_to(1, 0), line_to(0, 0), close()], 1)[0]).toEqual({
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
      ],
      closed: true,
    });
  });

  it("rejects invalid tolerances before preparing geometry", () => {
    expect(() => flatten_path([move_to(0, 0), line_to(1, 1)], 0)).toThrow(RangeError);
    expect(() => flatten_path([move_to(0, 0), line_to(1, 1)], Number.NaN)).toThrow(RangeError);
    expect(() => flatten_path([line_to(0, 0)], 1)).toThrow(/begin with move/i);
    expect(() => flatten_path([move_to(0, 0), close(), line_to(1, 1)], 1)).toThrow(/open subpath/i);
  });
});
