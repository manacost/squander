<script lang="ts">
  import { Game, type GameReadyContext, type SvelteSceneFactory } from "../../../lib/svelte/index.js";
  import Panel from "./Panel.svelte";

  let release_scene_ui_switch!: () => void;
  const scene_ui_switch_gate = new Promise<void>((resolve) => {
    release_scene_ui_switch = resolve;
  });
  globalThis.__release_scene_ui_switch = release_scene_ui_switch;

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
              globalThis.__scene_ui_late_mount_rejected = true;
            }
            ui.update({ label: "must not publish" });
          },
          onUpdate: () => {
            ui.update({ label: "updated scene" });
          },
        });
        const status_ui = create_ui(Panel, { label: "secondary", onAdvance: () => Promise.resolve() });
        return {
          name: "first",
          enter: async () => {
            await ui.mount();
            await status_ui.mount();
          },
          draw: () => {
            void renderer.clear({ red: 0.05, green: 0.15, blue: 0.35, alpha: 1 }).then((pixels) => {
              globalThis.__scene_ui_readback = pixels;
            });
          },
        };
      });
      next_scene = ({ create_ui }) => {
        const ui = create_ui(Panel, { label: "second scene", onAdvance: () => Promise.resolve() });
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
      globalThis.__pending_scene_ui = ui;
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
      const ui = create_ui(Panel, { label: "failed scene UI", onAdvance: () => Promise.resolve() });
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

<style>
  :global(.scene-ui-game) {
    height: 240px;
    width: 100%;
  }
</style>
