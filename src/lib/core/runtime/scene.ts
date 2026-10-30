import type { AssetCache, AssetManifest, AssetResource } from "./asset_loading.js";
import type { ResourceHandle } from "./resource_ownership.js";
import type { UpdateTime } from "./timing.js";
import type { WebGpuRenderer } from "./webgpu_renderer.js";
import type { Signal } from "../signal.js";

export type SceneFactoryContext<Manifest extends AssetManifest = AssetManifest> = Readonly<{
  signal: AbortSignal;
  renderer: WebGpuRenderer;
  manifest: Manifest;
  assets: SceneAssetScope<Manifest>;
  subscriptions: SceneSubscriptions;
}>;

export type SceneSubscriptions = Readonly<{
  subscribe: <Value>(signal: Signal<Value>, callback: (value: Value) => void) => () => void;
  clear: () => void;
}>;

export type SceneDependencies<Manifest extends AssetManifest> = Readonly<{ [Key in keyof Manifest]?: Key }>;

export type SceneAssetScope<Manifest extends AssetManifest> = Readonly<{
  load: <Key extends keyof Manifest>(
    key: Key,
    options?: Readonly<{ signal?: AbortSignal }>,
  ) => Promise<ResourceHandle<AssetResource<Manifest, Key>>>;
  get: <Key extends keyof Manifest>(key: Key) => ResourceHandle<AssetResource<Manifest, Key>>;
  dispose: () => void;
}>;

export type SceneContext<Manifest extends AssetManifest = AssetManifest> = SceneFactoryContext<Manifest>;

export type SceneDefinition<Manifest extends AssetManifest = AssetManifest, Overlay = unknown> = Readonly<{
  name: string;
  overlay?: Overlay;
  dependencies?: SceneDependencies<Manifest>;
  init?: (context: SceneContext<Manifest>) => void | Promise<void>;
  enter?: (context: SceneContext<Manifest>) => void | Promise<void>;
  update?: (time: UpdateTime) => void;
  draw?: () => void;
  exit?: () => void | Promise<void>;
}>;

export type SceneFactory<Manifest extends AssetManifest = AssetManifest, Overlay = unknown> = (
  context: SceneFactoryContext<Manifest>,
) => SceneDefinition<Manifest, Overlay> | Promise<SceneDefinition<Manifest, Overlay>>;

export type SceneHandle = Readonly<object>;

export type SceneComposer<Manifest extends AssetManifest = AssetManifest> = Readonly<{
  mount: (factory: SceneFactory<Manifest>, options?: Readonly<{ index?: number }>) => Promise<SceneHandle>;
  remove: (scene: SceneHandle) => Promise<void>;
  replace: (scene: SceneHandle, factory: SceneFactory<Manifest>) => Promise<SceneHandle>;
  dispose: () => Promise<void>;
}>;

type SceneRecord<Manifest extends AssetManifest> = {
  handle: SceneHandle;
  controller: AbortController;
  context: SceneContext<Manifest>;
  definition: SceneDefinition<Manifest>;
  assets: SceneAssetScope<Manifest>;
  subscriptions: SceneSubscriptions;
};

type SceneComposerOptions<Manifest extends AssetManifest> = Readonly<{
  signal: AbortSignal;
  renderer: WebGpuRenderer;
  manifest: Manifest;
  asset_cache: AssetCache<Manifest>;
  on_async_error: (cause: unknown) => void;
}>;

type PendingMutation = () => Promise<void>;

const scene_error = (message: string): Error => {
  const error = new Error(message);
  error.name = "SceneLifecycleError";
  return error;
};

const assert_definition = <Manifest extends AssetManifest>(definition: unknown): SceneDefinition<Manifest> => {
  if (definition === null || typeof definition !== "object") {
    throw scene_error("scene factory must return a definition with a non-empty name");
  }
  const candidate = definition as { name?: unknown };
  if (typeof candidate.name !== "string" || candidate.name.length === 0) {
    throw scene_error("scene factory must return a definition with a non-empty name");
  }
  return candidate as SceneDefinition<Manifest>;
};

