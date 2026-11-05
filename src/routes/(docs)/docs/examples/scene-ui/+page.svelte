<script lang="ts">
  import { Game, type GameReadyContext, type SvelteSceneFactory } from "../../../../../lib/svelte/index.js";
  import type { SceneHandle } from "../../../../../lib/core/index.js";
  import CodeBlock from "../../../../../lib/docs/CodeBlock.svelte";
  import StackPanel from "./StackPanel.svelte";

  let pause_handle: SceneHandle | undefined;
  let dialogue_handle: SceneHandle | undefined;

  const start_game = async ({ scenes }: GameReadyContext): Promise<void> => {
    const gameplay_scene: SvelteSceneFactory = ({ renderer }) => ({
      name: "gameplay",
      draw: () => {
        void renderer.clear({ red: 0.05, green: 0.13, blue: 0.28, alpha: 1 });
      },
    });

    const pause_scene: SvelteSceneFactory = ({ create_ui }) => {
      const ui = create_ui(StackPanel, {
        title: "Pause scene",
        body: "A temporary scene can own a modal without taking ownership of the gameplay scene.",
        actions: [
          {
            label: "Resume",
            run: async () => {
              if (pause_handle === undefined) return;
              const handle = pause_handle;
              pause_handle = undefined;
              await scenes.remove(handle);
            },
          },
        ],
      });
      return { name: "pause", enter: () => ui.mount() };
    };

    const dialogue_scene: SvelteSceneFactory = ({ create_ui }) => {
      const ui = create_ui(StackPanel, {
        title: "Dialogue scene",
        body: "Dialogue, inventory, maps, and tooltips can be independent layers with their own lifecycle.",
        actions: [
          {
            label: "Close dialogue",
            run: async () => {
              if (dialogue_handle === undefined) return;
              const handle = dialogue_handle;
              dialogue_handle = undefined;
              await scenes.remove(handle);
            },
          },
        ],
      });
      return { name: "dialogue", enter: () => ui.mount() };
    };

    const hud_scene: SvelteSceneFactory = ({ create_ui }) => {
      const ui = create_ui(StackPanel, {
        title: "HUD scene",
        body: "This layer stays mounted while the world runs underneath it.",
        actions: [
          {
            label: "Pause",
            run: async () => {
              pause_handle ??= await scenes.mount(pause_scene, { index: 2 });
            },
          },
          {
            label: "Dialogue",
            run: async () => {
              dialogue_handle ??= await scenes.mount(dialogue_scene, { index: 2 });
            },
          },
        ],
      });
      return { name: "HUD", enter: () => ui.mount() };
    };

    await scenes.mount(gameplay_scene, { index: 0 });
    await scenes.mount(hud_scene, { index: 1 });
  };
</script>

<svelte:head><title>Scene-owned UI</title></svelte:head>

<article>
  <h1>Scene-owned UI</h1>
  <p>Compose game UI as scenes so each layer owns its DOM, input, and cleanup.</p>

  <Game class="scene-ui-game" onReady={start_game} />

  <h2>What this example shows</h2>
  <p>
    The game starts with a gameplay scene and a HUD scene. Use the HUD actions to add a pause or dialogue scene above them, then remove that
    layer without rebuilding the world or HUD.
  </p>
  <p>
    Scenes update and draw from the bottom of the stack to the top. Scene UI follows the same order in the private UI layer, so a later
    modal can appear above a persistent HUD while the underlying scenes remain alive.
  </p>

  <h2>Mount a persistent layer</h2>
  <CodeBlock
    code={`const gameplay = scenes.create(({ renderer }) => ({
  name: "gameplay",
  draw: () => renderer.clear(world_color),
}));

const hud = scenes.create(({ create_ui }) => {
  const panel = create_ui(HudPanel, { ... });
  return { name: "HUD", enter: () => panel.mount() };
});

await scenes.mount(gameplay, { index: 0 });
await scenes.mount(hud, { index: 1 });`}
  />

  <h2>Add and remove temporary layers</h2>
  <CodeBlock
    code={`let pause_handle;

pause_handle = await scenes.mount(pause_scene, { index: 2 });
await scenes.remove(pause_handle);`}
  />
  <p>
    Use this pattern for pause menus, dialogue, inventory, maps, tooltips, debug overlays, and other layers that should have explicit
    lifetime. A scene can also provide input handling, subscriptions, assets, and enter cleanup alongside its UI.
  </p>

  <h2>Why the handle is typed</h2>
  <p>
    <code>create_ui</code> checks component props at compile time and returns a scene-owned <code>UiHandle</code>. Mounting is explicit,
    updates are typed, and removing the scene disposes every handle it created. The core runtime stays Svelte-independent; this bridge is
    available through the Svelte game host.
  </p>
</article>

<style>
  :global(.scene-ui-game) {
    height: 320px;
    width: 100%;
  }
</style>
