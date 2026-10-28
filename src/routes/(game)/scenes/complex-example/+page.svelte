<script lang="ts">
  import Game from "#lib/ui/Game.svelte";
  import complex_example from "#lib/scenes/complex-ui/battle_test.js";
  import { Scenes } from "#lib/legacy/index.js";

  async function initialize() {
    Scenes.switch(complex_example);
  }
</script>

<Game onStart={initialize} />
