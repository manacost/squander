<script lang="ts">
  import { Game, type GameReadyContext, type SvelteSceneFactory } from "../../../../../lib/svelte/index.js";
  import CodeBlock from "../../../../../lib/docs/CodeBlock.svelte";
  import Panel from "./Panel.svelte";

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
  <p>Build Svelte UI inside a scene, mount it when the scene enters, and let the scene lifecycle dispose it.</p>
  <p>
    A <code>Game</code> host owns its canvas and its private UI layer. A scene owns the UI handles it creates, so switching or removing a scene
    removes its UI without affecting another game host.
  </p>

  <h2>Read the live example</h2>
  <p>Use the demos to see the ownership rules in action:</p>
  <ul>
    <li>The first host mounts two panels, updates one, and switches to a second scene.</li>
    <li>The second host runs independently, even though it uses the same component and scene factory.</li>
    <li>The teardown host is removed while its scene is mounted. Its UI is disposed with the host.</li>
    <li>The pending host is removed while scene setup is waiting. A later mount attempt is rejected instead of publishing stale UI.</li>
    <li>The failed host mounts during <code>enter</code>, then throws. The host reports the error and keeps no partial scene UI.</li>
  </ul>
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

  <h2>Mount UI when the scene enters</h2>
  <p>
    Call <code>create_ui</code> in the scene factory. It returns a typed <code>UiHandle</code>, not a global component reference. Mount the
    handle in <code>enter</code> so the component appears only while the scene is active.
  </p>
  <CodeBlock
    language="svelte"
    code={"<" +
      `script lang="ts">
  import { Game } from "squander/svelte";
  import { start_game } from "./game/init.js";
` +
      "</" +
      `script>

<Game onReady={start_game} />`}
  />
  <CodeBlock
    code={`export const start_game = async ({ scenes }) => {
  const menu = scenes.create(({ create_ui }) => {
    const panel = create_ui(StatusPanel, { label: "Ready" });
    return {
      name: "menu",
      enter: () => panel.mount(),
    };
  });
  await scenes.switch(menu);
};`}
  />

  <h2>Switch scenes and clean up UI</h2>
  <p>
    <code>scenes.switch</code> leaves the current scene before entering the next one. The old scene’s UI is disposed before the new scene publishes
    its UI.
  </p>
  <CodeBlock
    code={`const first_scene = scenes.create(({ create_ui }) => {
  const panel = create_ui(StatusPanel, { label: "First scene" });
  return {
    name: "first",
    enter: () => panel.mount(),
  };
});

const second_scene = scenes.create(({ create_ui }) => {
  const panel = create_ui(StatusPanel, { label: "Second scene" });
  return { name: "second", enter: () => panel.mount() };
});

await scenes.switch(first_scene);
await scenes.switch(second_scene);`}
  />

  <h2>Compose typed events with UI</h2>
  <p>
    Scene UI can consume the same typed event bus as the rest of the game. Keep the event subscription in the scene lifecycle so the
    subscription ends with the scene.
  </p>
  <CodeBlock
    code={`type Events = { score: { points: number } };
const start_game = async ({ scenes, events }: GameReadyContext<{}, Events>) => {
  const scene = scenes.create(({ create_ui }) => {
    const panel = create_ui(StatusPanel, { label: "waiting" });
    return {
      name: "score panel",
      enter: async ({ events: scene_events }) => {
        await panel.mount();
        return scene_events.on("score", ({ points }) => {
          panel.update({ label: String(points) });
        });
      },
    };
  });
  await scenes.switch(scene);
  events.emit("score", { points: 10 });
};`}
  />

  <h2>Understand ownership and failure behavior</h2>
  <ul>
    <li>The <code>Game</code> host owns one private UI root. Two hosts do not share scene UI.</li>
    <li>
      The scene owns each handle returned by <code>create_ui</code>. Removing, replacing, or disposing the scene disposes its handles.
    </li>
    <li>
      <code>mount()</code> is asynchronous and idempotent after the first successful mount. <code>update()</code> requires a mounted handle.
    </li>
    <li>A mount that starts after disposal rejects. Updates after disposal do not publish stale UI.</li>
    <li>
      An uncaught error in <code>init</code> or <code>enter</code> fails the parent game. The failed scene does not leave partial UI behind.
    </li>
  </ul>

  <h2>Public types and constraints</h2>
  <p>
    <code>GameReadyContext&lt;Manifest, EventMap&gt;</code> provides scenes, assets, events, and the game abort signal.
    <code>SvelteSceneFactoryContext</code>
    adds <code>create_ui</code> to the core scene factory context. <code>SvelteScenes</code> creates, switches, mounts, removes, and
    replaces scene factories. <code>UiHandle&lt;Props&gt;</code> exposes <code>mount()</code>, <code>update(patch)</code>, and
    <code>dispose()</code>.
  </p>
  <p>
    TypeScript checks the component props passed to <code>create_ui</code> and the payloads sent through the typed event bus. The core runtime
    stays Svelte-independent; this scene UI bridge is available through the Svelte game host.
  </p>
  <CodeBlock
    language="svelte"
    code={"<" +
      `script lang="ts">
  let { label }: { label: string } = $props();
` +
      "</" +
      `script>

<section aria-label="Scene status">
  <h3>{label}</h3>
</section>`}
  />
  <p>
    This feature does not provide global UI state, a Svelte store, a widget library, or automatic action mapping. Keep those policies in
    your game layer until a later API defines them explicitly.
  </p>
</article>

<style>
  :global(.scene-ui-game) {
    height: 240px;
    width: 100%;
  }
</style>
