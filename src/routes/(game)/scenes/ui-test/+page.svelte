<script lang="ts">
  import Game from "#lib/ui/Game.svelte";
  import ui_test from "#lib/scenes/ui-test.js";
  import { Scenes } from "#lib/legacy/index.js";

  async function initialize() {
    Scenes.switch(ui_test);
  }
</script>

<Game onStart={initialize} />
