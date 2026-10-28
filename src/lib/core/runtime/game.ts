import { create_frame_loop, type FrameLoop, type FrameLoopOptions, type FrameLoopState, type FrameScheduler } from "./frame_loop.js";
import { create_resource_owner, type ResourceOwner } from "./resource_ownership.js";
import { create_geometry_owner, type GeometryOwner } from "./geometry_ownership.js";
import { create_asset_cache, type AssetCache, type AssetManifest } from "./asset_loading.js";
import type { UpdateTime } from "./timing.js";

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
  resources: ResourceOwner;
  geometry: GeometryOwner;
  assets: AssetCache<Manifest>;
}>;

export type GameOptions<Manifest extends AssetManifest = AssetManifest> = Readonly<{
  scheduler: FrameScheduler;
  manifest?: Manifest;
  setup?: (context: GameSetupContext<Manifest>) => void | Promise<void>;
  update: (time: UpdateTime) => void;
  draw: () => void;
  device_lost?: PromiseLike<unknown>;
  on_error?: (error: GameDeviceLostError | GameInitializationError | GameRuntimeError) => void;
  max_delta_seconds?: number;
}>;

export type Game<Manifest extends AssetManifest = AssetManifest> = Readonly<{
  ready: Promise<void>;
  resources: ResourceOwner;
  geometry: GeometryOwner;
  assets: AssetCache<Manifest>;
  pause: () => void;
  resume: () => void;
  set_visibility: (visible: boolean) => void;
  dispose: () => Promise<void>;
  get_state: () => FrameLoopState | "initializing";
}>;

const create_loop_options = (options: GameOptions, on_error: (error: unknown) => void): FrameLoopOptions => ({
  scheduler: options.scheduler,
  update: options.update,
  draw: options.draw,
  on_error,
  max_delta_seconds: options.max_delta_seconds,
});

export const create_game = <Manifest extends AssetManifest = AssetManifest>(options: GameOptions<Manifest>): Game<Manifest> => {
  const resources = create_resource_owner();
  const geometry = create_geometry_owner();
  const assets = create_asset_cache((options.manifest ?? {}) as Manifest, resources);
  const abort_controller = new AbortController();
  let loop: FrameLoop | undefined;
  const lifecycle = { disposed: false, manually_paused: false, visible: true };
  let disposal_promise: Promise<void> | undefined;

  const ready = (async (): Promise<void> => {
    try {
      await options.setup?.({ signal: abort_controller.signal, resources, geometry, assets });
      if (lifecycle.disposed || abort_controller.signal.aborted) {
        throw new GameDisposedError();
      }
      loop = create_frame_loop(
        create_loop_options(options, (cause) => {
          if (cause instanceof GameDeviceLostError) {
            options.on_error?.(cause);
            return;
          }
          options.on_error?.(new GameRuntimeError(cause));
        }),
      );
      loop.start();
      if (lifecycle.manually_paused) {
        loop.pause();
      }
      if (!lifecycle.visible) {
        loop.set_visibility(false);
      }
      options.device_lost?.then((cause) => {
        loop?.fail(new GameDeviceLostError(cause));
      });
    } catch (cause) {
      assets.dispose();
      resources.dispose();
      geometry.dispose();
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
      assets.dispose();
      resources.dispose();
      geometry.dispose();
    });
    return disposal_promise;
  };

  const get_state = (): FrameLoopState | "initializing" => loop?.get_state() ?? "initializing";

  return Object.freeze({ ready, resources, geometry, assets, pause, resume, set_visibility, dispose, get_state });
};
