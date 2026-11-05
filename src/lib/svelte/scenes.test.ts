// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { create_scene_event_bus, type SceneComposer, type SceneDefinition, type SceneFactory, type SceneHandle } from "../core/index.js";
import type { SvelteSceneFactory, UiHandle } from "./scenes.js";

const svelte_runtime = vi.hoisted(() => ({ mount: vi.fn(() => ({ update: vi.fn() })), unmount: vi.fn() }));
vi.mock("svelte", () => svelte_runtime);

import { create_svelte_scenes } from "./scenes.js";

type SceneRecord = { definition: SceneDefinition; cleanup: (() => void | Promise<void>) | undefined };

const create_composer = (): SceneComposer => {
  const records = new Map<SceneHandle, SceneRecord>();
  const activate = async (factory: SceneFactory): Promise<SceneHandle> => {
    const definition = await factory({} as never);
    const cleanup = await definition.enter?.({} as never);
    const handle = Object.freeze({});
    records.set(handle, { definition, cleanup: typeof cleanup === "function" ? cleanup : undefined });
    return handle;
  };
  const remove = async (scene: SceneHandle): Promise<void> => {
    const record = records.get(scene);
    if (record === undefined) throw new Error("unknown scene");
    await record.cleanup?.();
    await record.definition.exit?.();
    records.delete(scene);
  };
  return {
    events: create_scene_event_bus(),
    mount: activate,
    remove,
    replace: async (scene, factory) => {
      const replacement = await activate(factory);
      await remove(scene);
      return replacement;
    },
    replace_stack: activate,
    dispose: async () => Promise.all([...records.keys()].map(remove)).then(() => undefined),
  };
};

const component = (() => null) as never;

describe("[scene-ui] scene UI scope", () => {
  it("mounts, updates, and idempotently disposes multiple scene-owned handles", async () => {
    const root = document.createElement("div");
    const { scenes } = create_svelte_scenes(create_composer(), root);
    let first!: UiHandle<Record<string, never>>;
    const factory: SvelteSceneFactory = ({ create_ui }) => {
      first = create_ui(component, {});
      const second = create_ui(component, {});
      return {
        name: "two handles",
        enter: async () => {
          await first.mount();
          await second.mount();
          first.update({});
          first.dispose();
          first.dispose();
          second.dispose();
        },
      };
    };
    await scenes.mount(factory);
    expect(root.children).toHaveLength(1);
    expect(svelte_runtime.mount).toHaveBeenCalledTimes(2);
    expect(svelte_runtime.unmount).toHaveBeenCalledTimes(2);
    expect(() => first.mount()).toThrow("disposed");
  });

  it("replaces UI only after activation, disposes the old scope, and rejects stale handles", async () => {
    const root = document.createElement("div");
    const { scenes } = create_svelte_scenes(create_composer(), root);
    let old_ui!: UiHandle<Record<string, never>>;
    const old_scene: SvelteSceneFactory = ({ create_ui }) => {
      old_ui = create_ui(component, {});
      return { name: "old", enter: () => old_ui.mount() };
    };
    const first = await scenes.mount(old_scene);
    const second_scene: SvelteSceneFactory = ({ create_ui }) => {
      const ui = create_ui(component, {});
      return { name: "second", enter: () => ui.mount() };
    };
    const second = await scenes.mount(second_scene);
    const replacement_scene: SvelteSceneFactory = ({ create_ui }) => {
      const ui = create_ui(component, {});
      return { name: "replacement", enter: () => ui.mount() };
    };
    const replacement = await scenes.replace(first, replacement_scene);
    expect(replacement).not.toBe(first);
    expect(root.children).toHaveLength(2);
    expect(root.lastElementChild).toBe(root.children[1]);
    expect(() => old_ui.mount()).toThrow("disposed");
    old_ui.update({});
    expect(svelte_runtime.mount).toHaveBeenCalledTimes(3);
    expect(second).toBeDefined();
  });
});
