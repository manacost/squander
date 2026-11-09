import { describe, expect, it } from "vitest";
import { create_game, GameRuntimeError } from "./game.js";
import { create_resource_owner } from "./resource_ownership.js";
import { calculate_responsive_viewport } from "./viewport_sizing.js";
import { create_signal } from "../../signals/signal.js";
import { create_scene_event_bus, type SceneEventBus } from "./scene.js";
import type { InputEvent } from "./input.js";
import type { WebGpuRenderer } from "./webgpu_renderer.js";

const create_renderer = (): WebGpuRenderer => {
  const owner = create_resource_owner();
  const viewport = calculate_responsive_viewport({ css_width: 1, css_height: 1, device_pixel_ratio: 1 });
  const empty_draw = (): Promise<Uint8Array> => Promise.resolve(new Uint8Array());
  const texture = () => ({
    resource: owner.acquire({} as GPUTexture, () => undefined),
    width: 1,
    height: 1,
    filtering: { magnification: "linear", minification: "linear" } as const,
    release: () => undefined,
  });
  return {
    clear: empty_draw,
    create_texture: () => texture(),
    create_texture_from_image: () => texture(),
    create_texture_from_blob: () => Promise.resolve(texture()),
    create_font_from_url: () =>
      Promise.resolve({
        family: "test",
        size: 16,
        atlas: texture(),
        atlas_width: 1,
        atlas_height: 1,
        prepare: () => undefined,
        get_glyph: () => ({ character: "A", x: 0, y: 0, width: 1, height: 1, advance: 1, baseline: 0 }),
        get_glyph_texture: () => texture(),
        release: () => undefined,
      }),
    draw_texture: empty_draw,
    draw_textures: empty_draw,
    draw_text: empty_draw,
    draw_commands: empty_draw,
    resize: () => undefined,
    get_viewport: () => viewport,
    dispose: owner.dispose,
  };
};

const create_scheduler = () => {
  let now = 0;
  let next_handle = 0;
  const callbacks = new Map<number, () => void>();
  return {
    scheduler: {
      request_frame: (callback: () => void) => {
        const handle = next_handle++;
        callbacks.set(handle, callback);
        return handle;
      },
      cancel_frame: (handle: unknown) => callbacks.delete(handle as number),
      now_seconds: () => now,
    },
    tick: () => {
      const entry = callbacks.entries().next();
      if (entry.done) throw new Error("no scheduled frame");
      callbacks.delete(entry.value[0]);
      entry.value[1]();
    },
    advance: (seconds: number) => {
      now += seconds;
    },
    pending: () => callbacks.size,
  };
};

const create_test_game = (on_error?: (error: unknown) => void) => {
  const clock = create_scheduler();
  const game = create_game({
    renderer: { canvas: {} as HTMLCanvasElement, width: 1, height: 1 },
    renderer_factory: () => Promise.resolve(create_renderer()),
    scheduler: clock.scheduler,
    update: () => undefined,
    draw: () => undefined,
    on_error,
  });
  return { game, clock };
};

const key_down = (key: string): InputEvent => ({
  type: "key",
  phase: "down",
  key,
  code: key,
  repeat: false,
  modifiers: { alt: false, ctrl: false, meta: false, shift: false },
});

