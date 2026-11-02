<script lang="ts">
  import { Game, type GameReadyContext, type SvelteSceneFactory } from "../../../../../lib/svelte/index.js";
  import CodeBlock from "../../../../../lib/docs/CodeBlock.svelte";
  import Panel from "./Panel.svelte";

  const script_close = "</" + "script>";

  let release_scene_ui_switch!: () => void;
  const scene_ui_switch_gate = new Promise<void>((resolve) => {
    release_scene_ui_switch = resolve;
  });
  (globalThis as { __release_scene_ui_switch?: () => void }).__release_scene_ui_switch = release_scene_ui_switch;

  const create_start_game =
    (first_label: string) =>
    async ({ scenes }: GameReadyContext): Promise<void> => {
      let next_scene!: SvelteSceneFactory;
      const first_scene = scenes.create(({ create_ui, scenes: scene_navigation, renderer }) => {
        const ui = create_ui(Panel, {
          label: first_label,
          onAdvance: async () => {
            ui.update({ label: "switching" });
            await scene_navigation.switch(next_scene);
            try {
              await ui.mount();
            } catch {
              (globalThis as { __scene_ui_late_mount_rejected?: boolean }).__scene_ui_late_mount_rejected = true;
            }
            ui.update({ label: "must not publish" });
          },
          onUpdate: () => {
            ui.update({ label: "updated scene" });
          },
        });
        const status_ui = create_ui(Panel, {
          label: "secondary",
          onAdvance: () => Promise.resolve(),
        });
        return {
          name: "first",
          enter: async () => {
            await ui.mount();
            await status_ui.mount();
          },
          draw: () => {
            void renderer.clear({ red: 0.05, green: 0.15, blue: 0.35, alpha: 1 }).then((pixels) => {
              (globalThis as { __scene_ui_readback?: Uint8Array }).__scene_ui_readback = pixels;
            });
          },
        };
      });
      next_scene = ({ create_ui }) => {
        const ui = create_ui(Panel, {
          label: "second scene",
          onAdvance: () => Promise.resolve(),
        });
        return {
          name: "second",
          enter: async () => {
            await ui.mount();
            await scene_ui_switch_gate;
          },
        };
      };
      await scenes.switch(first_scene);
    };

  const start_game = create_start_game("first scene");
  const second_start_game = create_start_game("second host");
  const teardown_start_game = async ({ scenes }: GameReadyContext): Promise<void> => {
    const teardown_scene: SvelteSceneFactory = ({ create_ui }) => {
      const ui = create_ui(Panel, { label: "teardown scene", onAdvance: () => Promise.resolve() });
      return { name: "teardown", enter: () => ui.mount() };
    };
    await scenes.switch(teardown_scene);
  };
  let startup_error = $state("");
  let show_teardown_game = $state(true);
  let show_pending_game = $state(true);
  const pending_setup = new Promise<void>(() => undefined);
  const pending_start_game = async ({ scenes }: GameReadyContext): Promise<void> => {
    const pending_scene: SvelteSceneFactory = ({ create_ui }) => {
      const ui = create_ui(Panel, { label: "pending scene", onAdvance: () => Promise.resolve() });
      (globalThis as { __pending_scene_ui?: { mount: () => Promise<void> } }).__pending_scene_ui = ui;
      return {
        name: "pending setup",
        enter: async () => {
          await ui.mount();
          await pending_setup;
        },
      };
    };
    await scenes.switch(pending_scene);
  };

  const fail_start_game = async ({ scenes }: GameReadyContext): Promise<void> => {
    const failed_scene: SvelteSceneFactory = ({ create_ui }) => {
      const ui = create_ui(Panel, {
        label: "failed scene UI",
        onAdvance: () => Promise.resolve(),
      });
      return {
        name: "failed setup",
        enter: async () => {
          await ui.mount();
          throw new Error("scene UI startup failed");
        },
      };
    };
    await scenes.switch(failed_scene);
  };
</script>

<svelte:head><title>Scene-owned UI</title></svelte:head>

<article>
  <h1>Scene-owned UI</h1>
  <p>Each scene creates and owns the Svelte UI it needs. The game host owns the canvas and internal UI layer.</p>
  <p>
    This example covers scene navigation, UI ownership, and the composition seams for scene assets and typed events. State adapters and a
    global scene registry remain out of scope.
  </p>
  <Game class="scene-ui-game" onReady={start_game} />
  <Game class="scene-ui-game" onReady={second_start_game} />
  <button data-testid="remove-scene-ui-game" onclick={() => (show_teardown_game = false)}>Remove a game host</button>
  {#if show_teardown_game}
    <Game class="scene-ui-game" onReady={teardown_start_game} />
  {/if}
  <button data-testid="remove-pending-scene-ui-game" onclick={() => (show_pending_game = false)}>Remove a pending game host</button>
  {#if show_pending_game}
    <Game class="scene-ui-game" onReady={pending_start_game} />
  {/if}
  <Game class="scene-ui-game" onReady={fail_start_game} onError={(error) => (startup_error = String(error))} />
  <output data-testid="scene-ui-error">{startup_error}</output>

  <h2>Use a scene-owned UI</h2>
  <CodeBlock
    language="svelte"
    code={`<script lang="ts">
  import { Game } from "squander/svelte";
  import { start_game } from "./game/init.js";
${script_close}

<Game onReady={start_game} />`}
  />
  <CodeBlock
    code={`export const start_game = async ({ scenes }) => {
  const menu = scenes.create(({ create_ui }) => {
    const ui = create_ui(MainMenu, { onStart: async () => {} });
    return { name: "menu", enter: () => ui.mount() };
  });
  await scenes.switch(menu);
};`}
  />

  <h2>Compose assets, events, and UI</h2>
  <CodeBlock
    code={`type Events = { score: { points: number } };
const scene = scenes.create(({ assets, events, create_ui }) => {
  const panel = create_ui(MainMenu, { label: "loading" });
  return {
    name: "composed scene",
    dependencies: { hero: "hero" },
    enter: async ({ assets: scene_assets }) => {
      scene_assets.get("hero");
      await panel.mount();
      return events.on("score", ({ points }) => panel.update({ label: String(points) }));
    },
  };
});
game.scenes.events.emit("score", { points: 10 });`}
  />

  <h2>Public types</h2>
  <p>
    <code>GameReadyContext</code> supplies scene navigation and game assets. <code>SvelteScenes</code> creates, switches, mounts, removes,
    and replaces scene factories. <code>UiHandle</code> mounts, updates, and disposes one scene-owned component.
  </p>
  <p>
    Call <code>update()</code> only after <code>mount()</code>. Calling <code>mount()</code> after scene disposal rejects; later
    <code>update()</code> calls do nothing. Keep expected setup failures inside <code>init</code> or <code>enter</code>; uncaught lifecycle
    errors stop the parent game.
  </p>
</article>

<style>
  :global(.scene-ui-game) {
    height: 240px;
    width: 100%;
  }
</style>
