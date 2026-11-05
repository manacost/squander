import { describe, expect, it } from "vitest";
import { create_polygon } from "./polygons.js";

describe("[paths-and-polygons] polygon snapshots", () => {
  it("removes consecutive duplicates and an optional repeated closing point", () => {
    const polygon = create_polygon([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
      { x: 0, y: 0 },
    ]);

    expect(polygon.get_points()).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
    ]);
  });

  it("snapshots caller values and preserves handle identity across valid updates", () => {
    const source = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
    ];
    const polygon = create_polygon(source);
    source[0].x = 100;
    const original_points = polygon.get_points();

    polygon.update([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 4 },
    ]);

    expect(polygon.get_points()).not.toBe(original_points);
    expect(polygon.get_points()).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 0, y: 4 },
    ]);
  });

  it("rejects invalid creation and preserves the last valid update", () => {
    expect(() =>
      create_polygon([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toThrow(/three distinct/i);
    expect(() =>
      create_polygon([
        { x: 0, y: 0 },
        { x: 2, y: 2 },
        { x: 4, y: 4 },
      ]),
    ).toThrow(/area/i);
    expect(() =>
      create_polygon([
        { x: 0, y: 0 },
        { x: 2, y: 2 },
        { x: 0, y: 2 },
        { x: 2, y: 0 },
      ]),
    ).toThrow(/self-intersect/i);

    const polygon = create_polygon([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
    ]);
    expect(() => {
      polygon.update([
        { x: 0, y: 0 },
        { x: Number.NaN, y: 1 },
        { x: 1, y: 0 },
      ]);
    }).toThrow(/finite/i);
    expect(polygon.get_points()).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
    ]);
  });
});
