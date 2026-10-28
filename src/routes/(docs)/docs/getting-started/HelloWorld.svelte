<script lang="ts">
  import { app, Game, Scenes } from "#lib/legacy/index.ts";
  import { Text } from "pixi.js";

  const hello_world_scene = Scenes.create(async () => {
    return {
      name: "hello_world",
      enter: () => {
        const text = new Text({
          text: "Hello World",
          x: app.canvas.width / 2,
          y: app.canvas.height / 2,
        });

        app.stage.addChild(text);

        // a function returned from 'enter' is the same as exit
        return () => {
          app.stage.removeChild(text);
        };
      },
      update: (t) => {},
    };
  });

  async function init() {
    Scenes.switch(hello_world_scene);
  }
</script>

<div class="constrained">
  <Game onStart={init} />
</div>

<style>
  .constrained {
    aspect-ratio: 1;
    max-width: 90%;
  }
  :global(.constrained .game-target canvas) {
    width: 100%;
    height: 100%;
  }
</style>
