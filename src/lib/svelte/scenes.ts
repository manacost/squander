import { mount, unmount, type Component } from "svelte";
import type { AssetCache, AssetManifest } from "../core/runtime/asset_loading.js";
import type {
  Game,
  SceneCleanup,
  SceneComposer,
  SceneContext,
  SceneDefinition,
  SceneFactory,
  SceneFactoryContext,
  SceneHandle,
  SceneEventMap,
} from "../core/index.js";
import UiMount from "./UiMount.svelte";

export type UiHandle<Props> = Readonly<{
  mount: () => Promise<void>;
  update: (patch: Partial<Props>) => void;
  dispose: () => void;
}>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Svelte's Component props constraint is intentionally any-based.
export type CreateUi = <Props extends Record<string, any>>(component: Component<Props>, initial_props: NoInfer<Props>) => UiHandle<Props>;

export type SvelteSceneFactoryContext<
  Manifest extends AssetManifest = AssetManifest,
  EventMap extends SceneEventMap = SceneEventMap,
> = SceneFactoryContext<Manifest, EventMap> &
  Readonly<{
    create_ui: CreateUi;
    scenes: SvelteScenes<Manifest, EventMap>;
  }>;

export type SvelteSceneFactory<Manifest extends AssetManifest = AssetManifest, EventMap extends SceneEventMap = SceneEventMap> = (
  context: SvelteSceneFactoryContext<Manifest, EventMap>,
) => SceneDefinition<Manifest, EventMap> | Promise<SceneDefinition<Manifest, EventMap>>;

export type SvelteScenes<Manifest extends AssetManifest = AssetManifest, EventMap extends SceneEventMap = SceneEventMap> = Readonly<{
  create: (factory: SvelteSceneFactory<Manifest, EventMap>) => SceneFactory<Manifest, EventMap>;
  switch: (factory: SvelteSceneFactory<Manifest, EventMap> | SceneFactory<Manifest, EventMap>) => Promise<SceneHandle>;
  mount: (
    factory: SvelteSceneFactory<Manifest, EventMap> | SceneFactory<Manifest, EventMap>,
    options?: Readonly<{ index?: number }>,
  ) => Promise<SceneHandle>;
  remove: (scene: SceneHandle) => Promise<void>;
  replace: (scene: SceneHandle, factory: SvelteSceneFactory<Manifest, EventMap> | SceneFactory<Manifest, EventMap>) => Promise<SceneHandle>;
}>;

export type GameReadyContext<Manifest extends AssetManifest = AssetManifest, EventMap extends SceneEventMap = SceneEventMap> = Readonly<{
  scenes: SvelteScenes<Manifest, EventMap>;
  assets: AssetCache<Manifest>;
  events: Game<Manifest, EventMap>["scenes"]["events"];
  signal: AbortSignal;
}>;

export type GameProps<Manifest extends AssetManifest = AssetManifest, EventMap extends SceneEventMap = SceneEventMap> = Readonly<{
  manifest?: Manifest;

  onReady?: (context: GameReadyContext<Manifest, EventMap>) => void | Promise<void>;

  onError?: (cause: unknown) => void;
  class?: string;
}>;

type MountedUi = ReturnType<typeof mount>;

type SceneUiScope = Readonly<{
  create_ui: CreateUi;
  dispose: () => void;
  element: HTMLDivElement;
}>;

