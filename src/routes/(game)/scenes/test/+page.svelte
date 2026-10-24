<script lang="ts">
  import Game from "#lib/ui/Game.svelte";
  import test from "#lib/scenes/test.js";
  import projection from "#lib/scenes/projection.ts";
  import { Scenes } from "#lib/index.js";

  async function initialize() {
    Scenes.switch(projection);
  }
</script>

<Game onStart={initialize} />
