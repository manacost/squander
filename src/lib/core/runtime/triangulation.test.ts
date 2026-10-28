import { describe, expect, it } from "vitest";
import { triangulate_polygon } from "./triangulation.js";

const triangle_area = (a: readonly [number, number], b: readonly [number, number], c: readonly [number, number]): number =>
  Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;

const indexed_area = (result: ReturnType<typeof triangulate_polygon>): number => {
  let area = 0;
  for (let index = 0; index < result.indices.length; index += 3) {
    const a = result.vertices[result.indices[index]];
    const b = result.vertices[result.indices[index + 1]];
    const c = result.vertices[result.indices[index + 2]];
    area += triangle_area([a.x, a.y], [b.x, b.y], [c.x, c.y]);
  }
  return area;
};

describe("[paths-and-polygons] polygon triangulation", () => {
  it("covers a concave polygon without filling its notch", () => {
    const result = triangulate_polygon([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 4 },
      { x: 0, y: 4 },
    ]);

    expect(result.indices).toHaveLength(12);
    expect(indexed_area(result)).toBe(7);
  });

  it("rejects candidate ears that contain another polygon point", () => {
    const result = triangulate_polygon([
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 6 },
      { x: 4, y: 4 },
      { x: 3, y: 5 },
      { x: 2, y: 4 },
      { x: 0, y: 6 },
    ]);

    expect(result.indices).toHaveLength(15);
    expect(indexed_area(result)).toBe(29);
  });

  it("handles collinear boundary candidates while clipping ears", () => {
    const result = triangulate_polygon([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 0, y: 4 },
    ]);

    expect(indexed_area(result)).toBe(16);
  });

  it("produces the same area for either winding and does not mutate input", () => {
    const clockwise = [
      { x: 0, y: 0 },
      { x: 0, y: 4 },
      { x: 1, y: 4 },
      { x: 1, y: 1 },
      { x: 4, y: 1 },
      { x: 4, y: 0 },
    ];
    const before = structuredClone(clockwise);

    const result = triangulate_polygon(clockwise);

    expect(indexed_area(result)).toBe(7);
    expect(clockwise).toEqual(before);
    expect(result.vertices).not.toBe(clockwise);
  });

  it("rejects malformed polygons through the shared polygon contract", () => {
    expect(() =>
      triangulate_polygon([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toThrow(RangeError);
  });

  it("handles boundary points while preserving the polygon area", () => {
    const result = triangulate_polygon([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 4 },
      { x: 2, y: 2 },
      { x: 0, y: 4 },
    ]);

    expect(indexed_area(result)).toBe(12);
  });

  it("rejects degenerate and self-intersecting polygons before triangulation", () => {
    expect(() =>
      triangulate_polygon([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]),
    ).toThrow(/area/i);
    expect(() =>
      triangulate_polygon([
        { x: 0, y: 0 },
        { x: 2, y: 2 },
        { x: 0, y: 2 },
        { x: 2, y: 0 },
      ]),
    ).toThrow(/self-intersect/i);
  });
});
