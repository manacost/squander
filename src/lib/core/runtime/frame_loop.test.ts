import { describe, expect, it } from "vitest";
import { create_frame_loop, type FrameScheduler } from "./frame_loop.js";

const create_scheduler = () => {
  let now_seconds = 0;
  let next_handle = 0;
  const callbacks = new Map<number, () => void>();
  const scheduler: FrameScheduler = {
    request_frame: (callback) => {
      const handle = next_handle++;
      callbacks.set(handle, callback);
      return handle;
    },
    cancel_frame: (handle) => {
      callbacks.delete(handle as number);
    },
    now_seconds: () => now_seconds,
  };

  return {
    scheduler,
    advance(seconds: number) {
      now_seconds += seconds;
    },
    tick() {
      const callback = callbacks.values().next().value;
      if (typeof callback !== "function") {
        throw new Error("no scheduled frame");
      }
      const handle_result = callbacks.keys().next();
      if (handle_result.done) {
        throw new Error("no scheduled frame");
      }
      const handle = handle_result.value;
      callbacks.delete(handle);
      callback();
    },
    pending() {
      return callbacks.size;
    },
  };
};

describe("[game-lifecycle] frame loop", () => {
  it("updates before drawing and stops drawing after an update failure", () => {
    const scheduler = create_scheduler();
    const events: string[] = [];
    const errors: unknown[] = [];
    const loop = create_frame_loop({
      scheduler: scheduler.scheduler,
      update: () => {
        events.push("update");
        throw new Error("update failed");
      },
      draw: () => events.push("draw"),
      on_error: (error) => errors.push(error),
    });

    loop.start();
    scheduler.tick();

    expect(events).toEqual(["update"]);
    expect(errors).toHaveLength(1);
    expect(loop.get_state()).toBe("stopped");
    expect(scheduler.pending()).toBe(0);
  });

  it("continues drawing while explicitly paused and resets timing on resume", () => {
    const scheduler = create_scheduler();
    const updates: number[] = [];
    let draws = 0;
    const loop = create_frame_loop({
      scheduler: scheduler.scheduler,
      update: (time) => updates.push(time.delta_seconds),
      draw: () => {
        draws += 1;
      },
    });

    loop.start();
    scheduler.tick();
    scheduler.advance(0.05);
    scheduler.tick();
    loop.pause();
    scheduler.advance(10);
    scheduler.tick();
    loop.resume();
    scheduler.advance(0.05);
    scheduler.tick();

    expect(updates).toEqual([0, 0.05, 0]);
    expect(draws).toBe(4);
  });

  it("suspends both callbacks while hidden and makes disposal idempotent", async () => {
    const scheduler = create_scheduler();
    let updates = 0;
    let draws = 0;
    const loop = create_frame_loop({
      scheduler: scheduler.scheduler,
      update: () => {
        updates += 1;
      },
      draw: () => {
        draws += 1;
      },
    });

    loop.start();
    scheduler.tick();
    loop.set_visibility(false);
    expect(scheduler.pending()).toBe(0);
    expect(() => {
      scheduler.tick();
    }).toThrow("no scheduled frame");
    loop.set_visibility(true);
    expect(scheduler.pending()).toBe(1);
    const first_dispose = loop.dispose();
    const second_dispose = loop.dispose();
    await expect(second_dispose).resolves.toBeUndefined();

    expect(first_dispose).toBe(second_dispose);
    expect(updates).toBe(1);
    expect(draws).toBe(1);
    expect(loop.get_state()).toBe("disposed");
  });
});
