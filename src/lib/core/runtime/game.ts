import { create_frame_loop, type FrameLoop, type FrameLoopOptions, type FrameLoopState, type FrameScheduler } from "./frame_loop.js";
import { create_resource_owner, type ResourceOwner } from "./resource_ownership.js";
import { create_geometry_owner, type GeometryOwner } from "./geometry_ownership.js";
import { create_asset_cache, type AssetCache, type AssetManifest } from "./asset_loading.js";
import type { UpdateTime } from "./timing.js";
import { create_webgpu_renderer, type WebGpuRenderer, type WebGpuRendererOptions } from "./webgpu_renderer.js";
import type { ViewportSize } from "./viewport_sizing.js";
import { create_scene_composer, create_scene_event_bus, type SceneComposer, type SceneEventMap } from "./scene.js";
import { create_input_router, type InputRouter } from "./input.js";

export class GameInitializationError extends Error {
  public constructor(cause: unknown) {
    super("game initialization failed", { cause });
    this.name = "GameInitializationError";
  }
}

export class GameRuntimeError extends Error {
  public constructor(cause: unknown) {
    super("game runtime failed", { cause });
    this.name = "GameRuntimeError";
  }
}

export class GameDeviceLostError extends Error {
  public constructor(cause: unknown) {
    super("WebGPU device was lost", { cause });
    this.name = "GameDeviceLostError";
  }
}

export class GameDisposedError extends Error {
  public constructor() {
    super("game was disposed during initialization");
    this.name = "GameDisposedError";
  }
}

export type GameSetupContext<Manifest extends AssetManifest = AssetManifest> = Readonly<{
  signal: AbortSignal;
  renderer: WebGpuRenderer;
  resources: ResourceOwner;
  geometry: GeometryOwner;
  assets: AssetCache<Manifest>;
  input: InputRouter;
}>;

export type RendererFactory = (options: WebGpuRendererOptions) => Promise<WebGpuRenderer>;

export type GameOptions<Manifest extends AssetManifest = AssetManifest> = Readonly<{
  scheduler: FrameScheduler;
  renderer: WebGpuRendererOptions;
  renderer_factory?: RendererFactory;
  manifest?: Manifest;
  setup?: (context: GameSetupContext<Manifest>) => void | Promise<void>;
  update: (time: UpdateTime) => void;
  draw: () => void;
  device_lost?: PromiseLike<unknown>;
  on_error?: (error: GameDeviceLostError | GameInitializationError | GameRuntimeError) => void;
  max_delta_seconds?: number;
}>;

export type Game<Manifest extends AssetManifest = AssetManifest, EventMap extends SceneEventMap = SceneEventMap> = Readonly<{
  ready: Promise<void>;
  readonly renderer: WebGpuRenderer;
  resize: (viewport: ViewportSize) => void;
  get_viewport: () => ViewportSize;
  resources: ResourceOwner;
  geometry: GeometryOwner;
  assets: AssetCache<Manifest>;
  input: InputRouter;
  scenes: SceneComposer<Manifest, EventMap>;
  pause: () => void;
  resume: () => void;
  set_visibility: (visible: boolean) => void;
  dispose: () => Promise<void>;
  get_state: () => FrameLoopState | "initializing";
}>;

const create_loop_options = (
  options: GameOptions,
  on_error: (error: unknown) => void,
  update: (time: UpdateTime) => void = options.update,
  draw: () => void = options.draw,
): FrameLoopOptions => ({
  scheduler: options.scheduler,
  update,
  draw,
  on_error,
  max_delta_seconds: options.max_delta_seconds,
});

function normalize_manifest<Manifest extends AssetManifest>(manifest: Manifest | undefined): Manifest;
function normalize_manifest(manifest: AssetManifest | undefined): AssetManifest {
  return manifest ?? {};
}

