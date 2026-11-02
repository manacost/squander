import type { AssetCache, AssetManifest, AssetResource } from "./asset_loading.js";
import type { ResourceHandle } from "./resource_ownership.js";
import type { UpdateTime } from "./timing.js";
import type { WebGpuRenderer } from "./webgpu_renderer.js";
import type { Signal } from "../signal.js";

export type SceneEventMap = Record<string, unknown>;

export type SceneEventBus<EventMap extends SceneEventMap = SceneEventMap> = Readonly<{
  on: <EventName extends keyof EventMap>(name: EventName, callback: (payload: EventMap[EventName]) => void) => () => void;
  once: <EventName extends keyof EventMap>(name: EventName, callback: (payload: EventMap[EventName]) => void) => () => void;
  off: <EventName extends keyof EventMap>(name: EventName, callback?: (payload: EventMap[EventName]) => void) => void;
  emit: <EventName extends keyof EventMap>(name: EventName, payload: EventMap[EventName]) => void;
  clear: () => void;
}>;

export type SceneFactoryContext<Manifest extends AssetManifest = AssetManifest, EventMap extends SceneEventMap = SceneEventMap> = Readonly<{
  signal: AbortSignal;
  renderer: WebGpuRenderer;
  manifest: Manifest;
  assets: SceneAssetScope<Manifest>;
  subscriptions: SceneSubscriptions;
  events: SceneEventBus<EventMap>;
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

export type SceneContext<
  Manifest extends AssetManifest = AssetManifest,
  EventMap extends SceneEventMap = SceneEventMap,
> = SceneFactoryContext<Manifest, EventMap>;

export type SceneCleanup = () => void | Promise<void>;

export type SceneDefinition<Manifest extends AssetManifest = AssetManifest, EventMap extends SceneEventMap = SceneEventMap> = Readonly<{
  name: string;
  dependencies?: SceneDependencies<Manifest>;
  init?: (context: SceneContext<Manifest, EventMap>) => void | Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- An enter callback may intentionally return no cleanup.
  enter?: (context: SceneContext<Manifest, EventMap>) => void | SceneCleanup | Promise<void | SceneCleanup>;
  update?: (time: UpdateTime) => void;
  draw?: () => void;
  exit?: () => void | Promise<void>;
}>;

export type SceneFactory<Manifest extends AssetManifest = AssetManifest, EventMap extends SceneEventMap = SceneEventMap> = (
  context: SceneFactoryContext<Manifest, EventMap>,
) => SceneDefinition<Manifest, EventMap> | Promise<SceneDefinition<Manifest, EventMap>>;

export type SceneHandle = Readonly<object>;

export type SceneComposer<Manifest extends AssetManifest = AssetManifest, EventMap extends SceneEventMap = SceneEventMap> = Readonly<{
  events: SceneEventBus<EventMap>;
  mount: (factory: SceneFactory<Manifest, EventMap>, options?: Readonly<{ index?: number }>) => Promise<SceneHandle>;
  remove: (scene: SceneHandle) => Promise<void>;
  replace: (scene: SceneHandle, factory: SceneFactory<Manifest, EventMap>) => Promise<SceneHandle>;
  replace_stack: (factory: SceneFactory<Manifest, EventMap>) => Promise<SceneHandle>;
  dispose: () => Promise<void>;
}>;

export const create_scene_event_bus = <EventMap extends SceneEventMap = SceneEventMap>(
  on_error: (cause: unknown) => void = () => undefined,
): SceneEventBus<EventMap> => {
  type Listener = { original: unknown; invoke: (payload: unknown) => void };
  const listeners = new Map<keyof EventMap, Set<Listener>>();
  let disposed = false;
  const on = <EventName extends keyof EventMap>(name: EventName, callback: (payload: EventMap[EventName]) => void): (() => void) => {
    if (disposed) return () => undefined;
    const invoke = (payload: unknown): void => {
      try {
        callback(payload as EventMap[EventName]);
      } catch (cause) {
        on_error(cause);
      }
    };
    const entries = listeners.get(name) ?? new Set<Listener>();
    const listener = { original: callback, invoke };
    entries.add(listener);
    listeners.set(name, entries);
    return () => {
      entries.delete(listener);
    };
  };
  const once = <EventName extends keyof EventMap>(name: EventName, callback: (payload: EventMap[EventName]) => void): (() => void) => {
    const unsubscribe = on(name, (payload) => {
      unsubscribe();
      callback(payload);
    });
    return () => {
      unsubscribe();
    };
  };
  const off = <EventName extends keyof EventMap>(name: EventName, callback?: (payload: EventMap[EventName]) => void): void => {
    if (callback === undefined) {
      listeners.delete(name);
      return;
    }
    const entries = listeners.get(name);
    if (entries === undefined) return;
    for (const listener of entries) {
      if (listener.original === callback) entries.delete(listener);
    }
  };
  const emit = <EventName extends keyof EventMap>(name: EventName, payload: EventMap[EventName]): void => {
    if (disposed) return;
    const current_listeners = listeners.get(name);
    for (const listener of [...(current_listeners ?? [])]) {
      if (current_listeners?.has(listener) === true) listener.invoke(payload);
    }
  };
  const clear = (): void => {
    disposed = true;
    listeners.clear();
  };
  return Object.freeze({ on, once, off, emit, clear });
};

const create_scene_event_scope = <EventMap extends SceneEventMap>(
  parent: SceneEventBus<EventMap>,
): Readonly<{ events: SceneEventBus<EventMap>; dispose: () => void }> => {
  const registrations = new Map<keyof EventMap, Map<unknown, () => void>>();
  const register = <EventName extends keyof EventMap>(
    name: EventName,
    callback: (payload: EventMap[EventName]) => void,
    once: boolean,
  ): (() => void) => {
    const unsubscribe = once ? parent.once(name, callback) : parent.on(name, callback);
    const callbacks = registrations.get(name) ?? new Map<unknown, () => void>();
    callbacks.set(callback, unsubscribe);
    registrations.set(name, callbacks);
    return () => {
      unsubscribe();
      callbacks.delete(callback);
    };
  };
  const on = <EventName extends keyof EventMap>(name: EventName, callback: (payload: EventMap[EventName]) => void): (() => void) =>
    register(name, callback, false);
  const once = <EventName extends keyof EventMap>(name: EventName, callback: (payload: EventMap[EventName]) => void): (() => void) =>
    register(name, callback, true);
  const off = <EventName extends keyof EventMap>(name: EventName, callback?: (payload: EventMap[EventName]) => void): void => {
    const callbacks = registrations.get(name);
    if (callbacks === undefined) return;
    if (callback === undefined) {
      for (const unsubscribe of callbacks.values()) unsubscribe();
      callbacks.clear();
      return;
    }
    callbacks.get(callback)?.();
    callbacks.delete(callback);
  };
  const dispose = (): void => {
    for (const callbacks of registrations.values()) for (const unsubscribe of callbacks.values()) unsubscribe();
    registrations.clear();
  };
  return Object.freeze({ events: Object.freeze({ on, once, off, emit: parent.emit, clear: dispose }), dispose });
};

type SceneRecord<Manifest extends AssetManifest, EventMap extends SceneEventMap> = {
  handle: SceneHandle;
  controller: AbortController;
  context: SceneContext<Manifest, EventMap>;
  definition: SceneDefinition<Manifest, EventMap>;
  assets: SceneAssetScope<Manifest>;
  subscriptions: SceneSubscriptions;
  enter_cleanup: SceneCleanup | undefined;
  events_dispose: () => void;
};

type SceneComposerOptions<Manifest extends AssetManifest, EventMap extends SceneEventMap> = Readonly<{
  signal: AbortSignal;
  renderer: WebGpuRenderer;
  manifest: Manifest;
  asset_cache: AssetCache<Manifest>;
  on_async_error: (cause: unknown) => void;
  events: SceneEventBus<EventMap>;
}>;

type PendingMutation = () => Promise<void>;

const scene_error = (message: string): Error => {
  const error = new Error(message);
  error.name = "SceneLifecycleError";
  return error;
};

const assert_definition = <Manifest extends AssetManifest, EventMap extends SceneEventMap>(
  definition: unknown,
): SceneDefinition<Manifest, EventMap> => {
  if (definition === null || typeof definition !== "object") {
    throw scene_error("scene factory must return a definition with a non-empty name");
  }
  const candidate = definition as { name?: unknown };
  if (typeof candidate.name !== "string" || candidate.name.length === 0) {
    throw scene_error("scene factory must return a definition with a non-empty name");
  }
  return candidate as SceneDefinition<Manifest, EventMap>;
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
    // The scene can be disposed while the cache load is awaiting I/O.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Disposal can occur during the awaited cache load.
    if (disposed || scene_signal.aborted) {
      handle.release();
      throw new Error("scene asset scope was disposed during loading");
    }
    handles.add(handle);
    loaded.set(key, handle);
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

type SceneComposerController<Manifest extends AssetManifest = AssetManifest, EventMap extends SceneEventMap = SceneEventMap> = Readonly<{
  composer: SceneComposer<Manifest, EventMap>;
  update: (time: UpdateTime) => void;
  draw: () => void;
}>;

export const create_scene_composer = <Manifest extends AssetManifest = AssetManifest, EventMap extends SceneEventMap = SceneEventMap>(
  options: SceneComposerOptions<Manifest, EventMap>,
): SceneComposerController<Manifest, EventMap> => {
  const records: SceneRecord<Manifest, EventMap>[] = [];
  const handles = new Map<SceneHandle, SceneRecord<Manifest, EventMap>>();
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
  let structural_mutation_count = 0;

  const assert_available = (): void => {
    if (disposed) {
      throw scene_error("scene composer is disposed");
    }
  };

  const create_context = (
    controller: AbortController,
    assets: SceneAssetScope<Manifest>,
    subscriptions: SceneSubscriptions,
  ): { context: SceneContext<Manifest, EventMap>; events_dispose: () => void } => {
    const scope = create_scene_event_scope(options.events);
    return {
      context: Object.freeze({
        signal: controller.signal,
        renderer: options.renderer,
        manifest: options.manifest,
        assets,
        subscriptions,
        events: scope.events,
      }),
      events_dispose: scope.dispose,
    };
  };

  const create_controller = (): AbortController => {
    const controller = new AbortController();
    const abort = (): void => {
      controller.abort();
    };
    parent_abort.signal.addEventListener("abort", abort, { once: true });
    return controller;
  };

  const is_aborted = (controller: AbortController): boolean => controller.signal.aborted;

  const run_teardown = async (record: SceneRecord<Manifest, EventMap>, invoke_exit = true): Promise<void> => {
    let teardown_error: unknown;
    try {
      await record.enter_cleanup?.();
    } catch (cause) {
      teardown_error = cause;
    } finally {
      record.enter_cleanup = undefined;
    }
    try {
      if (invoke_exit) await record.definition.exit?.();
    } catch (cause) {
      teardown_error ??= cause;
    }
    if (teardown_error !== undefined) {
      throw teardown_error instanceof Error ? teardown_error : new Error("scene teardown failed", { cause: teardown_error });
    }
  };

  const dispose_record = async (record: SceneRecord<Manifest, EventMap>, invoke_exit = true): Promise<void> => {
    try {
      await run_teardown(record, invoke_exit);
    } finally {
      record.controller.abort();
      record.assets.dispose();
      record.subscriptions.clear();
      record.events_dispose();
    }
  };

  const prepare = async (factory: SceneFactory<Manifest, EventMap>): Promise<SceneRecord<Manifest, EventMap>> => {
    assert_available();
    const controller = create_controller();
    const assets = create_scene_asset_scope(options.asset_cache, controller.signal);
    const subscriptions = create_scene_subscriptions(options.on_async_error);
    const { context, events_dispose } = create_context(controller, assets, subscriptions);
    let definition: SceneDefinition<Manifest, EventMap> | undefined;
    let record: SceneRecord<Manifest, EventMap> | undefined;
    try {
      const next_definition = assert_definition<Manifest, EventMap>(await factory(context));
      definition = next_definition;
      if (is_aborted(controller)) {
        throw scene_error("scene setup was disposed");
      }
      for (const key of Object.values(next_definition.dependencies ?? {})) {
        await assets.load(key);
      }
      await next_definition.init?.(context);
      if (is_aborted(controller)) {
        throw scene_error("scene initialization was disposed");
      }
      record = {
        handle: Object.freeze({}),
        controller,
        context,
        definition: next_definition,
        assets,
        subscriptions,
        enter_cleanup: undefined,
        events_dispose,
      };
      const enter_result = await next_definition.enter?.(context);
      record.enter_cleanup = typeof enter_result === "function" ? enter_result : undefined;
      if (is_aborted(controller)) {
        throw scene_error("scene entry was disposed");
      }
      return record;
    } catch (cause) {
      if (record !== undefined) {
        try {
          await dispose_record(record);
        } catch (cleanup_error) {
          options.on_async_error(cleanup_error);
        }
      } else {
        controller.abort();
        assets.dispose();
        subscriptions.clear();
        try {
          await definition?.exit?.();
        } catch (cleanup_error) {
          options.on_async_error(cleanup_error);
        }
      }
      options.on_async_error(cause);
      throw cause;
    }
  };

  const commit_mount = async (record: SceneRecord<Manifest, EventMap>, index: number | undefined): Promise<void> => {
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
    const run = async (): Promise<void> => {
      structural_mutation_count += 1;
      try {
        await mutation();
      } finally {
        structural_mutation_count -= 1;
      }
    };
    if (defer) {
      return new Promise<void>((resolve, reject) => {
        pending_mutations.push(async () => {
          try {
            await run();
            resolve();
          } catch (cause) {
            reject(cause instanceof Error ? cause : new Error("scene mutation failed", { cause }));
          }
        });
      });
    }
    return run();
  };

  const mount = async (
    factory: SceneFactory<Manifest, EventMap>,
    mount_options: Readonly<{ index?: number }> = {},
  ): Promise<SceneHandle> => {
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

  const replace = async (scene: SceneHandle, factory: SceneFactory<Manifest, EventMap>): Promise<SceneHandle> => {
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
          await run_teardown(old_record);
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

  const replace_stack = async (factory: SceneFactory<Manifest, EventMap>): Promise<SceneHandle> => {
    assert_available();
    const defer = in_frame_callback;
    const replacement = await prepare(factory);
    try {
      await schedule_mutation(async () => {
        const previous = [...records];
        try {
          for (const record of previous) await run_teardown(record);
        } catch (cause) {
          await dispose_record(replacement);
          throw cause;
        }
        for (const record of previous) await dispose_record(record, false);
        records.splice(0, records.length, replacement);
        handles.clear();
        handles.set(replacement.handle, replacement);
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
    if (structural_mutation_count > 0) return;
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
    if (structural_mutation_count > 0) return;
    in_frame_callback = true;
    try {
      for (const record of records) {
        record.definition.draw?.();
      }
    } finally {
      in_frame_callback = false;
    }
  };

  const composer = Object.freeze({ events: options.events, mount, remove, replace, replace_stack, dispose });
  return Object.freeze({ composer, update, draw });
};
