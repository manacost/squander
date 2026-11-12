import { describe, expect, it } from "vitest";
import { close, flatten_path, line_to, move_to } from "./path_flattening.js";
import { triangulate_polygon, triangulate_subpaths } from "./triangulation.js";

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
  it("fills a closed curved subpath with an even-odd hole", () => {
    const outer = flatten_path([move_to(0, 0), line_to(4, 0), line_to(4, 4), line_to(0, 4), close()], 0.1)[0];
    const hole = flatten_path([move_to(1, 1), line_to(1, 3), line_to(3, 3), line_to(3, 1), close()], 0.1)[0];
    const result = triangulate_subpaths([outer, hole]);

    expect(indexed_area(result)).toBe(12);
  });

  it("supports nested even-odd islands and rejects open subpaths", () => {
    const paths = [
      flatten_path([move_to(0, 0), line_to(10, 0), line_to(10, 10), line_to(0, 10), close()], 0.1)[0],
      flatten_path([move_to(2, 2), line_to(2, 8), line_to(8, 8), line_to(8, 2), close()], 0.1)[0],
      flatten_path([move_to(4, 4), line_to(6, 4), line_to(6, 6), line_to(4, 6), close()], 0.1)[0],
    ];

    expect(indexed_area(triangulate_subpaths(paths))).toBe(68);
    expect(() => triangulate_subpaths([flatten_path([move_to(0, 0), line_to(1, 0)], 0.1)[0]])).toThrow(/closed/);
  });

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
