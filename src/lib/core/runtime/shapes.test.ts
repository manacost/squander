import { describe, expect, it } from "vitest";
import {
  has_drawable_area,
  normalize_rectangle,
  validate_circle,
  validate_line,
  validate_opacity,
  validate_stroke_width,
} from "./shapes.js";

describe("[shape-drawing] primitive validation", () => {
  it("normalizes signed rectangles without changing their geometric area", () => {
    const rectangle = normalize_rectangle({ x: 100, y: 80, width: -30, height: -20 });

    expect(rectangle).toEqual({ left: 70, top: 60, right: 100, bottom: 80, width: 30, height: 20 });
    expect(has_drawable_area(rectangle)).toBe(true);
    expect(has_drawable_area(normalize_rectangle({ x: 0, y: 0, width: 0, height: 1 }))).toBe(false);
  });

  it("validates finite basic geometry and preserves value snapshots", () => {
    const circle = validate_circle({ x: 1, y: 2, radius: 3 });
    const line = validate_line({ from: { x: 0, y: 1 }, to: { x: 2, y: 3 } });

    expect(circle).toEqual({ x: 1, y: 2, radius: 3 });
    expect(line).toEqual({ from: { x: 0, y: 1 }, to: { x: 2, y: 3 } });
    expect(() => validate_circle({ x: 0, y: 0, radius: -1 })).toThrow(RangeError);
    expect(() => validate_line({ from: { x: 0, y: Number.NaN }, to: { x: 1, y: 1 } })).toThrow(RangeError);
  });

  it("validates centered stroke widths and per-draw opacity", () => {
    expect(validate_stroke_width(0)).toBe(0);
    expect(validate_opacity(0.5)).toBe(0.5);
    expect(() => validate_stroke_width(-1)).toThrow(RangeError);
    expect(() => validate_opacity(1.1)).toThrow(RangeError);
  });
});
