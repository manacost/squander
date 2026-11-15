import { describe, expect, it } from "vitest";
import { create_stroke_geometry } from "./stroke_geometry.js";

describe("[paths-and-polygons] stroke segment geometry", () => {
  it("supports square and round open caps", () => {
    const square = create_stroke_geometry(
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
      { cap: "square" },
    );
    expect(square.vertices).toContainEqual({ x: -1, y: 1 });
    expect(square.vertices).toContainEqual({ x: 11, y: -1 });

    const round = create_stroke_geometry(
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
      { cap: "round" },
    );
    expect(round.vertices.length).toBeGreaterThan(square.vertices.length);
    expect(round.indices.length).toBeGreaterThan(square.indices.length);
  });

  it("validates configurable join limits", () => {
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
        1,
        { join: "unsupported" as "miter" },
      ),
    ).toThrow(/join/);
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
        1,
        { miter_limit: 0 },
      ),
    ).toThrow(/miter_limit/);
  });

  it("selects bevel and round joins independently of the default miter", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const bevel = create_stroke_geometry([{ points, closed: false }], 2, { join: "bevel" });
    const round = create_stroke_geometry([{ points, closed: false }], 2, { join: "round" });

    expect(bevel.vertices).toContainEqual({ x: 10, y: 0 });
    expect(bevel.vertices).not.toContainEqual({ x: 11, y: -1 });
    expect(round.vertices.length).toBeGreaterThan(bevel.vertices.length);
    expect(round.indices.length).toBeGreaterThan(bevel.indices.length);
  });

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
    expect(result.vertices).toContainEqual({ x: 10, y: -1 });
    expect(result.vertices).toContainEqual({ x: 11, y: 0 });
    expect(result.vertices).toContainEqual({ x: 11, y: -1 });
  });

  it("joins every corner of a closed subpath, including the wraparound corner", () => {
    const result = create_stroke_geometry(
      [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 0, y: 10 },
            { x: 0, y: 0 },
          ],
          closed: true,
        },
      ],
      2,
    );

    expect(result.indices).toHaveLength(27);
    expect(result.vertices).toContainEqual({ x: 1, y: 0 });
    expect(result.vertices).toContainEqual({ x: 0, y: 1 });
  });

  it("falls back to a bevel when the fixed miter limit would create a spike", () => {
    const result = create_stroke_geometry(
      [
        {
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 0.152, y: 1.736 },
          ],
          closed: false,
        },
      ],
      2,
    );

    expect(result.vertices.some((point) => Math.abs(point.y) > 4)).toBe(false);
    expect(result.vertices).toContainEqual({ x: 10, y: 0 });
  });

  it("skips collinear and degenerate join candidates", () => {
    const collinear = create_stroke_geometry(
      [
        {
          points: [
            { x: 0, y: 0 },
            { x: 2, y: 0 },
            { x: 4, y: 0 },
          ],
          closed: false,
        },
      ],
      2,
    );
    const duplicate = create_stroke_geometry(
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

    expect(collinear.indices).toHaveLength(12);
    expect(duplicate.indices).toHaveLength(6);
  });
});
