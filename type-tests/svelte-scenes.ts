import type { Component } from "svelte";
import type { GameReadyContext, SvelteSceneFactory, UiHandle } from "../src/lib/svelte/index.js";

type MenuProps = {
  onStart: (seed: string) => Promise<void>;
  title: string;
};

declare const Menu: Component<MenuProps>;

const scene: SvelteSceneFactory = ({ create_ui, scenes }) => {
  const ui = create_ui(Menu, {
    title: "Garden",
    onStart: async () => {
      await scenes.switch(scene);
    },
  });
  const typed_handle: UiHandle<MenuProps> = ui;
  typed_handle.update({ title: "Bloom" });
  // @ts-expect-error Dynamic props retain their component value types.
  typed_handle.update({ title: 1 });
  // @ts-expect-error Dynamic props cannot introduce unknown component props.
  typed_handle.update({ unknown: true });
  return { name: "menu", enter: () => ui.mount() };
};
void scene;

declare const scenes: import("../src/lib/svelte/index.js").SvelteScenes;
const created_scene = scenes.create(scene);
void scenes.switch(created_scene);

const invalid_scene: SvelteSceneFactory = ({ create_ui }) => {
  // @ts-expect-error Required component props must be provided.
  create_ui(Menu, { title: "Garden" });
  // @ts-expect-error Component props retain their declared value types.
  create_ui(Menu, { title: 1, onStart: async () => undefined });
  return { name: "invalid" };
};
void invalid_scene;

type InventoryManifest = {
  hero: { load: () => Promise<{ id: string }>; destroy: (resource: { id: string }) => void };
};

type SceneEvents = { score: { points: number } };

declare const inventory_ready: GameReadyContext<InventoryManifest, SceneEvents>;
const inventory_scene = inventory_ready.scenes.create(({ manifest }) => {
  const hero = manifest.hero;
  return { name: hero === undefined ? "missing" : "inventory" };
});
void inventory_ready.scenes.switch(inventory_scene);
inventory_ready.events.emit("score", { points: 10 });
// @ts-expect-error Svelte game contexts preserve the declared event payload.
inventory_ready.events.emit("score", { points: "ten" });
// @ts-expect-error Svelte game contexts reject undeclared event names.
inventory_ready.events.emit("unknown", { points: 10 });
