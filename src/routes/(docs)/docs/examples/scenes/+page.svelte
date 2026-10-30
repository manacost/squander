<script lang="ts">
  import GameHost from "../../../../../lib/svelte/GameHost.svelte";
  import { create_game, rgba, type GameBridge } from "../../../../../lib/core/index.js";
  import type { SceneFactory } from "../../../../../lib/core/runtime/scene.js";
  import type { RuntimeGame } from "../../../../../lib/core/index.js";
  import type { GameAdapterView } from "../../../../../lib/svelte/adapter.js";

  type SceneDemoState = Readonly<{
    status: "loading" | "ready" | "disposed";
    base_ticks: number;
    overlay_ticks: number;
  }>;

  type SceneDemoCommands = {
    remove_overlay: () => Promise<void>;
  };

  const initial_state: SceneDemoState = { status: "loading", base_ticks: 0, overlay_ticks: 0 };
  const no_op = (): void => {
    return;
  };
  const as_scene_view = (view: unknown): GameAdapterView<SceneDemoState, SceneDemoCommands> =>
    view as GameAdapterView<SceneDemoState, SceneDemoCommands>;

  const create_scene_demo = ({
    canvas,
    publish,
  }: {
    canvas: HTMLCanvasElement;
    bridge: GameBridge<SceneDemoState, SceneDemoCommands>;
    publish: (state: SceneDemoState) => void;
  }): RuntimeGame => {
    let base_ticks = 0;
    let overlay_ticks = 0;

    const report = (status: SceneDemoState["status"]): void => {
      publish({ status, base_ticks, overlay_ticks });
    };

    const make_base_scene: SceneFactory = ({ renderer }) => ({
      name: "base scene",
      update: () => {
        base_ticks += 1;
        report("ready");
      },
      draw: () => {
        void renderer.draw_commands([
          { kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 400, height: 225 }, color: rgba(0.05, 0.15, 0.35, 1) } },
          { kind: "rectangle", draw: { rectangle: { x: 80, y: 60, width: 260, height: 100 }, color: rgba(0.1, 0.45, 0.9, 1) } },
        ]).then((pixels) => {
          (globalThis as { __scene_readback?: Uint8Array }).__scene_readback = pixels;
        });
      },
    });

    const make_overlay_scene: SceneFactory = ({ renderer }) => ({
      name: "overlay scene",
      update: () => {
        overlay_ticks += 1;
        report("ready");
      },
      draw: () => {
        void renderer.draw_commands([
          { kind: "rectangle", draw: { rectangle: { x: 400, y: 0, width: 400, height: 225 }, color: rgba(0.35, 0.12, 0.05, 1) } },
          { kind: "rectangle", draw: { rectangle: { x: 460, y: 60, width: 260, height: 100 }, color: rgba(0.95, 0.55, 0.1, 1) } },
        ]).then((pixels) => {
          (globalThis as { __scene_readback?: Uint8Array }).__scene_readback = pixels;
        });
      },
    });

    const game = create_game({
      renderer: { canvas, width: 800, height: 450 },
      scheduler: {
        request_frame: (callback) => requestAnimationFrame(callback),
        cancel_frame: (handle) => {
          cancelAnimationFrame(handle as number);
        },
        now_seconds: () => performance.now() / 1000,
      },
      update: no_op,
      draw: no_op,
      setup: async () => {
        await game.scenes.mount(make_overlay_scene, { index: 1 });
        await game.scenes.mount(make_base_scene, { index: 0 });
        report("ready");
      },
    });
    return game;
  };
</script>

<svelte:head><title>Scene lifecycle</title></svelte:head>

<article>
  <h1>Scene lifecycle</h1>
  <p>
    Scenes are game-owned lifecycle objects. Mounting is asynchronous and atomic, active scenes update and draw from the bottom of the stack
    to the top, and removing a scene disposes it permanently.
  </p>

  <GameHost class="scene-demo-canvas" {initial_state} commands={{ remove_overlay: () => Promise.resolve() }} create={create_scene_demo}>
    {#snippet children(view)}
      {@const scene_view = as_scene_view(view)}
      <section data-testid="scene-demo">
        <p>status: <output data-testid="scene-status">{scene_view.state.status}</output></p>
        <p>base updates: <output data-testid="scene-base-ticks">{scene_view.state.base_ticks}</output></p>
        <p>overlay updates: <output data-testid="scene-overlay-ticks">{scene_view.state.overlay_ticks}</output></p>
        {#if scene_view.error}<output data-testid="scene-error"
            >{scene_view.error instanceof Error ? scene_view.error.message : "unknown error"}</output
          >{/if}
      </section>
    {/snippet}
  </GameHost>

  <h2>Public shape</h2>
  <pre><code
      >{`const handle = await game.scenes.mount(({ signal }) => ({
  name: "menu",
  init: async () => {
    if (signal.aborted) return;
  },
  update: (time) => {},
  draw: () => {},
}));

await game.scenes.remove(handle);`}</code
    ></pre>

  <h2>What this demonstrates</h2>
  <p>
    The example mounts two independent scenes into one game and reports their update counts. It does not yet demonstrate scene asset scopes,
    typed signals, or Svelte overlays; those are the next Phase 3-a slices.
  </p>
</article>

<style>
  :global(.scene-demo-canvas) {
    display: block;
    width: min(100%, 800px);
    height: auto;
    aspect-ratio: 16 / 9;
    background: #000;
  }
</style>
