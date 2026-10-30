export { create_game_adapter } from "./adapter.js";
export type { GameAdapter, GameAdapterOptions, GameAdapterStatus, GameAdapterView } from "./adapter.js";
export { default as GameHost } from "./GameHost.svelte";
import type { Component } from "svelte";
import type { BridgeCommands } from "../core/runtime/bridge.js";
import type { GameAdapterView } from "./adapter.js";

export type SceneOverlayProps<State, Commands extends BridgeCommands> = Readonly<{
  view: GameAdapterView<State, Commands>;
}>;

export type SvelteSceneOverlay<State, Commands extends BridgeCommands> = Component<SceneOverlayProps<State, Commands>>;
