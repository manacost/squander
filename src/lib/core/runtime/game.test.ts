import { describe, expect, it, vi } from "vitest";
import {
  create_game,
  GameDeviceLostError,
  GameDisposedError,
  GameInitializationError,
  GameRuntimeError,
  type GameOptions,
} from "./game.js";
import { type FrameScheduler } from "./frame_loop.js";
import type { GeometryHandle } from "./geometry_ownership.js";
import type { ResourceHandle } from "./resource_ownership.js";
import { create_resource_owner } from "./resource_ownership.js";
import type { AssetManifest } from "./asset_loading.js";
import type { WebGpuRenderer } from "./webgpu_renderer.js";
import { calculate_fixed_viewport, calculate_responsive_viewport, type ViewportSize } from "./viewport_sizing.js";

const test_renderer_options = { canvas: {} as HTMLCanvasElement, width: 1, height: 1 };

const create_fake_renderer = (): WebGpuRenderer => {
  const owner = create_resource_owner();
  let viewport = calculate_responsive_viewport({ css_width: 1, css_height: 1, device_pixel_ratio: 1 });
  const create_texture = (_pixels: Uint8Array, width: number, height: number) => {
    const resource = owner.acquire({} as GPUTexture, () => undefined);
    return {
      resource,
      width,
      height,
      filtering: { magnification: "linear", minification: "linear" } as const,
      release: resource.release,
    };
  };
  const draw = async () => new Uint8Array();
  return {
    clear: draw,
    create_texture,
    create_texture_from_image: (_image, width, height) => create_texture(new Uint8Array(), width, height),
    create_texture_from_blob: async (_source) => create_texture(new Uint8Array(), 1, 1),
    create_font_from_url: async () => ({
      family: "test",
      size: 16,
      atlas: create_texture(new Uint8Array(), 1, 1),
      atlas_width: 1,
      atlas_height: 1,
      prepare: () => undefined,
      get_glyph: () => ({ character: "A", x: 0, y: 0, width: 1, height: 1, advance: 1, baseline: 0 }),
      get_glyph_texture: () => create_texture(new Uint8Array(), 1, 1),
      release: () => undefined,
    }),
    draw_texture: draw,
    draw_textures: draw,
    draw_text: draw,
    draw_commands: draw,
    resize: (next_viewport: ViewportSize) => {
      viewport = next_viewport;
    },
    get_viewport: () => viewport,
    dispose: owner.dispose,
  };
};

