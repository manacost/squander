import { describe, expect, it, vi } from "vitest";
import { create_random } from "./random.js";

describe("random source", () => {
  it("produces a stable sequence for a numeric seed", () => {
    const first = create_random({ seed: 42 });
    const second = create_random({ seed: 42 });

    expect([first.next_u32(), first.next_u32(), first.next_u32()]).toEqual([
      2_837_322_924, 544_945_897, 479_756_282,
    ]);
    expect([second.next_u32(), second.next_u32(), second.next_u32()]).toEqual([
      2_837_322_924, 544_945_897, 479_756_282,
    ]);
  });

  it("keeps floats in the half-open unit interval", () => {
    const random = create_random({ seed: "unit-test" });

    for (let index = 0; index < 100; index += 1) {
      const value = random.next_float();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("returns integers inside the requested half-open range", () => {
    const random = create_random({ seed: 7 });

    for (let index = 0; index < 100; index += 1) {
      const value = random.next_int(-10, 10);
      expect(value).toBeGreaterThanOrEqual(-10);
      expect(value).toBeLessThan(10);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("rejects invalid integer ranges", () => {
    const random = create_random({ seed: 1 });

    expect(() => random.next_int(1, 1)).toThrow(/upper bound/i);
    expect(() => random.next_int(2, 1)).toThrow(/upper bound/i);
    expect(() => random.next_int(0, Number.POSITIVE_INFINITY)).toThrow(/safe integers/i);
    expect(() => random.next_int(0, uint32_plus_one)).toThrow(/unsigned 32-bit/i);
  });

  it("recreates a sequence from a snapshot", () => {
    const random = create_random({ seed: 123 });
    random.next_u32();
    const state = random.snapshot();
    const continuation = [random.next_u32(), random.next_u32(), random.next_u32()];
    const restored = create_random({ state });

    expect([restored.next_u32(), restored.next_u32(), restored.next_u32()]).toEqual(continuation);
    expect(state.algorithm).toBe("xoshiro128**");
  });

  it("does not implicitly use Math.random for an unseeded source", () => {
    const math_random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Math.random must not seed the random source");
    });
    const random = create_random();
    expect(random.next_u32()).toBeTypeOf("number");
    math_random.mockRestore();
  });
});

const uint32_plus_one = 0x1_0000_0001;
