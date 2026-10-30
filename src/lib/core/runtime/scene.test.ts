import { describe, expect, it } from "vitest";
import { create_game, GameRuntimeError } from "./game.js";
import { create_resource_owner } from "./resource_ownership.js";
import { calculate_responsive_viewport } from "./viewport_sizing.js";
import { create_signal } from "../signal.js";
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

describe("[scene-lifecycle] game-owned scene composer", () => {
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
      update: () => signal.emit(1),
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
        void assets.load("hero", { signal: external_signal.signal }).catch((error) => load_errors.push(error));
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
    const { game, clock } = create_test_game();
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
});