export const create_game = <Manifest extends AssetManifest = AssetManifest, EventMap extends SceneEventMap = SceneEventMap>(
  options: GameOptions<Manifest>,
): Game<Manifest, EventMap> => {
  const resources = create_resource_owner();
  const geometry = create_geometry_owner();
  let renderer: WebGpuRenderer | undefined;
  let renderer_disposed = false;
  const renderer_factory = options.renderer_factory ?? create_webgpu_renderer;
  const renderer_ready = Promise.resolve().then(() => renderer_factory(options.renderer));
  const manifest = normalize_manifest(options.manifest);
  const assets = create_asset_cache(manifest, resources, renderer_ready);
  const abort_controller = new AbortController();
  const input = create_input_router({ on_error: (cause) => options.on_error?.(new GameRuntimeError(cause)) });
  let loop: FrameLoop | undefined;
  const scene_events = create_scene_event_bus<EventMap>((cause) => options.on_error?.(new GameRuntimeError(cause)));
  let scene_controller: ReturnType<typeof create_scene_composer<Manifest, EventMap>> | undefined;
  const get_scene_composer = (): SceneComposer<Manifest, EventMap> => {
    if (scene_controller === undefined) throw new Error("game scene composer is not ready");
    return scene_controller.composer;
  };
  const scenes: SceneComposer<Manifest, EventMap> = Object.freeze({
    events: scene_events,
    mount: async (factory, mount_options) => get_scene_composer().mount(factory, mount_options),
    remove: async (scene) => {
      await get_scene_composer().remove(scene);
    },
    replace: async (scene, factory) => get_scene_composer().replace(scene, factory),
    replace_stack: async (factory) => get_scene_composer().replace_stack(factory),
    dispose: async () => {
      await scene_controller?.composer.dispose();
    },
  });
  const lifecycle = { disposed: false, manually_paused: false, visible: true };
  let disposal_promise: Promise<void> | undefined;

  const ready = (async (): Promise<void> => {
    try {
      renderer = await renderer_ready;
      if (lifecycle.disposed || abort_controller.signal.aborted) {
        renderer.dispose();
        renderer_disposed = true;
        renderer = undefined;
        throw new GameDisposedError();
      }
      const active_scene_controller = create_scene_composer({
        signal: abort_controller.signal,
        renderer,
        manifest,
        asset_cache: assets,
        input,
        events: scene_events,
        on_async_error: (cause) => {
          if (loop === undefined) {
            options.on_error?.(new GameRuntimeError(cause));
          } else {
            loop.fail(cause);
          }
        },
      });
      scene_controller = active_scene_controller;
      await options.setup?.({ signal: abort_controller.signal, renderer, resources, geometry, assets, input });
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Setup can dispose the game while awaiting application work.
      if (lifecycle.disposed || abort_controller.signal.aborted) {
        throw new GameDisposedError();
      }
      loop = create_frame_loop(
        create_loop_options(
          options,
          (cause) => {
            if (cause instanceof GameDeviceLostError) {
              options.on_error?.(cause);
              return;
            }
            options.on_error?.(new GameRuntimeError(cause));
          },
          (time) => {
            options.update(time);
            active_scene_controller.update(time);
          },
          () => {
            options.draw();
            active_scene_controller.draw();
          },
        ),
      );
      loop.start();
      if (lifecycle.manually_paused) {
        loop.pause();
      }
      if (!lifecycle.visible) {
        loop.set_visibility(false);
      }
      (options.device_lost ?? renderer.device_lost)?.then((cause) => {
        if (lifecycle.disposed) {
          return;
        }
        loop?.fail(new GameDeviceLostError(cause));
      });
    } catch (cause) {
      await scene_controller?.composer.dispose();
      assets.dispose();
      resources.dispose();
      geometry.dispose();
      if (renderer !== undefined && !renderer_disposed) {
        renderer.dispose();
        renderer_disposed = true;
      }
      renderer = undefined;
      if (cause instanceof GameDisposedError) {
        throw cause;
      }
      const error = new GameInitializationError(cause);
      options.on_error?.(error);
      throw error;
    }
  })();

  const pause = (): void => {
    lifecycle.manually_paused = true;
    loop?.pause();
  };

  const resume = (): void => {
    lifecycle.manually_paused = false;
    loop?.resume();
  };

  const set_visibility = (next_visible: boolean): void => {
    lifecycle.visible = next_visible;
    loop?.set_visibility(next_visible);
  };

  const dispose = (): Promise<void> => {
    if (disposal_promise !== undefined) {
      return disposal_promise;
    }
    lifecycle.disposed = true;
    abort_controller.abort();
    disposal_promise = (loop?.dispose() ?? Promise.resolve()).then(() => {
      return (scene_controller?.composer.dispose() ?? Promise.resolve()).then(() => {
        scene_events.clear();
        input.dispose();
        assets.dispose();
        resources.dispose();
        geometry.dispose();
        return renderer_ready
          .then((resolved_renderer) => {
            if (renderer_disposed) {
              return;
            }
            resolved_renderer.dispose();
            renderer_disposed = true;
            renderer = undefined;
          })
          .catch(() => undefined);
      });
    });
    return disposal_promise;
  };

  const get_state = (): FrameLoopState | "initializing" => loop?.get_state() ?? "initializing";

  const resize = (viewport: ViewportSize): void => {
    if (renderer === undefined) {
      throw new Error("game renderer is not ready");
    }
    renderer.resize(viewport);
  };

  const get_viewport = (): ViewportSize => {
    if (renderer === undefined) {
      throw new Error("game renderer is not ready");
    }
    return renderer.get_viewport();
  };

  return Object.freeze({
    ready,
    get renderer(): WebGpuRenderer {
      if (renderer === undefined) {
        throw new Error("game renderer is not ready");
      }
      return renderer;
    },
    resize,
    get_viewport,
    resources,
    geometry,
    assets,
    input,
    scenes,
    pause,
    resume,
    set_visibility,
    dispose,
    get_state,
  });
};
