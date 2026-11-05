import { describe, expect, it } from "vitest";
import { create_update_clock } from "./timing.js";

describe("[game-timing] update clock", () => {
  it("returns the zero-valued first snapshot and advances the index", () => {
    const clock = create_update_clock();

    expect(clock.sample(10)).toEqual({
      delta_seconds: 0,
      elapsed_seconds: 0,
      update_index: 0,
      measured_delta_seconds: 0,
      delta_was_clamped: false,
    });
    expect(clock.sample(10.25)).toEqual({
      delta_seconds: 0.1,
      elapsed_seconds: 0.1,
      update_index: 1,
      measured_delta_seconds: 0.25,
      delta_was_clamped: true,
    });
  });

  it("resets measurement without resetting accumulated simulation time", () => {
    const clock = create_update_clock({ max_delta_seconds: 1 });
    clock.sample(1);
    clock.sample(2);
    clock.reset(100);

    expect(clock.sample(100.5)).toMatchObject({
      delta_seconds: 0,
      elapsed_seconds: 1,
      update_index: 2,
      measured_delta_seconds: 0,
      delta_was_clamped: false,
    });
    expect(clock.sample(100.75)).toMatchObject({
      delta_seconds: 0.25,
      elapsed_seconds: 1.25,
      update_index: 3,
      measured_delta_seconds: 0.25,
      delta_was_clamped: false,
    });
  });

  it("rejects invalid timing inputs", () => {
    expect(() => create_update_clock({ max_delta_seconds: 0 })).toThrow(RangeError);
    expect(() => create_update_clock({ max_delta_seconds: Number.NaN })).toThrow(RangeError);
    expect(() => create_update_clock().sample(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
