import { describe, expect, it } from "vitest";
import { create_game, GameDeviceLostError, GameDisposedError, GameInitializationError, GameRuntimeError } from "./game.js";
import { type FrameScheduler } from "./frame_loop.js";
import type { GeometryHandle } from "./geometry_ownership.js";
import type { ResourceHandle } from "./resource_ownership.js";

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
  it("applies controls requested before setup completes", async () => {
    const scheduler = create_scheduler();
    let resolve_setup!: () => void;
    const setup = new Promise<void>((resolve) => {
      resolve_setup = resolve;
    });
    let updates = 0;
    let draws = 0;
    const game = create_game({
      scheduler: scheduler.scheduler,
      setup: async () => setup,
      update: () => {
        updates += 1;
      },
      draw: () => {
        draws += 1;
      },
    });

    game.pause();
    game.set_visibility(false);
    resolve_setup();
    await game.ready;
    expect(game.get_state()).toBe("hidden");
    game.set_visibility(true);
    expect(game.get_state()).toBe("paused");
    scheduler.tick();
    expect(updates).toBe(0);
    expect(draws).toBe(1);
    game.resume();
    scheduler.advance(0.05);
    scheduler.tick();
    expect(updates).toBe(1);
    expect(draws).toBe(2);
    await game.dispose();
  });

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

  it("owns setup geometry and invalidates it when the game is disposed", async () => {
    const scheduler = create_scheduler();
    let handle!: GeometryHandle;
    const game = create_game({
      scheduler: scheduler.scheduler,
      setup: ({ geometry }) => {
        handle = geometry.create({ vertices: [{ x: 0, y: 0 }], indices: [0, 0, 0] });
      },
      update: () => undefined,
      draw: () => undefined,
    });
    await game.ready;
    await game.dispose();
    expect(() => handle.read(game.geometry)).toThrow("geometry owner is disposed");
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

  it("releases setup resources when initialization fails", async () => {
    const scheduler = create_scheduler();
    let destroyed = 0;
    let handle!: ResourceHandle<string>;
    const failed = create_game({
      scheduler: scheduler.scheduler,
      setup: ({ resources }) => {
        handle = resources.acquire("asset", () => {
          destroyed += 1;
        });
        throw new Error("asset setup failed");
      },
      update: () => undefined,
      draw: () => undefined,
    });

    await expect(failed.ready).rejects.toBeInstanceOf(GameInitializationError);
    expect(destroyed).toBe(1);
    expect(() => handle.read()).toThrow("resource handle is released");
    await failed.dispose();
  });

  it("supports repeated disposal while running", async () => {
    const scheduler = create_scheduler();
    const game = create_game({ scheduler: scheduler.scheduler, update: () => undefined, draw: () => undefined });
    await game.ready;
    const first = game.dispose();
    expect(game.dispose()).toBe(first);
    await first;
    expect(game.get_state()).toBe("disposed");
    expect(scheduler.pending()).toBe(0);
  });

  it("stops with a distinct device-loss error", async () => {
    const scheduler = create_scheduler();
    let lose_device!: (cause: unknown) => void;
    const device_lost = new Promise<unknown>((resolve) => {
      lose_device = resolve;
    });
    const errors: unknown[] = [];
    const game = create_game({
      scheduler: scheduler.scheduler,
      device_lost,
      update: () => undefined,
      draw: () => undefined,
      on_error: (error) => errors.push(error),
    });

    await game.ready;
    lose_device(new Error("device removed"));
    await Promise.resolve();
    expect(errors[0]).toBeInstanceOf(GameDeviceLostError);
    expect(game.get_state()).toBe("stopped");
    await game.dispose();
  });

  it("exposes a typed manifest cache through setup and disposes it with the game", async () => {
    let destroyed = 0;
    const game = create_game({
      scheduler: create_scheduler().scheduler,
      manifest: {
        hero: {
          load: async () => "hero-texture",
          destroy: () => {
            destroyed += 1;
          },
        },
      },
      setup: async ({ assets }) => {
        const hero = await assets.load("hero");
        expect(hero.read()).toBe("hero-texture");
      },
      update: () => undefined,
      draw: () => undefined,
    });

    await game.ready;
    expect(game.assets.load).toBeTypeOf("function");
    await game.dispose();
    expect(destroyed).toBe(1);
  });
});