describe("[scene-lifecycle] game-owned scene composer", () => {
  it("registers scene input on activation and removes it before scene teardown completes", async () => {
    const calls: string[] = [];
    const { game } = create_test_game();
    await game.ready;
    const base = await game.scenes.mount(() => ({
      name: "base input",
      input: (event) => {
        calls.push(`base:${event.type}`);
        return "consume";
      },
    }));
    const overlay = await game.scenes.mount(() => ({
      name: "overlay input",
      input: (event) => {
        calls.push(`overlay:${event.type}`);
        return "consume";
      },
    }));

    expect(game.input.dispatch(key_down("Escape"))).toBe("consume");
    expect(calls).toEqual(["overlay:key"]);

    await game.scenes.remove(overlay);
    expect(game.input.dispatch(key_down("Escape"))).toBe("consume");
    expect(calls).toEqual(["overlay:key", "base:key"]);

    await game.scenes.remove(base);
    expect(game.input.dispatch(key_down("Escape"))).toBe("pass");
    expect(calls).toEqual(["overlay:key", "base:key"]);
    await game.dispose();
  });

  it("routes scene input before global handlers registered during game setup", async () => {
    const calls: string[] = [];
    const game = create_game({
      renderer: { canvas: {} as HTMLCanvasElement, width: 1, height: 1 },
      renderer_factory: () => Promise.resolve(create_renderer()),
      scheduler: create_scheduler().scheduler,
      update: () => undefined,
      draw: () => undefined,
      setup: ({ input }) => {
        input.on_global(() => {
          calls.push("global");
          return "consume";
        });
      },
    });
    await game.ready;
    await game.scenes.mount(() => ({
      name: "passing input",
      input: () => {
        calls.push("scene");
        return "pass";
      },
    }));

    expect(game.input.dispatch(key_down("Space"))).toBe("consume");
    expect(calls).toEqual(["scene", "global"]);
    await game.dispose();
  });

  it("loads typed required dependencies into an owned scene scope", async () => {
    const loads: string[] = [];
    const destroys: string[] = [];
    const game = create_game({
      renderer: { canvas: {} as HTMLCanvasElement, width: 1, height: 1 },
      renderer_factory: () => Promise.resolve(create_renderer()),
      scheduler: create_scheduler().scheduler,
      manifest: {
        hero: {
          load: async () => {
            loads.push("hero");
            return "hero-resource";
          },
          destroy: (resource: string) => destroys.push(resource),
        },
      },
      update: () => undefined,
      draw: () => undefined,
    });
    await game.ready;

    let loaded!: string;
    const handle = await game.scenes.mount(() => ({
      name: "asset scene",
      dependencies: { hero: "hero" },
      init: ({ assets }) => {
        loaded = assets.get("hero").read();
      },
    }));

    expect(loaded).toBe("hero-resource");
    expect(loads).toEqual(["hero"]);
    await game.scenes.remove(handle);
    expect(destroys).toEqual([]);
    await game.dispose();
    expect(destroys).toEqual(["hero-resource"]);
  });

  it("rejects missing, aborted, and disposed scene asset access", async () => {
    const game = create_test_game().game;
    await game.ready;
    const aborted = new AbortController();
    aborted.abort();
    let scope!: { get: (key: "hero") => unknown; load: (key: "hero", options: { signal: AbortSignal }) => Promise<unknown> };
    const handle = await game.scenes.mount(() => ({
      name: "asset misuse",
      init: ({ assets }) => {
        scope = assets;
        expect(() => assets.get("hero")).toThrow("has not been loaded");
      },
    }));
    await expect(scope.load("hero", { signal: aborted.signal })).rejects.toThrow("aborted");
    await game.scenes.remove(handle);
    expect(() => scope.get("hero")).toThrow("disposed");
    await game.dispose();
  });

  it("keeps a shared dependency usable after one scene leaves and destroys it once", async () => {
    let loads = 0;
    const destroys: string[] = [];
    const game = create_game({
      renderer: { canvas: {} as HTMLCanvasElement, width: 1, height: 1 },
      renderer_factory: () => Promise.resolve(create_renderer()),
      scheduler: create_scheduler().scheduler,
      manifest: {
        hero: {
          load: async () => {
            loads += 1;
            return "shared-hero";
          },
          destroy: (value: string) => destroys.push(value),
        },
      },
      update: () => undefined,
      draw: () => undefined,
    });
    await game.ready;
    let surviving_value = "";
    const first = await game.scenes.mount(() => ({ name: "first", dependencies: { hero: "hero" } }));
    const second = await game.scenes.mount(() => ({
      name: "second",
      dependencies: { hero: "hero" },
      init: ({ assets }) => {
        surviving_value = assets.get("hero").read();
      },
    }));
    await game.scenes.remove(first);
    expect(surviving_value).toBe("shared-hero");
    await game.scenes.remove(second);
    expect(loads).toBe(1);
    expect(destroys).toEqual([]);
    await game.dispose();
    expect(destroys).toEqual(["shared-hero"]);
  });

  it("retries a failed required dependency without mounting a partial scene", async () => {
    let attempts = 0;
    const game = create_game({
      renderer: { canvas: {} as HTMLCanvasElement, width: 1, height: 1 },
      renderer_factory: () => Promise.resolve(create_renderer()),
      scheduler: create_scheduler().scheduler,
      manifest: {
        hero: {
          load: async () => {
            attempts += 1;
            if (attempts === 1) throw new Error("temporary asset failure");
            return "hero-after-retry";
          },
          destroy: () => undefined,
        },
      },
      update: () => undefined,
      draw: () => undefined,
    });
    await game.ready;
    let entered = 0;
    await expect(
      game.scenes.mount(() => ({
        name: "failed asset",
        dependencies: { hero: "hero" },
        enter: () => {
          entered += 1;
        },
      })),
    ).rejects.toThrow("temporary asset failure");
    const handle = await game.scenes.mount(() => ({
      name: "retried asset",
      dependencies: { hero: "hero" },
      enter: () => {
        entered += 1;
      },
    }));
    expect(attempts).toBe(2);
    expect(entered).toBe(1);
    await game.scenes.remove(handle);
    await game.dispose();
  });

  it("clears scene subscriptions when the scene is removed", async () => {
    const signal = create_signal<number>();
    const events: number[] = [];
    const { game } = create_test_game();
    await game.ready;
    const handle = await game.scenes.mount(() => ({
      name: "subscriber",
      init: ({ subscriptions }) => {
        subscriptions.subscribe(signal, (value) => events.push(value));
      },
    }));
    signal.emit(1);
    await game.scenes.remove(handle);
    signal.emit(2);
    expect(events).toEqual([1]);
    await game.dispose();
  });

  it("routes scene signal listener failures into the stopped game runtime", async () => {
    const signal = create_signal<number>();
    const errors: unknown[] = [];
    const { game, clock } = create_test_game((error) => errors.push(error));
    await game.ready;
    await game.scenes.mount(() => ({
      name: "signal failure",
      init: ({ subscriptions }) => {
        subscriptions.subscribe(signal, () => {
          throw new Error("listener failed");
        });
      },
      update: () => {
        signal.emit(1);
      },
    }));
    clock.tick();
    expect(errors[0]).toBeInstanceOf(GameRuntimeError);
    expect(game.get_state()).toBe("stopped");
    await game.dispose();
  });

  it("releases a late lazy asset instead of attaching it to a disposed scene", async () => {
    let resolve_asset!: (value: string) => void;
    const asset = new Promise<string>((resolve) => {
      resolve_asset = resolve;
    });
    const destroys: string[] = [];
    const game = create_game({
      renderer: { canvas: {} as HTMLCanvasElement, width: 1, height: 1 },
      renderer_factory: () => Promise.resolve(create_renderer()),
      scheduler: create_scheduler().scheduler,
      manifest: {
        hero: { load: () => asset, destroy: (value: string) => destroys.push(value) },
      },
      update: () => undefined,
      draw: () => undefined,
    });
    await game.ready;
    const external_signal = new AbortController();
    const load_errors: unknown[] = [];
    const handle = await game.scenes.mount(() => ({
      name: "late asset",
      init: ({ assets }) => {
        void assets.load("hero", { signal: external_signal.signal }).catch((error: unknown) => load_errors.push(error));
      },
    }));
    await Promise.resolve();
    await game.scenes.remove(handle);
    resolve_asset("late");
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(load_errors).toHaveLength(1);
    await game.dispose();
    expect(destroys).toEqual(["late"]);
  });

  it("rejects scene operations before game readiness", async () => {
    const { game } = create_test_game();
    const early_mount = game.scenes.mount(() => ({ name: "too early" }));
    const early_remove = game.scenes.remove({});
    const early_replace = game.scenes.replace({}, () => ({ name: "too early" }));
    await expect(early_mount).rejects.toThrow("not ready");
    await expect(early_remove).rejects.toThrow("not ready");
    await expect(early_replace).rejects.toThrow("not ready");
    await game.scenes.dispose();
    await game.dispose();
  });

  it("mounts scenes atomically and updates and draws them in stack order", async () => {
    const events: string[] = [];
    const { game, clock } = create_test_game();
    await game.ready;

    await game.scenes.mount(() => ({
      name: "base",
      init: () => {
        events.push("base:init");
      },
      enter: () => {
        events.push("base:enter");
      },
      update: () => {
        events.push("base:update");
      },
      draw: () => {
        events.push("base:draw");
      },
      exit: () => {
        events.push("base:exit");
      },
    }));
    await game.scenes.mount(() => ({
      name: "overlay",
      init: () => {
        events.push("overlay:init");
      },
      enter: () => {
        events.push("overlay:enter");
      },
      update: () => {
        events.push("overlay:update");
      },
      draw: () => {
        events.push("overlay:draw");
      },
    }));

    clock.tick();

    expect(events).toEqual([
      "base:init",
      "base:enter",
      "overlay:init",
      "overlay:enter",
      "base:update",
      "overlay:update",
      "base:draw",
      "overlay:draw",
    ]);
    await game.dispose();
  });

  it("runs enter cleanup before exit when a scene is removed", async () => {
    const events: string[] = [];
    const { game } = create_test_game();
    await game.ready;
    const handle = await game.scenes.mount(() => ({
      name: "cleanup scene",
      enter: () => {
        events.push("enter");
        return () => {
          events.push("cleanup");
        };
      },
      exit: () => {
        events.push("exit");
      },
    }));

    await game.scenes.remove(handle);

    expect(events).toEqual(["enter", "cleanup", "exit"]);
    await game.dispose();
  });

  it("honors explicit insertion indexes", async () => {
    const events: string[] = [];
    const { game, clock } = create_test_game();
    await game.ready;
    await game.scenes.mount(() => ({
      name: "last",
      update: () => {
        events.push("last");
      },
    }));
    await game.scenes.mount(
      () => ({
        name: "first",
        update: () => {
          events.push("first");
        },
      }),
      { index: 0 },
    );
    clock.tick();

    expect(events).toEqual(["first", "last"]);
    await game.dispose();
  });

  it("does not activate a scene when setup fails", async () => {
    const events: string[] = [];
    const { game, clock } = create_test_game();
    await game.ready;

    await expect(
      game.scenes.mount(() => {
        events.push("factory");
        return Promise.reject(new Error("setup failed"));
      }),
    ).rejects.toThrow("setup failed");

    clock.tick();
    expect(events).toEqual(["factory"]);
    await game.dispose();
  });

  it("cleans up failed lifecycle hooks and reports them through the game error path", async () => {
    const events: string[] = [];
    const errors: unknown[] = [];
    const { game } = create_test_game((error) => errors.push(error));
    await game.ready;

    await expect(
      game.scenes.mount(() => ({
        name: "failed init",
        init: () => {
          throw new Error("init failed");
        },
        exit: () => {
          events.push("init:exit");
        },
      })),
    ).rejects.toThrow("init failed");
    await expect(
      game.scenes.mount(() => ({
        name: "failed enter",
        enter: () => {
          throw new Error("enter failed");
        },
        exit: () => {
          events.push("enter:exit");
        },
      })),
    ).rejects.toThrow("enter failed");

    expect(events).toEqual(["init:exit", "enter:exit"]);
    expect(errors).toHaveLength(1);
    expect(errors.every((error) => error instanceof GameRuntimeError)).toBe(true);
    await game.dispose();
  });

  it("reports cleanup failures without hiding the setup failure", async () => {
    const errors: unknown[] = [];
    const { game } = create_test_game((error) => errors.push(error));
    await game.ready;
    await expect(
      game.scenes.mount(() => ({
        name: "cleanup failure",
        init: () => {
          throw new Error("setup failure");
        },
        exit: () => Promise.reject(new Error("cleanup failure")),
      })),
    ).rejects.toThrow("setup failure");
    expect(errors).toHaveLength(1);
    await game.dispose();
  });

  it("keeps the old scene when replacement setup fails", async () => {
    const events: string[] = [];
    const { game } = create_test_game();
    await game.ready;
    const handle = await game.scenes.mount(() => ({
      name: "old",
      update: () => {
        events.push("old:update");
      },
    }));

    await expect(game.scenes.replace(handle, () => Promise.reject(new Error("replacement failed")))).rejects.toThrow("replacement failed");
    await game.scenes.remove(handle);
    expect(events).toEqual([]);
    await game.dispose();
  });

  it("preserves the active stack structurally when replacement-stack setup fails fatally", async () => {
    const exits: string[] = [];
    const { game } = create_test_game();
    await game.ready;
    await game.scenes.mount(() => ({
      name: "base",
      exit: () => {
        exits.push("base");
      },
    }));
    await game.scenes.mount(() => ({
      name: "top",
      exit: () => {
        exits.push("top");
      },
    }));

    await expect(game.scenes.replace_stack(() => Promise.reject(new Error("next failed")))).rejects.toThrow("next failed");

    expect(exits).toEqual([]);
    expect(game.get_state()).toBe("stopped");
    await game.dispose();
    expect(exits).toEqual(["base", "top"]);
  });

  it("does not invoke scene callbacks while an asynchronous stack replacement is tearing down", async () => {
    const events: string[] = [];
    let finish_cleanup!: () => void;
    let cleanup_started!: () => void;
    const cleanup = new Promise<void>((resolve) => {
      finish_cleanup = resolve;
    });
    const cleanup_has_started = new Promise<void>((resolve) => {
      cleanup_started = resolve;
    });
    const { game, clock } = create_test_game();
    await game.ready;
    await game.scenes.mount(() => ({
      name: "old",
      enter: () => () => {
        cleanup_started();
        return cleanup;
      },
      update: () => {
        events.push("old:update");
      },
      draw: () => {
        events.push("old:draw");
      },
    }));

    const replacement = game.scenes.replace_stack(() => ({
      name: "new",
      update: () => {
        events.push("new:update");
      },
      draw: () => {
        events.push("new:draw");
      },
    }));
    await cleanup_has_started;
    clock.tick();

    expect(events).toEqual([]);
    finish_cleanup();
    await replacement;
    clock.tick();

    expect(events).toEqual(["new:update", "new:draw"]);
    await game.dispose();
  });

  it("replaces an active scene only after the new scene is ready", async () => {
    const events: string[] = [];
    const { game, clock } = create_test_game();
    await game.ready;
    const original = await game.scenes.mount(() => ({
      name: "original",
      update: () => {
        events.push("original:update");
      },
      exit: () => {
        events.push("original:exit");
      },
    }));

    const replacement = await game.scenes.replace(original, () => ({
      name: "replacement",
      update: () => {
        events.push("replacement:update");
      },
    }));
    clock.tick();

    expect(replacement).not.toBe(original);
    expect(events).toEqual(["original:exit", "replacement:update"]);
    await game.dispose();
  });

  it("rejects malformed definitions and operations after disposal", async () => {
    const { game } = create_test_game();
    await game.ready;
    await expect(game.scenes.mount(() => ({ name: "" }))).rejects.toThrow("non-empty name");
    await expect(game.scenes.mount(() => null as never)).rejects.toThrow("non-empty name");
    await game.scenes.dispose();
    await expect(game.scenes.mount(() => ({ name: "late" }))).rejects.toThrow("disposed");
    await expect(game.scenes.remove({})).rejects.toThrow("disposed");
    await game.scenes.dispose();
    await game.dispose();
  });

  it("rejects replacement with a handle from another composer", async () => {
    const first = create_test_game();
    const second = create_test_game();
    await Promise.all([first.game.ready, second.game.ready]);
    const handle = await first.game.scenes.mount(() => ({ name: "first" }));

    await expect(second.game.scenes.replace(handle, () => ({ name: "wrong" }))).rejects.toThrow();
    await Promise.all([first.game.dispose(), second.game.dispose()]);
  });

  it("rejects a replacement that loses its original handle while preparing", async () => {
    const { game } = create_test_game();
    await game.ready;
    const original = await game.scenes.mount(() => ({ name: "original" }));
    let resolve_definition!: (definition: { name: string }) => void;
    const pending_definition = new Promise<{ name: string }>((resolve) => {
      resolve_definition = resolve;
    });
    const replacement = game.scenes.replace(original, () => pending_definition);
    await game.scenes.remove(original);
    resolve_definition({ name: "replacement" });

    await expect(replacement).rejects.toThrow("no longer active");
    await game.dispose();
  });

  it("reports cleanup failures from queued mutations", async () => {
    const { game, clock } = create_test_game();
    await game.ready;
    let removal!: Promise<void>;
    const handle = await game.scenes.mount(() => ({
      name: "string failure",
      update: () => {
        removal = game.scenes.remove(handle);
      },
      exit: () => Promise.reject(new Error("cleanup failed")),
    }));

    clock.tick();
    clock.tick();
    await expect(removal).rejects.toThrow("cleanup failed");
    await game.dispose();
  });

  it("cancels a scene while init is pending", async () => {
    const { game } = create_test_game();
    await game.ready;
    let resolve_init!: () => void;
    const pending_init = new Promise<void>((resolve) => {
      resolve_init = resolve;
    });
    const mount = game.scenes.mount(() => ({ name: "pending init", init: () => pending_init }));
    await Promise.resolve();
    await game.dispose();
    resolve_init();

    await expect(mount).rejects.toThrow("initialization was disposed");
  });

  it("cancels a scene while enter is pending", async () => {
    const { game } = create_test_game();
    await game.ready;
    let resolve_enter!: () => void;
    const pending_enter = new Promise<void>((resolve) => {
      resolve_enter = resolve;
    });
    const mount = game.scenes.mount(() => ({ name: "pending enter", enter: () => pending_enter }));
    await Promise.resolve();
    await Promise.resolve();
    await game.dispose();
    resolve_enter();

    await expect(mount).rejects.toThrow("entry was disposed");
  });

  it("disposes a mount that is queued when the composer is disposed", async () => {
    const { game, clock } = create_test_game();
    await game.ready;
    let mount!: Promise<Readonly<object>>;
    await game.scenes.mount(() => ({
      name: "queueing scene",
      update: () => {
        mount = game.scenes.mount(() => ({ name: "late scene" }));
      },
    }));

    clock.tick();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await game.scenes.dispose();
    await expect(mount).rejects.toThrow("disposed before activation");
    await game.dispose();
  });

  it("queues removal requested during update until the next frame", async () => {
    const events: string[] = [];
    const { game, clock } = create_test_game();
    await game.ready;
    let removal!: Promise<void>;
    const handle = await game.scenes.mount(() => ({
      name: "temporary",
      update: () => {
        events.push("update");
        removal = game.scenes.remove(handle).then(() => {
          events.push("removed");
        });
      },
      draw: () => {
        events.push("draw");
      },
      exit: () => {
        events.push("exit");
      },
    }));

    clock.tick();
    expect(events).toEqual(["update", "draw"]);
    clock.tick();
    await removal;
    expect(events).toEqual(["update", "draw", "exit", "removed"]);
    await game.dispose();
  });

  it("routes scene callback failures through the game runtime error", async () => {
    const errors: unknown[] = [];
    const { game, clock } = create_test_game((error) => errors.push(error));
    await game.ready;
    await game.scenes.mount(() => ({
      name: "broken",
      update: () => {
        throw new Error("scene update failed");
      },
    }));

    clock.tick();

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(GameRuntimeError);
    expect((errors[0] as GameRuntimeError).cause).toBeInstanceOf(Error);
    await game.dispose();
  });

  it("disposes all scenes and prevents late setup from activating", async () => {
    const events: string[] = [];
    const { game } = create_test_game();
    await game.ready;
    let resolve_factory!: (definition: { name: string; enter: () => void }) => void;
    const pending = new Promise<{ name: string; enter: () => void }>((resolve) => {
      resolve_factory = resolve;
    });
    const mount = game.scenes.mount(() => pending);
    await game.dispose();
    resolve_factory({
      name: "late",
      enter: () => {
        events.push("enter");
      },
    });

    await expect(mount).rejects.toThrow();
    expect(events).toEqual([]);
  });

  it("routes disposal exit failures through the game error path", async () => {
    const errors: unknown[] = [];
    const { game } = create_test_game((error) => errors.push(error));
    await game.ready;
    await game.scenes.mount(() => ({
      name: "dispose failure",
      exit: () => Promise.reject(new Error("dispose exit failed")),
    }));
    await game.scenes.dispose();
    expect(errors.some((error) => error instanceof GameRuntimeError)).toBe(true);
    await game.dispose();
  });

  it("does not accept a handle from another composer", async () => {
    const first = create_test_game();
    const second = create_test_game();
    await Promise.all([first.game.ready, second.game.ready]);
    const handle = await first.game.scenes.mount(() => ({ name: "first" }));

    await expect(second.game.scenes.remove(handle)).rejects.toThrow();
    await Promise.all([first.game.dispose(), second.game.dispose()]);
  });

  it("dispatches typed scene events in registration order and supports once/off", () => {
    type Events = { score: { points: number }; reset: undefined };
    const bus: SceneEventBus<Events> = create_scene_event_bus();
    const received: string[] = [];
    const first = bus.on("score", ({ points }) => received.push(`first:${String(points)}`));
    bus.once("score", ({ points }) => received.push(`once:${String(points)}`));
    bus.on("score", ({ points }) => received.push(`last:${String(points)}`));

    bus.emit("score", { points: 3 });
    first();
    bus.emit("score", { points: 4 });

    expect(received).toEqual(["first:3", "once:3", "last:3", "last:4"]);
  });

  it("dispatches from a stable snapshot, reports listener failures, and clears disposed listeners", () => {
    type Events = { pulse: number };
    const errors: unknown[] = [];
    const bus = create_scene_event_bus<Events>((cause) => errors.push(cause));
    const received: number[] = [];
    const unsubscribe = bus.on("pulse", (value) => {
      received.push(value);
      unsubscribe();
      bus.on("pulse", (next_value) => received.push(next_value));
      throw new Error("listener failed");
    });

    bus.emit("pulse", 1);
    bus.emit("pulse", 2);
    bus.clear();
    bus.emit("pulse", 3);

    expect(received).toEqual([1, 2]);
    expect(errors).toHaveLength(1);
  });

  it("does not invoke a pending listener removed earlier in the same dispatch", () => {
    type Events = { pulse: number };
    const bus = create_scene_event_bus<Events>();
    const received: string[] = [];
    let unsubscribe_second = (): void => undefined;
    bus.on("pulse", () => {
      received.push("first");
      unsubscribe_second();
    });
    unsubscribe_second = bus.on("pulse", () => received.push("second"));
    bus.emit("pulse", 1);
    expect(received).toEqual(["first"]);
  });

  it("clears the game-owned event bus when the game is disposed", async () => {
    const { game } = create_test_game();
    await game.ready;
    let received = 0;
    game.scenes.events.on("pulse", () => {
      received += 1;
    });
    game.scenes.events.emit("pulse", 1);
    await game.dispose();
    game.scenes.events.emit("pulse", 1);
    expect(received).toBe(1);
  });

  it("cleans scene event listeners when the scene is removed", async () => {
    const { game } = create_test_game();
    await game.ready;
    let received = 0;
    const handle = await game.scenes.mount(({ events }) => ({
      name: "event scope",
      enter: () =>
        events.on("pulse", () => {
          received += 1;
        }),
    }));
    game.scenes.events.emit("pulse", 1);
    await game.scenes.remove(handle);
    game.scenes.events.emit("pulse", 1);
    expect(received).toBe(1);
    await game.dispose();
  });

  it("supports scoped once and targeted event cleanup", async () => {
    const { game } = create_test_game();
    await game.ready;
    let scoped_events: SceneEventBus<{ pulse: number }> | undefined;
    let received = 0;
    const handle = await game.scenes.mount(({ events }) => {
      scoped_events = events;
      const callback = (): void => {
        received += 1;
      };
      events.off("pulse", callback);
      events.off("pulse");
      events.on("pulse", callback);
      events.off("pulse", callback);
      events.off("pulse", callback);
      events.once("pulse", () => {
        received += 10;
      });
      return { name: "scoped events" };
    });
    scoped_events?.emit("pulse", 1);
    scoped_events?.emit("pulse", 1);
    expect(received).toBe(10);
    await game.scenes.remove(handle);
    scoped_events?.clear();
    await game.dispose();
  });

  it("makes post-clear subscriptions inert and supports clearing one event name", () => {
    type Events = { pulse: number; reset: undefined };
    const bus = create_scene_event_bus<Events>();
    const received: number[] = [];
    const callback = (value: number): void => {
      received.push(value);
    };
    bus.on("pulse", callback);
    bus.off("pulse", callback);
    bus.off("pulse");
    bus.emit("pulse", 1);
    bus.emit("reset", undefined);
    bus.clear();
    bus.on("pulse", (value) => received.push(value));
    bus.emit("pulse", 2);
    expect(received).toEqual([]);
  });

  it("makes disposed asset and subscription scopes idempotent", async () => {
    const { game } = create_test_game();
    await game.ready;
    let assets: { get: (key: never) => never; dispose: () => void } | undefined;
    let unsubscribe: (() => void) | undefined;
    const signal = create_signal<number>();
    const handle = await game.scenes.mount(({ assets: next_assets, subscriptions }) => {
      assets = next_assets as never;
      unsubscribe = subscriptions.subscribe(signal, () => {
        return;
      });
      return { name: "scope" };
    });
    unsubscribe?.();
    unsubscribe?.();
    await game.scenes.remove(handle);
    expect(() => {
      assets?.get("missing" as never);
    }).toThrow();
    assets?.dispose();
    await game.dispose();
  });
});
