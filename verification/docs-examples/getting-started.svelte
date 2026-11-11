<script lang="ts">
  import { Game, type GameReadyContext } from "squander/svelte";
  import type { SceneFactoryContext } from "squander/core/runtime";

  const start_game = async ({ scenes }: GameReadyContext): Promise<void> => {
    await scenes.mount(({ renderer }: SceneFactoryContext) => ({
      name: "main",
      draw: () => {
        void renderer.clear({ red: 0.05, green: 0.08, blue: 0.15, alpha: 1 });
      },
    }));
  };
</script>

<Game class="game-canvas" onReady={start_game} />
