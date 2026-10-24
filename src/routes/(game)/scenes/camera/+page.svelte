<script lang="ts">
  import Game from "#lib/ui/Game.svelte";
  import camera from "#lib/scenes/camera.js";
  import { Scenes } from "#lib/index.js";

  async function initialize() {
    Scenes.switch(camera);
  }
</script>

<Game onStart={initialize} />
