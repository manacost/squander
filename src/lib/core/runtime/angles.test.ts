import { describe, expect, it } from "vitest";
import { degrees } from "./angles.js";

describe("[angles] degree conversion", () => {
  it("converts agreed clockwise radian values", () => {
    expect(degrees(0)).toBe(0);
    expect(degrees(90)).toBeCloseTo(Math.PI / 2);
    expect(degrees(-90)).toBeCloseTo(-Math.PI / 2);
    expect(degrees(360)).toBeCloseTo(Math.PI * 2);
  });

  it("rejects nonfinite values", () => {
    expect(() => degrees(Number.NaN)).toThrow(/finite/i);
    expect(() => degrees(Number.POSITIVE_INFINITY)).toThrow(/finite/i);
  });
});