const create_scene_ui_scope = (): SceneUiScope => {
  const element = document.createElement("div");
  const handles = new Set<{ dispose: () => void }>();
  let disposed = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Svelte's Component props constraint is intentionally any-based.
  const create_ui: CreateUi = <Props extends Record<string, any>>(component: Component<Props>, initial_props: Props): UiHandle<Props> => {
    let mounted: MountedUi | undefined;
    let host: HTMLDivElement | undefined;
    let disposed_handle = false;
    const dispose = (): void => {
      if (disposed_handle) return;
      disposed_handle = true;
      handles.delete(handle);
      if (mounted !== undefined) void unmount(mounted);
      host?.remove();
      mounted = undefined;
      host = undefined;
    };
    const handle: UiHandle<Props> = Object.freeze({
      mount: () => {
        if (disposed || disposed_handle) throw new Error("scene UI is disposed");
        if (mounted !== undefined) return Promise.resolve();
        host = document.createElement("div");
        element.append(host);
        mounted = mount(UiMount, {
          target: host,
          props: {
            // eslint-disable-next-line no-restricted-syntax -- Svelte's generic component boundary is erased by UiMount.
            component: component as Component<Record<string, unknown>>,
            // eslint-disable-next-line no-restricted-syntax -- Svelte's generic props boundary is erased by UiMount.
            initial_props: initial_props as Record<string, unknown>,
          },
        });
        return Promise.resolve();
      },
      update: (patch) => {
        if (disposed || disposed_handle) return;
        if (mounted === undefined) throw new Error("scene UI is not mounted");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Svelte's generated component return type is intentionally opaque.
        mounted.update(patch);
      },
      dispose,
    });
    handles.add(handle);
    return handle;
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    for (const handle of [...handles]) handle.dispose();
    element.remove();
  };

  return Object.freeze({ create_ui, dispose, element });
};

export type SvelteScenesController<
  Manifest extends AssetManifest = AssetManifest,
  EventMap extends SceneEventMap = SceneEventMap,
> = Readonly<{
  scenes: SvelteScenes<Manifest, EventMap>;
  dispose: () => void;
}>;