const create_scene_asset_scope = <Manifest extends AssetManifest>(
  cache: AssetCache<Manifest>,
  scene_signal: AbortSignal,
): SceneAssetScope<Manifest> => {
  const handles = new Set<ResourceHandle<unknown>>();
  const loaded = new Map<keyof Manifest, ResourceHandle<unknown>>();
  let disposed = false;

  const load = async <Key extends keyof Manifest>(
    key: Key,
    options: Readonly<{ signal?: AbortSignal }> = {},
  ): Promise<ResourceHandle<AssetResource<Manifest, Key>>> => {
    if (disposed) throw new Error("scene asset scope is disposed");
    if (scene_signal.aborted || options.signal?.aborted) throw new DOMException("scene asset load was aborted", "AbortError");
    const handle = await cache.load(key, { signal: options.signal ?? scene_signal });
    if (disposed || scene_signal.aborted) {
      handle.release();
      throw new Error("scene asset scope was disposed during loading");
    }
    handles.add(handle as ResourceHandle<unknown>);
    loaded.set(key, handle as ResourceHandle<unknown>);
    return handle;
  };

  const get = <Key extends keyof Manifest>(key: Key): ResourceHandle<AssetResource<Manifest, Key>> => {
    if (disposed) throw new Error("scene asset scope is disposed");
    const handle = loaded.get(key);
    if (handle === undefined) throw new Error(`scene asset has not been loaded: ${String(key)}`);
    return handle as ResourceHandle<AssetResource<Manifest, Key>>;
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    for (const handle of handles) handle.release();
    handles.clear();
    loaded.clear();
  };

  return Object.freeze({ load, get, dispose });
};

const create_scene_subscriptions = (on_error: (cause: unknown) => void): SceneSubscriptions => {
  const unsubscriptions = new Set<() => void>();
  const subscribe = <Value>(signal: Signal<Value>, callback: (value: Value) => void): (() => void) => {
    let active = true;
    const unsubscribe = signal.subscribe((value) => {
      try {
        callback(value);
      } catch (cause) {
        on_error(cause);
      }
    });
    const clear_one = (): void => {
      if (!active) return;
      active = false;
      unsubscriptions.delete(clear_one);
      unsubscribe();
    };
    unsubscriptions.add(clear_one);
    return clear_one;
  };
  const clear = (): void => {
    for (const unsubscribe of [...unsubscriptions]) unsubscribe();
  };
  return Object.freeze({ subscribe, clear });
};

type SceneComposerController<Manifest extends AssetManifest = AssetManifest> = Readonly<{
  composer: SceneComposer<Manifest>;
  update: (time: UpdateTime) => void;
  draw: () => void;
}>;

