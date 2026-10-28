import { describe, expect, it } from "vitest";
import { create_asset_cache, type AssetManifest } from "./asset_loading.js";
import { create_resource_owner } from "./resource_ownership.js";

type TestManifest = AssetManifest & {
  hero: {
    load: (signal: AbortSignal) => Promise<string>;
    destroy: (resource: string) => void;
  };
};

describe("[asset-loading] manifest cache", () => {
  it("shares concurrent work and returns independently releasable handles", async () => {
    let loads = 0;
    const destroyed: string[] = [];
    let resolve_load!: (value: string) => void;
    const manifest: TestManifest = {
      hero: {
        load: async () => {
          loads += 1;
          return new Promise((resolve) => {
            resolve_load = resolve;
          });
        },
        destroy: (resource) => {
          destroyed.push(resource);
        },
      },
    };
    const cache = create_asset_cache(manifest, create_resource_owner());
    const first = cache.load("hero");
    const second = cache.load("hero");
    expect(loads).toBe(1);
    resolve_load("hero-texture");
    const [first_handle, second_handle] = await Promise.all([first, second]);

    first_handle.release();
    expect(second_handle.read()).toBe("hero-texture");
    expect(destroyed).toEqual([]);
    second_handle.release();
    cache.dispose();
  });

  it("removes failed loads so explicit retry can succeed", async () => {
    let attempts = 0;
    const manifest: TestManifest = {
      hero: {
        load: () => {
          attempts += 1;
          if (attempts === 1) {
            return Promise.reject(new Error("temporary failure"));
          }
          return Promise.resolve("hero-texture");
        },
        destroy: () => undefined,
      },
    };
    const cache = create_asset_cache(manifest, create_resource_owner());

    await expect(cache.load("hero")).rejects.toThrow("temporary failure");
    const handle = await cache.load("hero");
    expect(handle.read()).toBe("hero-texture");
    expect(attempts).toBe(2);
    handle.release();
    cache.dispose();
  });

  it("allows one requester to abort without cancelling another", async () => {
    let resolve_load!: (value: string) => void;
    let abort_seen = false;
    const manifest: TestManifest = {
      hero: {
        load: async (signal) => {
          signal.addEventListener("abort", () => {
            abort_seen = true;
          });
          return new Promise((resolve) => {
            resolve_load = resolve;
          });
        },
        destroy: () => undefined,
      },
    };
    const cache = create_asset_cache(manifest, create_resource_owner());
    const first_controller = new AbortController();
    const first = cache.load("hero", { signal: first_controller.signal });
    const second = cache.load("hero");
    first_controller.abort();
    resolve_load("hero-texture");

    await expect(first).rejects.toThrow("asset load was aborted");
    const second_handle = await second;
    expect(abort_seen).toBe(false);
    second_handle.release();
    cache.dispose();
  });

  it("shares an already-loaded handle and rejects work after disposal", async () => {
    let destroyed = 0;
    const manifest: TestManifest = {
      hero: {
        load: async () => "hero-texture",
        destroy: () => {
          destroyed += 1;
        },
      },
    };
    const cache = create_asset_cache(manifest, create_resource_owner());
    const first = await cache.load("hero");
    const second = await cache.load("hero");
    first.release();
    expect(second.read()).toBe("hero-texture");
    second.release();
    cache.dispose();
    expect(destroyed).toBe(1);
    await expect(cache.load("hero")).rejects.toThrow("asset cache is disposed");
  });

  it("aborts the underlying operation when every requester leaves", async () => {
    let resolve_load!: (value: string) => void;
    let abort_seen = false;
    const manifest: TestManifest = {
      hero: {
        load: (signal) => {
          signal.addEventListener("abort", () => {
            abort_seen = true;
          });
          return new Promise((resolve) => {
            resolve_load = resolve;
          });
        },
        destroy: () => undefined,
      },
    };
    const cache = create_asset_cache(manifest, create_resource_owner());
    const first_controller = new AbortController();
    const second_controller = new AbortController();
    const first = cache.load("hero", { signal: first_controller.signal });
    const second = cache.load("hero", { signal: second_controller.signal });
    first_controller.abort();
    second_controller.abort();
    expect(abort_seen).toBe(true);
    resolve_load("late texture");
    await expect(first).rejects.toThrow("asset load was aborted");
    await expect(second).rejects.toThrow("asset load was aborted");
    cache.dispose();
  });

  it("rejects an already-aborted request without returning a handle", async () => {
    let loads = 0;
    const manifest: TestManifest = {
      hero: {
        load: async () => {
          loads += 1;
          return "hero-texture";
        },
        destroy: () => undefined,
      },
    };
    const cache = create_asset_cache(manifest, create_resource_owner());
    const controller = new AbortController();
    controller.abort();
    await expect(cache.load("hero", { signal: controller.signal })).rejects.toThrow("asset load was aborted");
    expect(loads).toBe(0);
    cache.dispose();
  });

  it("destroys a late resource when disposal wins an in-flight load", async () => {
    let resolve_load!: (value: string) => void;
    let destroyed = 0;
    const manifest: TestManifest = {
      hero: {
        load: () =>
          new Promise((resolve) => {
            resolve_load = resolve;
          }),
        destroy: () => {
          destroyed += 1;
        },
      },
    };
    const cache = create_asset_cache(manifest, create_resource_owner());
    const pending = cache.load("hero");
    cache.dispose();
    cache.dispose();
    resolve_load("late texture");
    await expect(pending).rejects.toThrow("asset cache was disposed during loading");
    expect(destroyed).toBe(1);
  });
});
