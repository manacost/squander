<script lang="ts">
  import Game from "#lib/ui/Game.svelte";
  import bridge from "#lib/scenes/bridge/index.js";
  import { Scenes } from "#lib/legacy/index.js";

  async function initialize() {
    Scenes.switch(bridge);
  }
</script>

<Game onStart={initialize} />