export const create_scene_composer = <Manifest extends AssetManifest = AssetManifest>(
  options: SceneComposerOptions<Manifest>,
): SceneComposerController<Manifest> => {
  const records: SceneRecord<Manifest>[] = [];
  const handles = new Map<SceneHandle, SceneRecord<Manifest>>();
  const pending_mutations: PendingMutation[] = [];
  const parent_abort = new AbortController();
  options.signal.addEventListener(
    "abort",
    () => {
      parent_abort.abort();
    },
    { once: true },
  );
  let disposed = false;
  let in_frame_callback = false;

  const assert_available = (): void => {
    if (disposed) {
      throw scene_error("scene composer is disposed");
    }
  };

  const create_context = (
    controller: AbortController,
    assets: SceneAssetScope<Manifest>,
    subscriptions: SceneSubscriptions,
  ): SceneContext<Manifest> =>
    Object.freeze({
      signal: controller.signal,
      renderer: options.renderer,
      manifest: options.manifest,
      assets,
      subscriptions,
    });

  const create_controller = (): AbortController => {
    const controller = new AbortController();
    const abort = (): void => {
      controller.abort();
    };
    parent_abort.signal.addEventListener("abort", abort, { once: true });
    return controller;
  };

  const is_aborted = (controller: AbortController): boolean => controller.signal.aborted;

  const dispose_record = async (record: SceneRecord<Manifest>, invoke_exit = true): Promise<void> => {
    let exit_error: unknown;
    if (invoke_exit) {
      try {
        await record.definition.exit?.();
      } catch (cause) {
        exit_error = cause;
      }
    }
    record.controller.abort();
    record.assets.dispose();
    record.subscriptions.clear();
    if (exit_error !== undefined) throw exit_error;
  };

  const prepare = async (factory: SceneFactory<Manifest>): Promise<SceneRecord<Manifest>> => {
    assert_available();
    const controller = create_controller();
    const assets = create_scene_asset_scope(options.asset_cache, controller.signal);
    const subscriptions = create_scene_subscriptions(options.on_async_error);
    const context = create_context(controller, assets, subscriptions);
    let definition: SceneDefinition<Manifest> | undefined;
    try {
      definition = assert_definition<Manifest>(await factory(context));
      if (is_aborted(controller)) {
        throw scene_error("scene setup was disposed");
      }
      for (const key of Object.values(definition.dependencies ?? {})) {
        await assets.load(key);
      }
      await definition.init?.(context);
      if (is_aborted(controller)) {
        throw scene_error("scene initialization was disposed");
      }
      const record: SceneRecord<Manifest> = {
        handle: Object.freeze({}),
        controller,
        context,
        definition,
        assets,
        subscriptions,
      };
      await definition.enter?.(context);
      if (is_aborted(controller)) {
        throw scene_error("scene entry was disposed");
      }
      return record;
    } catch (cause) {
      controller.abort();
      assets.dispose();
      subscriptions.clear();
      try {
        await definition?.exit?.();
      } catch (cleanup_error) {
        options.on_async_error(cleanup_error);
      }
      options.on_async_error(cause);
      throw cause;
    }
  };

  const commit_mount = async (record: SceneRecord<Manifest>, index: number | undefined): Promise<void> => {
    if (parent_abort.signal.aborted) {
      await dispose_record(record);
      throw scene_error("scene mount was disposed before activation");
    }
    const bounded_index = index === undefined ? records.length : Math.max(0, Math.min(index, records.length));
    records.splice(bounded_index, 0, record);
    handles.set(record.handle, record);
  };

  const run_pending_mutations = (): void => {
    const mutations = pending_mutations.splice(0);
    for (const mutation of mutations) {
      void mutation().catch(options.on_async_error);
    }
  };

  const schedule_mutation = (mutation: PendingMutation, defer: boolean): Promise<void> => {
    if (defer) {
      return new Promise<void>((resolve, reject) => {
        pending_mutations.push(async () => {
          try {
            await mutation();
            resolve();
          } catch (cause) {
            reject(cause);
          }
        });
      });
    }
    return mutation();
  };

  const mount = async (factory: SceneFactory<Manifest>, mount_options: Readonly<{ index?: number }> = {}): Promise<SceneHandle> => {
    assert_available();
    const defer = in_frame_callback;
    const record = await prepare(factory);
    await schedule_mutation(() => commit_mount(record, mount_options.index), defer);
    return record.handle;
  };

  const remove = async (scene: SceneHandle): Promise<void> => {
    assert_available();
    const record = handles.get(scene);
    if (record === undefined) {
      throw scene_error("scene handle does not belong to this composer");
    }
    const defer = in_frame_callback;
    try {
      await schedule_mutation(() => {
        if (!handles.has(scene)) return Promise.resolve();
        handles.delete(scene);
        const index = records.indexOf(record);
        records.splice(index, 1);
        return dispose_record(record);
      }, defer);
    } catch (cause) {
      options.on_async_error(cause);
      throw cause;
    }
  };

  const replace = async (scene: SceneHandle, factory: SceneFactory<Manifest>): Promise<SceneHandle> => {
    assert_available();
    const old_record = handles.get(scene);
    if (old_record === undefined) {
      throw scene_error("scene handle does not belong to this composer");
    }
    const defer = in_frame_callback;
    const replacement = await prepare(factory);
    try {
      await schedule_mutation(async () => {
        if (!handles.has(scene) || disposed) {
          await dispose_record(replacement);
          throw scene_error("scene handle is no longer active");
        }
        const index = records.indexOf(old_record);
        try {
          await old_record.definition.exit?.();
        } catch (cause) {
          await dispose_record(replacement);
          throw cause;
        }
        handles.delete(scene);
        records.splice(index, 1, replacement);
        handles.set(replacement.handle, replacement);
        await dispose_record(old_record, false);
      }, defer);
    } catch (cause) {
      options.on_async_error(cause);
      throw cause;
    }
    return replacement.handle;
  };

  const dispose = async (): Promise<void> => {
    if (disposed) return;
    disposed = true;
    parent_abort.abort();
    pending_mutations.splice(0).forEach((mutation) => void mutation().catch(options.on_async_error));
    const current_records = records.splice(0);
    handles.clear();
    await Promise.all(
      current_records.map(async (record) => {
        try {
          await dispose_record(record);
        } catch (cause) {
          options.on_async_error(cause);
        }
      }),
    );
  };

  const update = (time: UpdateTime): void => {
    run_pending_mutations();
    in_frame_callback = true;
    try {
      for (const record of records) {
        record.definition.update?.(time);
      }
    } finally {
      in_frame_callback = false;
    }
  };

  const draw = (): void => {
    in_frame_callback = true;
    try {
      for (const record of records) {
        record.definition.draw?.();
      }
    } finally {
      in_frame_callback = false;
    }
  };

  const composer = Object.freeze({ mount, remove, replace, dispose });
  return Object.freeze({ composer, update, draw });
};