export const create_svelte_scenes = <Manifest extends AssetManifest, EventMap extends SceneEventMap = SceneEventMap>(
  composer: SceneComposer<Manifest, EventMap>,
  root: HTMLElement,
): SvelteScenesController<Manifest, EventMap> => {
  const active = new Map<SceneHandle, SceneUiScope>();
  const pending = new Set<SceneUiScope>();
  const order: SceneHandle[] = [];
  const templates = new WeakMap<
    SvelteSceneFactory<Manifest, EventMap> | SceneFactory<Manifest, EventMap>,
    SvelteSceneFactory<Manifest, EventMap>
  >();
  let disposed = false;

  const clear_pending = (scope: SceneUiScope | undefined): void => {
    if (scope !== undefined) pending.delete(scope);
  };

  const reorder = (): void => {
    for (const handle of order) {
      const scope = active.get(handle);
      if (scope === undefined) continue;
      root.append(scope.element);
    }
  };

  const adapt =
    (factory: SvelteSceneFactory<Manifest, EventMap>, on_scope?: (scope: SceneUiScope) => void): SceneFactory<Manifest, EventMap> =>
    async (context) => {
      const scope = create_scene_ui_scope();
      on_scope?.(scope);
      let definition: SceneDefinition<Manifest, EventMap>;
      try {
        definition = await factory(Object.freeze({ ...context, create_ui: scope.create_ui, scenes }));
      } catch (cause) {
        scope.dispose();
        throw cause;
      }
      const enter = definition.enter;
      const exit = definition.exit;
      return Object.freeze({
        ...definition,
        enter: async (scene_context: SceneContext<Manifest, EventMap>): Promise<SceneCleanup> => {
          const cleanup = await enter?.(scene_context);
          return async () => {
            try {
              if (typeof cleanup === "function") await cleanup();
            } finally {
              scope.dispose();
            }
          };
        },
        exit: async () => {
          try {
            await exit?.();
          } finally {
            scope.dispose();
          }
        },
      } satisfies SceneDefinition<Manifest, EventMap>);
    };

  const create = (factory: SvelteSceneFactory<Manifest, EventMap>): SceneFactory<Manifest, EventMap> => {
    const wrapped = adapt(factory);
    templates.set(wrapped, factory);
    return wrapped;
  };

  const resolve_factory = (
    factory: SvelteSceneFactory<Manifest, EventMap> | SceneFactory<Manifest, EventMap>,
    on_scope: (scope: SceneUiScope) => void,
  ): SceneFactory<Manifest, EventMap> => adapt(templates.get(factory) ?? factory, on_scope);

  const mount = async (
    factory: SvelteSceneFactory<Manifest, EventMap> | SceneFactory<Manifest, EventMap>,
    options: Readonly<{ index?: number }> = {},
  ): Promise<SceneHandle> => {
    if (disposed) throw new Error("Svelte scenes are disposed");
    let scope: SceneUiScope | undefined;
    const wrapped = resolve_factory(factory, (next_scope) => {
      scope = next_scope;
      pending.add(next_scope);
    });
    let handle: SceneHandle;
    try {
      handle = await composer.mount(wrapped, options);
    } catch (cause) {
      scope?.dispose();
      clear_pending(scope);
      throw cause;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Host disposal can happen while the composer awaits setup.
    if (scope === undefined || disposed) {
      scope?.dispose();
      clear_pending(scope);
      throw new Error("Svelte scenes are disposed");
    }
    pending.delete(scope);
    active.set(handle, scope);
    const index = options.index === undefined ? order.length : Math.max(0, Math.min(options.index, order.length));
    order.splice(index, 0, handle);
    reorder();
    return handle;
  };

  const remove = async (scene: SceneHandle): Promise<void> => {
    await composer.remove(scene);
    active.delete(scene);
    const index = order.indexOf(scene);
    if (index >= 0) order.splice(index, 1);
    reorder();
  };

  const replace = async (
    scene: SceneHandle,
    factory: SvelteSceneFactory<Manifest, EventMap> | SceneFactory<Manifest, EventMap>,
  ): Promise<SceneHandle> => {
    let scope: SceneUiScope | undefined;
    const wrapped = resolve_factory(factory, (next_scope) => {
      scope = next_scope;
      pending.add(next_scope);
    });
    let handle: SceneHandle;
    try {
      handle = await composer.replace(scene, wrapped);
    } catch (cause) {
      scope?.dispose();
      clear_pending(scope);
      throw cause;
    }
    if (scope === undefined || disposed) {
      scope?.dispose();
      clear_pending(scope);
      throw new Error("Svelte scenes are disposed");
    }
    pending.delete(scope);
    active.delete(scene);
    active.set(handle, scope);
    const index = order.indexOf(scene);
    if (index >= 0) order.splice(index, 1, handle);
    reorder();
    return handle;
  };

  const switch_scene = async (factory: SvelteSceneFactory<Manifest, EventMap> | SceneFactory<Manifest, EventMap>): Promise<SceneHandle> => {
    if (disposed) throw new Error("Svelte scenes are disposed");
    let scope: SceneUiScope | undefined;
    const wrapped = resolve_factory(factory, (next_scope) => {
      scope = next_scope;
      pending.add(next_scope);
    });
    let handle: SceneHandle;
    try {
      handle = await composer.replace_stack(wrapped);
    } catch (cause) {
      scope?.dispose();
      clear_pending(scope);
      throw cause;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Host disposal can happen while the composer awaits setup.
    if (scope === undefined || disposed) {
      scope?.dispose();
      clear_pending(scope);
      throw new Error("Svelte scenes are disposed");
    }
    pending.delete(scope);
    for (const previous_scope of active.values()) previous_scope.dispose();
    active.clear();
    order.length = 0;
    active.set(handle, scope);
    order.push(handle);
    reorder();
    return handle;
  };

  const scenes = Object.freeze({ create, switch: switch_scene, mount, remove, replace });
  return Object.freeze({
    scenes,
    dispose: () => {
      disposed = true;
      for (const scope of active.values()) scope.dispose();
      for (const scope of pending) scope.dispose();
      active.clear();
      pending.clear();
      order.length = 0;
    },
  });
};

export const create_game_ready_context = <Manifest extends AssetManifest, EventMap extends SceneEventMap = SceneEventMap>(
  game: Game<Manifest, EventMap>,
  root: HTMLElement,
  signal: AbortSignal,
): Readonly<{ context: GameReadyContext<Manifest, EventMap>; controller: SvelteScenesController<Manifest, EventMap> }> => {
  const controller = create_svelte_scenes(game.scenes, root);
  return Object.freeze({
    context: Object.freeze({ scenes: controller.scenes, assets: game.assets, events: game.scenes.events, signal }),
    controller,
  });
};
