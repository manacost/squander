import { describe, expect, it } from "vitest";
import { assert } from "./assert.js";

describe("assert", () => {
  it("accepts true conditions and reports failed conditions", () => {
    expect(() => {
      assert(true);
    }).not.toThrow();
    expect(() => {
      assert(false);
    }).toThrow("Assertion Failed");
    expect(() => {
      assert(false, "custom message");
    }).toThrow("custom message");
  });
});
