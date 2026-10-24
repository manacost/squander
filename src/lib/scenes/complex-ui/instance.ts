import { ui_proxy } from "#lib/ui/ui.svelte.ts";
import { create_battle_system, create_enemy, create_player } from "./index.js";

export const battle_system = create_battle_system({
  party: [create_player(), create_player()],
  foes: [],
});
