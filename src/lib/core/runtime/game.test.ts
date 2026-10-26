import { describe, expect, it } from "vitest";
import { create_game, GameDisposedError, GameInitializationError, GameRuntimeError } from "./game.js";
import { type FrameScheduler } from "./frame_loop.js";

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
    tick() {
      const entry = callbacks.entries().next();
      if (entry.done) {
        throw new Error("no scheduled frame");
      }
      callbacks.delete(entry.value[0]);
      entry.value[1]();
    },
    pending: () => callbacks.size,
    advance: (seconds: number) => {
      now_seconds += seconds;
    },
  };
};

describe("[game-lifecycle] game setup", () => {
  it("does not start callbacks until asynchronous setup succeeds", async () => {
    const scheduler = create_scheduler();
    let resolve_setup!: () => void;
    const setup = new Promise<void>((resolve) => {
      resolve_setup = resolve;
    });
    let updates = 0;
    const game = create_game({
      scheduler: scheduler.scheduler,
      setup: async () => setup,
      update: () => {
        updates += 1;
      },
      draw: () => undefined,
    });

    expect(game.get_state()).toBe("initializing");
    expect(scheduler.pending()).toBe(0);
    resolve_setup();
    await game.ready;
    expect(scheduler.pending()).toBe(1);
    scheduler.tick();
    expect(updates).toBe(1);
  });

  it("disposes setup before completion and prevents a late start", async () => {
    const scheduler = create_scheduler();
    let resolve_setup!: () => void;
    const setup = new Promise<void>((resolve) => {
      resolve_setup = resolve;
    });
    const game = create_game({
      scheduler: scheduler.scheduler,
      setup: async () => setup,
      update: () => undefined,
      draw: () => undefined,
    });
    const dispose = game.dispose();
    resolve_setup();

    await expect(game.ready).rejects.toBeInstanceOf(GameDisposedError);
    await expect(dispose).resolves.toBeUndefined();
    expect(scheduler.pending()).toBe(0);
    expect(game.dispose()).toBe(dispose);
  });

  it("wraps setup and callback failures while retaining disposal", async () => {
    const scheduler = create_scheduler();
    const initialization_errors: unknown[] = [];
    const failed = create_game({
      scheduler: scheduler.scheduler,
      setup: () => {
        throw new Error("setup failed");
      },
      update: () => undefined,
      draw: () => undefined,
      on_error: (error) => initialization_errors.push(error),
    });
    await expect(failed.ready).rejects.toBeInstanceOf(GameInitializationError);
    expect(initialization_errors[0]).toBeInstanceOf(GameInitializationError);

    const runtime_errors: unknown[] = [];
    const running = create_game({
      scheduler: scheduler.scheduler,
      update: () => {
        throw new Error("update failed");
      },
      draw: () => undefined,
      on_error: (error) => runtime_errors.push(error),
    });
    await running.ready;
    scheduler.tick();
    expect(runtime_errors[0]).toBeInstanceOf(GameRuntimeError);
    expect(running.get_state()).toBe("stopped");
    await running.dispose();
  });
});
