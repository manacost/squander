export { create_game_adapter } from "./adapter.js";
export type { GameAdapter, GameAdapterOptions, GameAdapterStatus, GameAdapterView } from "./adapter.js";
export { default as GameHost } from "./GameHost.svelte";
export { default as Game } from "./Game.svelte";
export { create_game_ready_context, create_svelte_scenes } from "./scenes.js";
export type {
  CreateUi,
  GameProps,
  GameReadyContext,
  SvelteSceneFactory,
  SvelteSceneFactoryContext,
  SvelteScenes,
  UiHandle,
} from "./scenes.js";
