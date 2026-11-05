import type { ResourceHandle, ResourceOwner } from "./resource_ownership.js";
import type { WebGpuRenderer, WebGpuTexture } from "./webgpu_renderer.js";
import type { TextureFilteringOptions } from "./texture_filtering.js";
import type { FontOptions, WebGpuFont } from "./font_loading.js";

export type AssetDefinition<Resource> = Readonly<{
  load: (signal: AbortSignal) => Promise<Resource>;
  destroy: (resource: Resource) => void;
}>;

export type AssetManifest = Readonly<
  Record<string, Readonly<{ load: (signal: AbortSignal) => Promise<unknown>; destroy: (resource: never) => void }>>
>;

export type AssetResource<Manifest extends AssetManifest, Key extends keyof Manifest> =
  Manifest[Key] extends AssetDefinition<infer Resource> ? Resource : never;

export type AssetCache<Manifest extends AssetManifest> = Readonly<{
  load: <Key extends keyof Manifest>(
    key: Key,
    options?: Readonly<{ signal?: AbortSignal }>,
  ) => Promise<ResourceHandle<AssetResource<Manifest, Key>>>;
  load_texture: (
    source: Blob,
    options?: Readonly<TextureFilteringOptions & { signal?: AbortSignal }>,
  ) => Promise<ResourceHandle<WebGpuTexture>>;
  load_font: (source: string, options?: FontOptions & { signal?: AbortSignal }) => Promise<ResourceHandle<WebGpuFont>>;
  dispose: () => void;
}>;

type PendingEntry = {
  controller: AbortController;
  waiters: number;
  promise: Promise<unknown>;
};

const create_abort_error = (): Error => new DOMException("asset load was aborted", "AbortError");

function narrow_resource_handle<Resource>(handle: ResourceHandle<unknown>): ResourceHandle<Resource>;
function narrow_resource_handle(handle: ResourceHandle<unknown>): ResourceHandle<unknown> {
  return handle;
}

export const create_asset_cache = <Manifest extends AssetManifest>(
  manifest: Manifest,
  resources: ResourceOwner,
  renderer?: Promise<WebGpuRenderer>,
): AssetCache<Manifest> => {
  const pending = new Map<keyof Manifest, PendingEntry>();
  const shared_handles = new Map<keyof Manifest, ResourceHandle<unknown>>();
  const texture_operations = new Set<AbortController>();
  const font_operations = new Set<AbortController>();
  let disposed = false;

  const load = async <Key extends keyof Manifest>(
    key: Key,
    options: Readonly<{ signal?: AbortSignal }> = {},
  ): Promise<ResourceHandle<AssetResource<Manifest, Key>>> => {
    if (disposed) {
      throw new Error("asset cache is disposed");
    }
    if (options.signal?.aborted) {
      throw create_abort_error();
    }
    const descriptor = manifest[key];
    const destroy_resource = (resource: unknown): void => {
      Reflect.apply(descriptor.destroy, undefined, [resource]);
    };

    const existing_handle = shared_handles.get(key);
    if (existing_handle !== undefined) {
      return narrow_resource_handle<AssetResource<Manifest, Key>>(existing_handle.share());
    }

    let entry = pending.get(key);
    if (entry === undefined) {
      const controller = new AbortController();
      const promise = descriptor.load(controller.signal).then((resource) => {
        if (disposed) {
          destroy_resource(resource);
          throw new Error("asset cache was disposed during loading");
        }
        const handle = resources.acquire(resource, destroy_resource);
        shared_handles.set(key, handle);
        return resource;
      });
      entry = { controller, waiters: 0, promise };
      pending.set(key, entry);
      void promise.then(
        () => pending.delete(key),
        () => pending.delete(key),
      );
    }

    const current_entry = entry;
    current_entry.waiters += 1;
    const request_state = { aborted: false };
    const abort = (): void => {
      request_state.aborted = true;
      current_entry.waiters -= 1;
      if (current_entry.waiters === 0) {
        current_entry.controller.abort();
      }
    };
    options.signal?.addEventListener("abort", abort, { once: true });

    try {
      await current_entry.promise;
      if (request_state.aborted || options.signal?.aborted) {
        throw create_abort_error();
      }
      const handle = shared_handles.get(key);
      if (handle === undefined) throw new Error(`asset load completed without a shared handle: ${String(key)}`);
      return narrow_resource_handle<AssetResource<Manifest, Key>>(handle.share());
    } finally {
      options.signal?.removeEventListener("abort", abort);
      if (!request_state.aborted) {
        current_entry.waiters -= 1;
      }
    }
  };

  const load_texture = async (
    source: Blob,
    options: Readonly<TextureFilteringOptions & { signal?: AbortSignal }> = {},
  ): Promise<ResourceHandle<WebGpuTexture>> => {
    if (disposed) {
      throw new Error("asset cache is disposed");
    }
    if (options.signal?.aborted) {
      throw create_abort_error();
    }
    if (renderer === undefined) {
      throw new Error("asset cache has no renderer");
    }
    const { signal, ...filtering } = options;
    const controller = new AbortController();
    const abort = (): void => {
      controller.abort();
    };
    signal?.addEventListener("abort", abort, { once: true });
    texture_operations.add(controller);
    try {
      const texture = await renderer.then((value) => value.create_texture_from_blob(source, filtering, controller.signal));
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Cache disposal can happen while upload awaits the renderer.
      if (disposed || controller.signal.aborted) {
        texture.release();
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Preserve disposal versus abort diagnostics after asynchronous upload.
        throw disposed ? new Error("asset cache was disposed during loading") : create_abort_error();
      }
      try {
        return resources.acquire(texture, (resource) => {
          resource.release();
        });
      } catch (error) {
        texture.release();
        throw error;
      }
    } finally {
      texture_operations.delete(controller);
      signal?.removeEventListener("abort", abort);
    }
  };

  const load_font = async (source: string, options: FontOptions & { signal?: AbortSignal } = {}): Promise<ResourceHandle<WebGpuFont>> => {
    if (disposed) throw new Error("asset cache is disposed");
    if (options.signal?.aborted) throw create_abort_error();
    if (renderer === undefined) throw new Error("asset cache has no renderer");
    const { signal, ...font_options } = options;
    const controller = new AbortController();
    const abort = (): void => {
      controller.abort();
    };
    signal?.addEventListener("abort", abort, { once: true });
    font_operations.add(controller);
    try {
      const font = await renderer.then((value) => value.create_font_from_url(source, font_options));
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Cache disposal can happen while font loading awaits the renderer.
      if (disposed || controller.signal.aborted) {
        font.release();
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Preserve disposal versus abort diagnostics after asynchronous font loading.
        throw disposed ? new Error("asset cache was disposed during loading") : create_abort_error();
      }
      try {
        return resources.acquire(font, (resource) => {
          resource.release();
        });
      } catch (error) {
        font.release();
        throw error;
      }
    } finally {
      font_operations.delete(controller);
      signal?.removeEventListener("abort", abort);
    }
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    for (const entry of pending.values()) {
      entry.controller.abort();
    }
    for (const controller of texture_operations) {
      controller.abort();
    }
    for (const controller of font_operations) {
      controller.abort();
    }
    for (const handle of shared_handles.values()) {
      handle.release();
    }
    pending.clear();
    shared_handles.clear();
  };

  return Object.freeze({ load, load_texture, load_font, dispose });
};
