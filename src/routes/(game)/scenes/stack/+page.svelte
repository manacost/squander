<script lang="ts">
  import Game from "#lib/ui/Game.svelte";
  import pixi_demo from "#lib/scenes/pixi-demo.js";
  import { app, Scenes } from "#lib/legacy/index.js";
  import { wait } from "#lib/core/utils.ts";

  const scene_a = Scenes.create(async () => {
    return {
      name: "scene_a",

      enter: () => {
        console.log("Enter scene_a");
        return () => {
          console.log("Dismounting scene_a");
        };
      },

      update(t) {},
    };
  });

  async function initialize() {
    await Scenes.switch(pixi_demo);
    await Scenes.push(scene_a);
    await Scenes.pop();
    await Scenes.push(scene_a);
    await Scenes.pop();
    await Scenes.pop();
    await Scenes.switch(pixi_demo);
  }
</script>

<Game onStart={initialize} />
