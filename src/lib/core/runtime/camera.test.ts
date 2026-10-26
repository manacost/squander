import { describe, expect, it } from "vitest";
import { create_camera } from "./camera.js";

describe("[camera-2d] camera transforms", () => {
  it("centers the camera position and keeps the default origin centered", () => {
    const camera = create_camera({ viewport: { logical_width: 800, logical_height: 600 } });

    expect(camera.world_to_screen({ x: 0, y: 0 })).toEqual({ x: 400, y: 300 });
    camera.set_position(10, 20);
    expect(camera.world_to_screen({ x: 10, y: 20 })).toEqual({ x: 400, y: 300 });
  });

  it("applies positive zoom and inverse camera rotation", () => {
    const camera = create_camera({ viewport: { logical_width: 100, logical_height: 100 }, zoom: 2, rotation: Math.PI / 2 });
    expect(camera.world_to_screen({ x: 1, y: 0 })).toMatchObject({ x: 50, y: 48 });
  });

  it("answers visibility conservatively for signed bounds", () => {
    const camera = create_camera({ viewport: { logical_width: 100, logical_height: 100 } });

    expect(camera.is_in_view({ x: 50, y: 50, width: -10, height: -10 })).toBe(true);
    expect(camera.is_in_view({ x: 50, y: 0, width: 10, height: 10 })).toBe(true);
    expect(camera.is_in_view({ x: 51, y: 0, width: 10, height: 10 })).toBe(false);
    expect(camera.is_in_view({ x: 200, y: 200, width: 0, height: 0 })).toBe(false);
  });

  it("rejects nonfinite camera and bounds values", () => {
    expect(() => create_camera({ viewport: { logical_width: 1, logical_height: 1 }, x: Number.NaN })).toThrow(RangeError);
    const camera = create_camera({ viewport: { logical_width: 1, logical_height: 1 } });
    expect(() => {
      camera.set_zoom(0);
    }).toThrow(RangeError);
    expect(() => {
      camera.is_in_view({ x: Infinity, y: 0, width: 1, height: 1 });
    }).toThrow(RangeError);
  });
});
