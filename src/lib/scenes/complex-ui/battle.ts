import { Graphics } from "pixi.js";
import Battle from "./Battle.svelte";

import { create_player, type BattleQueueItem } from "./index.js";

import { app, mount_all, Scenes } from "#lib/index.js";
import { create_ui } from "#lib/ui/ui.svelte.js";
import { battle_system } from "./instance.ts";

export default Scenes.create(async () => {
  const root = new Graphics();
  root.rect(0, 0, app.renderer.width, app.renderer.height).fill("#454647");

  console.log("battle: define");
  battle_system.add_party_member(create_player());
  battle_system.random_foes();

  const ui = create_ui(Battle, {
    battle: battle_system.state,

    onAction: on_action,
    onTogglePause: () => {
      paused = !paused;
    },
  });

  async function on_action(transaction: BattleQueueItem) {
    battle_system.enqueue(transaction);
  }

  let paused: boolean = false;

  return {
    name: "battle",
    enter: () => {
      console.log("We're in battle");
      app.stage.addChild(root);

      const dismount = mount_all(ui.mount());

      return () => {
        dismount();
        app.stage.removeChild(root);
      };
    },
    update(t) {
      if (paused) {
        return;
      }

      battle_system.update(t);
    },
  };
});
