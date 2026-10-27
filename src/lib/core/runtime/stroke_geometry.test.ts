import { describe, expect, it } from "vitest";
import { create_stroke_geometry } from "./stroke_geometry.js";

describe("[paths-and-polygons] stroke segment geometry", () => {
  it("centers a flat-capped width-2 segment on its centerline", () => {
    const result = create_stroke_geometry(
      [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          closed: false,
        },
      ],
      2,
    );

    expect(result.vertices).toEqual([
      { x: 0, y: 1 },
      { x: 10, y: 1 },
      { x: 10, y: -1 },
      { x: 0, y: -1 },
    ]);
    expect(result.indices).toEqual([0, 1, 2, 0, 2, 3]);
  });

  it("keeps disconnected subpaths separate and preserves world-unit width", () => {
    const result = create_stroke_geometry(
      [
        {
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 4 },
          ],
          closed: false,
        },
        {
          points: [
            { x: 10, y: 0 },
            { x: 14, y: 0 },
          ],
          closed: false,
        },
      ],
      4,
    );

    expect(result.indices).toHaveLength(12);
    expect(result.vertices).toContainEqual({ x: -2, y: 0 });
    expect(result.vertices).toContainEqual({ x: 10, y: 2 });
  });

  it("rejects invalid widths and ignores zero-length segments", () => {
    expect(() =>
      create_stroke_geometry(
        [
          {
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
            ],
            closed: false,
          },
        ],
        0,
      ),
    ).toThrow(RangeError);
    const result = create_stroke_geometry(
      [
        {
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
            { x: 2, y: 0 },
          ],
          closed: false,
        },
      ],
      2,
    );
    expect(result.vertices).toHaveLength(4);
  });

  it("fills a connected corner with an outer bevel join", () => {
    const result = create_stroke_geometry(
      [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
          ],
          closed: false,
        },
      ],
      2,
    );

    expect(result.indices).toHaveLength(15);
    expect(result.vertices).toContainEqual({ x: 10, y: 1 });
    expect(result.vertices).toContainEqual({ x: 9, y: 0 });
  });
});