const create_test_game = <Manifest extends AssetManifest = AssetManifest>(
  options: Omit<GameOptions<Manifest>, "renderer" | "renderer_factory">,
) => create_game({ ...options, renderer: test_renderer_options, renderer_factory: async () => create_fake_renderer() });

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
  it("creates the renderer before setup and exposes it through the game", async () => {
    const renderer = create_fake_renderer();
    const factory = vi.fn(async () => renderer);
    let setup_renderer!: WebGpuRenderer;
    const game = create_game({
      renderer: test_renderer_options,
      renderer_factory: factory,
      scheduler: create_scheduler().scheduler,
      setup: ({ renderer: setup_value }) => {
        setup_renderer = setup_value;
      },
      update: () => undefined,
      draw: () => undefined,
    });

    await game.ready;
    expect(factory).toHaveBeenCalledOnce();
    expect(setup_renderer).toBe(renderer);
    expect(game.renderer).toBe(renderer);
    expect(game.get_viewport()).toMatchObject({ logical_width: 1, logical_height: 1 });
    const resized = calculate_fixed_viewport({
      logical_width: 100,
      logical_height: 50,
      css_width: 200,
      css_height: 200,
      device_pixel_ratio: 2,
    });
    game.resize(resized);
    expect(game.get_viewport()).toBe(resized);
    await game.dispose();
  });

  it("disposes a renderer when setup fails", async () => {
    const renderer = create_fake_renderer();
    const dispose = vi.spyOn(renderer, "dispose");
    const game = create_game({
      renderer: test_renderer_options,
      renderer_factory: async () => renderer,
      scheduler: create_scheduler().scheduler,
      setup: () => {
        throw new Error("setup failed");
      },
      update: () => undefined,
      draw: () => undefined,
    });

    await expect(game.ready).rejects.toBeInstanceOf(GameInitializationError);
    expect(dispose).toHaveBeenCalledOnce();
    await game.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("does not start after disposal while setup is already pending", async () => {
    const scheduler = create_scheduler();
    const renderer = create_fake_renderer();
    let resolve_setup_started!: () => void;
    const setup_started = new Promise<void>((resolve) => {
      resolve_setup_started = resolve;
    });
    let resolve_setup!: () => void;
    const setup = new Promise<void>((resolve) => {
      resolve_setup = resolve;
    });
    const game = create_game({
      renderer: test_renderer_options,
      renderer_factory: async () => renderer,
      scheduler: scheduler.scheduler,
      setup: async () => {
        resolve_setup_started();
        await setup;
      },
      update: () => undefined,
      draw: () => undefined,
    });

    await setup_started;
    const disposal = game.dispose();
    resolve_setup();
    await expect(game.ready).rejects.toBeInstanceOf(GameDisposedError);
    await disposal;
    expect(scheduler.pending()).toBe(0);
  });

  it("wraps renderer factory failures as initialization errors", async () => {
    const game = create_game({
      renderer: test_renderer_options,
      renderer_factory: async () => {
        throw new Error("renderer failed");
      },
      scheduler: create_scheduler().scheduler,
      update: () => undefined,
      draw: () => undefined,
    });

    await expect(game.ready).rejects.toBeInstanceOf(GameInitializationError);
    await game.dispose();
  });

  it("does not expose the renderer before readiness", async () => {
    const renderer = create_fake_renderer();
    let resolve_renderer!: (value: WebGpuRenderer) => void;
    const pending_renderer = new Promise<WebGpuRenderer>((resolve) => {
      resolve_renderer = resolve;
    });
    const game = create_game({
      renderer: test_renderer_options,
      renderer_factory: async () => pending_renderer,
      scheduler: create_scheduler().scheduler,
      update: () => undefined,
      draw: () => undefined,
    });

    expect(() => game.renderer).toThrow("game renderer is not ready");
    expect(() => {
      game.resize(calculate_responsive_viewport({ css_width: 1, css_height: 1, device_pixel_ratio: 1 }));
    }).toThrow("game renderer is not ready");
    expect(() => game.get_viewport()).toThrow("game renderer is not ready");
    const disposal = game.dispose();
    resolve_renderer(renderer);
    await expect(game.ready).rejects.toBeInstanceOf(GameDisposedError);
    await disposal;
  });

  it("applies controls requested before setup completes", async () => {
    const scheduler = create_scheduler();
    let resolve_setup!: () => void;
    const setup = new Promise<void>((resolve) => {
      resolve_setup = resolve;
    });
    let updates = 0;
    let draws = 0;
    const game = create_test_game({
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
    const game = create_test_game({
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
    const game = create_test_game({
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
    const game = create_test_game({
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
    const failed = create_test_game({
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
    const running = create_test_game({
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
    const failed = create_test_game({
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
    const game = create_test_game({ scheduler: scheduler.scheduler, update: () => undefined, draw: () => undefined });
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
    const game = create_test_game({
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

  it("observes renderer device loss and ignores teardown loss", async () => {
    const renderer = create_fake_renderer();
    let lose_device!: (cause: unknown) => void;
    const device_lost = new Promise<unknown>((resolve) => {
      lose_device = resolve;
    });
    const renderer_with_loss = { ...renderer, device_lost };
    const errors: unknown[] = [];
    const game = create_game({
      renderer: test_renderer_options,
      renderer_factory: async () => renderer_with_loss,
      scheduler: create_scheduler().scheduler,
      update: () => undefined,
      draw: () => undefined,
      on_error: (error) => errors.push(error),
    });
    await game.ready;
    lose_device(new Error("unexpected device removal"));
    await Promise.resolve();
    expect(errors[0]).toBeInstanceOf(GameDeviceLostError);
    expect(game.get_state()).toBe("stopped");
    await game.dispose();
    expect(errors).toHaveLength(1);
  });

  it("exposes a typed manifest cache through setup and disposes it with the game", async () => {
    let destroyed = 0;
    const game = create_test_game({
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
