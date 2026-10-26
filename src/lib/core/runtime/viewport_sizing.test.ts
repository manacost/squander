import { describe, expect, it } from "vitest";
import { calculate_fixed_viewport, calculate_responsive_viewport } from "./viewport_sizing.js";

describe("[viewport-sizing] logical viewport math", () => {
  it("fits and centers a fixed view without changing logical units", () => {
    expect(
      calculate_fixed_viewport({
        logical_width: 1280,
        logical_height: 720,
        css_width: 1000,
        css_height: 1000,
        device_pixel_ratio: 2,
      }),
    ).toEqual({
      logical_width: 1280,
      logical_height: 720,
      css_width: 1000,
      css_height: 1000,
      physical_width: 2000,
      physical_height: 2000,
      content_width: 1000,
      content_height: 562.5,
      offset_x: 0,
      offset_y: 218.75,
    });
  });

  it("uses CSS dimensions as logical dimensions in responsive mode", () => {
    expect(calculate_responsive_viewport({ css_width: 640, css_height: 360, device_pixel_ratio: 1.5 })).toMatchObject({
      logical_width: 640,
      logical_height: 360,
      physical_width: 960,
      physical_height: 540,
      offset_x: 0,
      offset_y: 0,
    });
  });

  it("rejects invalid dimensions and density", () => {
    expect(() =>
      calculate_fixed_viewport({ logical_width: 0, logical_height: 1, css_width: 1, css_height: 1, device_pixel_ratio: 1 }),
    ).toThrow(RangeError);
    expect(() => calculate_responsive_viewport({ css_width: 1, css_height: 1, device_pixel_ratio: 0 })).toThrow(RangeError);
  });
});
