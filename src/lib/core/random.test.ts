import { describe, expect, it, vi } from "vitest";
import { create_random, type RandomState } from "./random.js";

describe("random source", () => {
  it("produces a stable sequence for a numeric seed", () => {
    const first = create_random({ seed: 42 });
    const second = create_random({ seed: 42 });

    expect([first.next_u32(), first.next_u32(), first.next_u32()]).toEqual([2_837_322_924, 544_945_897, 479_756_282]);
    expect([second.next_u32(), second.next_u32(), second.next_u32()]).toEqual([2_837_322_924, 544_945_897, 479_756_282]);
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

  it("rejects unsafe numeric seeds and malformed snapshots", () => {
    expect(() => create_random({ seed: Number.MAX_SAFE_INTEGER + 1 })).toThrow(/safe integers/i);

    const invalid_word_state: RandomState = {
      algorithm: "xoshiro128**",
      state: [uint32_plus_one, 1, 1, 1],
    };
    expect(() => create_random({ state: invalid_word_state })).toThrow(/unsigned 32-bit/i);

    const zero_state: RandomState = { algorithm: "xoshiro128**", state: [0, 0, 0, 0] };
    expect(() => create_random({ state: zero_state })).toThrow(/all zero/i);

    const zero_stream_key_state: RandomState = {
      algorithm: "xoshiro128**",
      state: [1, 1, 1, 1],
      stream_key: [0, 0, 0, 0],
    };
    expect(() => create_random({ state: zero_stream_key_state })).toThrow(/stream key/i);
    expect(() => create_random({ seed: 1, state: create_random({ seed: 2 }).snapshot() })).toThrow(/both seed and state/i);
  });

  it("retries the rejected tail of an integer range", () => {
    const random = create_random({
      state: {
        algorithm: "xoshiro128**",
        state: [1, 2_199_679_431, 1, 1],
      },
    });

    expect(random.next_int(0, 3)).toBeGreaterThanOrEqual(0);
    expect(random.next_int(0, 3)).toBeGreaterThanOrEqual(0);
  });

  it("recreates a sequence from a snapshot", () => {
    const random = create_random({ seed: 123 });
    random.next_u32();
    const state = random.snapshot();
    const continuation = [random.next_u32(), random.next_u32(), random.next_u32()];
    const restored = create_random({ state });

    expect([restored.next_u32(), restored.next_u32(), restored.next_u32()]).toEqual(continuation);
    expect(state.algorithm).toBe("xoshiro128**");
    expect(state.stream_key).toBeDefined();
  });

  it("picks from a nonempty collection and rejects empty collections", () => {
    const random = create_random({ seed: 3 });

    expect(["a", "b", "c"]).toContain(random.pick(["a", "b", "c"]));
    expect(() => random.pick([])).toThrow(/empty collection/i);
  });

  it("shuffles without mutating its input", () => {
    const random = create_random({ seed: 5 });
    const input = ["a", "b", "c", "d"];
    const shuffled = random.shuffle(input);

    expect(input).toEqual(["a", "b", "c", "d"]);
    expect([...shuffled].sort()).toEqual(input);
  });

  it("derives stable labeled streams independent of parent consumption", () => {
    const first_parent = create_random({ seed: 9 });
    const second_parent = create_random({ seed: 9 });
    const first_child = first_parent.fork("loot");
    first_parent.next_u32();
    first_parent.next_u32();
    const second_child = second_parent.fork("loot");

    expect([first_child.next_u32(), first_child.next_u32(), first_child.next_u32()]).toEqual([3_230_577_265, 1_035_892_301, 1_921_574_779]);
    expect([second_child.next_u32(), second_child.next_u32(), second_child.next_u32()]).toEqual([
      3_230_577_265, 1_035_892_301, 1_921_574_779,
    ]);
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
