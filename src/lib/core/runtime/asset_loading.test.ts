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
});
