import { describe, expect, it } from "vitest";
import { hex, hsl, hsla, rgb, rgba, type Color } from "./colors.js";

const expect_color = (actual: Color, expected: Color): void => {
  expect(actual.red).toBeCloseTo(expected.red, 12);
  expect(actual.green).toBeCloseTo(expected.green, 12);
  expect(actual.blue).toBeCloseTo(expected.blue, 12);
  expect(actual.alpha).toBeCloseTo(expected.alpha, 12);
};

describe("[color] shared color helpers", () => {
  it("normalizes equivalent RGB, HSL, and hex authoring forms", () => {
    const expected = rgba(1, 0, 0, 0.5);

    expect_color(rgb(1, 0, 0, 0.5), expected);
    expect_color(hsl(0, 1, 0.5, 0.5), expected);
    expect_color(hsla(360, 1, 0.5, 0.5), expected);
    expect_color(hex("#ff000080"), rgba(1, 0, 0, 128 / 255));
  });

  it("accepts shorthand hex and freezes the returned value", () => {
    const color = hex("#0f08");

    expect_color(color, rgba(0, 1, 0, 0.5333333333333333));
    expect(Object.isFrozen(color)).toBe(true);
  });

  it("rejects invalid channels and formats at construction", () => {
    expect(() => rgb(Number.NaN, 0, 0)).toThrow(/red.*finite/i);
    expect(() => rgba(0, 0, 0, 2)).toThrow(/alpha.*between/i);
    expect(() => hsl(0, -1, 0.5)).toThrow(/saturation.*between/i);
    expect(() => hsl(Number.POSITIVE_INFINITY, 1, 0.5)).toThrow(/hue.*finite/i);
    expect(() => hex("red")).toThrow(/hex/i);
    expect(() => hex("#12345")).toThrow(/hex/i);
  });
});
