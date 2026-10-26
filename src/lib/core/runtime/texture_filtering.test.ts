import { describe, expect, it } from "vitest";
import { resolve_texture_filtering } from "./texture_filtering.js";

describe("[texture-filtering] sampler policy", () => {
  it("defaults to linear and supports independent policies", () => {
    expect(resolve_texture_filtering()).toEqual({ magnification: "linear", minification: "linear" });
    expect(resolve_texture_filtering({ magnification: "nearest", minification: "linear" })).toEqual({
      magnification: "nearest",
      minification: "linear",
    });
  });

  it("uses the shorthand for both directions unless overridden", () => {
    expect(resolve_texture_filtering({ filter: "nearest" })).toEqual({ magnification: "nearest", minification: "nearest" });
    expect(resolve_texture_filtering({ filter: "nearest", minification: "linear" })).toEqual({
      magnification: "nearest",
      minification: "linear",
    });
  });
});
