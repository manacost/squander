import root_game from "../../../../../verification/docs-examples/root-game.ts?raw";
import runtime from "../../../../../verification/docs-examples/runtime.ts?raw";
import ecs from "../../../../../verification/docs-examples/ecs.ts?raw";
import signals from "../../../../../verification/docs-examples/signals.ts?raw";
import assets from "../../../../../verification/docs-examples/assets.ts?raw";
import webgpu from "../../../../../verification/docs-examples/webgpu.ts?raw";
import getting_started from "../../../../../verification/docs-examples/getting-started.svelte?raw";
import svelte_bridge from "../../../../../verification/docs-examples/svelte-bridge.svelte?raw";

export const documentation_examples = {
  root_game,
  runtime,
  ecs,
  signals,
  assets,
  webgpu,
  getting_started,
  svelte_bridge,
} satisfies Readonly<Record<string, string>>;
