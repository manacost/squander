<script lang="ts">
  import Game from "#lib/ui/Game.svelte";
  import pixi_demo from "#lib/scenes/pixi-demo.js";
  import { Scenes } from "#lib/index.js";

  async function initialize() {
    Scenes.switch(pixi_demo);
  }
</script>

<Game onStart={initialize} />
