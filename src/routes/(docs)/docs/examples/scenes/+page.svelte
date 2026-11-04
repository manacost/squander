<script lang="ts">
  import GameHost from "../../../../../lib/svelte/GameHost.svelte";
  import { create_game, rgba, type GameBridge } from "../../../../../lib/core/index.js";
  import type { RuntimeGame } from "../../../../../lib/core/index.js";
  import type { SceneFactory } from "../../../../../lib/core/runtime/scene.js";
  import type { WebGpuRenderer, WebGpuTexture } from "../../../../../lib/core/runtime/webgpu_renderer.js";
  import type { GameAdapterView } from "../../../../../lib/svelte/adapter.js";

  type SceneDemoState = Readonly<{
    status: "loading" | "ready" | "disposed";
    base_ticks: number;
    overlay_ticks: number;
  }>;

  type SceneDemoCommands = {
    remove_overlay: () => Promise<void>;
  };
  type SceneDemoManifest = {
    hero: { load: (signal: AbortSignal) => Promise<WebGpuTexture>; destroy: (resource: WebGpuTexture) => void };
  };

  type SceneEvidence = { asset_loads: number; asset_destroys: number; events: number; base_events: number; overlay_events: number };
  const scene_evidence: SceneEvidence = { asset_loads: 0, asset_destroys: 0, events: 0, base_events: 0, overlay_events: 0 };
  (globalThis as { __scene_evidence?: SceneEvidence }).__scene_evidence = scene_evidence;

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
    let asset_renderer: WebGpuRenderer | undefined;
    let base_ticks = 0;
    let overlay_ticks = 0;
    let overlay_handle: object | undefined;

    const report = (status: SceneDemoState["status"]): void => {
      publish({ status, base_ticks, overlay_ticks });
    };

    const make_base_scene: SceneFactory<SceneDemoManifest> = ({ renderer, assets, events }) => {
      asset_renderer = renderer;
      return {
        name: "base scene",
        dependencies: { hero: "hero" },
        init: () => {
          assets.get("hero");
          events.on("pulse", () => {
            scene_evidence.events += 1;
            scene_evidence.base_events += 1;
          });
        },
        update: () => {
          base_ticks += 1;
          report("ready");
        },
        draw: () => {
          void renderer
            .draw_commands([
              { kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 400, height: 225 }, color: rgba(0.05, 0.15, 0.35, 1) } },
              { kind: "rectangle", draw: { rectangle: { x: 80, y: 60, width: 260, height: 100 }, color: rgba(0.1, 0.45, 0.9, 1) } },
              { kind: "texture", draw: { texture: assets.get("hero").read(), options: { x: 0, y: 0, width: 64, height: 64 } } },
            ])
            .then((pixels) => {
              (globalThis as { __scene_readback?: Uint8Array }).__scene_readback = pixels;
            });
        },
      };
    };

    const make_overlay_scene: SceneFactory<SceneDemoManifest> = ({ renderer, assets, events }) => {
      asset_renderer = renderer;
      return {
        name: "overlay scene",
        dependencies: { hero: "hero" },
        init: () => {
          assets.get("hero");
          events.on("pulse", () => {
            scene_evidence.overlay_events += 1;
          });
        },
        update: () => {
          overlay_ticks += 1;
          events.emit("pulse", "overlay");
          report("ready");
        },
        draw: () => {
          void renderer
            .draw_commands([
              { kind: "rectangle", draw: { rectangle: { x: 400, y: 0, width: 400, height: 225 }, color: rgba(0.35, 0.12, 0.05, 1) } },
              { kind: "rectangle", draw: { rectangle: { x: 460, y: 60, width: 260, height: 100 }, color: rgba(0.95, 0.55, 0.1, 1) } },
              { kind: "texture", draw: { texture: assets.get("hero").read(), options: { x: 400, y: 0, width: 64, height: 64 } } },
            ])
            .then((pixels) => {
              (globalThis as { __scene_readback?: Uint8Array }).__scene_readback = pixels;
            });
        },
      };
    };

    const game = create_game<SceneDemoManifest>({
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
      manifest: {
        hero: {
          load: async (signal) => {
            scene_evidence.asset_loads += 1;
            if (asset_renderer === undefined) throw new Error("scene renderer is not ready");
            const source = document.createElement("canvas");
            source.width = 1;
            source.height = 1;
            const context = source.getContext("2d");
            if (context === null) throw new Error("demo image canvas is unavailable");
            context.fillStyle = "#ff00ff";
            context.fillRect(0, 0, 1, 1);
            const blob = await new Promise<Blob>((resolve, reject) => {
              source.toBlob((next_blob) => {
                if (next_blob === null) {
                  reject(new Error("demo image encoding failed"));
                } else {
                  resolve(next_blob);
                }
              }, "image/png");
            });
            return asset_renderer.create_texture_from_blob(blob, { filter: "nearest" }, signal);
          },
          destroy: (resource) => {
            resource.release();
            scene_evidence.asset_destroys += 1;
          },
        },
      },
      setup: async () => {
        overlay_handle = await game.scenes.mount(make_overlay_scene, { index: 1 });
        await game.scenes.mount(make_base_scene, { index: 0 });
        report("ready");
      },
    });
    (globalThis as { __remove_scene_overlay?: () => Promise<void>; __dispose_scene_demo?: () => Promise<void> }).__remove_scene_overlay =
      async () => {
        if (overlay_handle !== undefined) await game.scenes.remove(overlay_handle);
      };
    (globalThis as { __dispose_scene_demo?: () => Promise<void> }).__dispose_scene_demo = game.dispose;
    (globalThis as { __emit_scene_pulse?: () => void }).__emit_scene_pulse = () => {
      game.scenes.events.emit("pulse", "external");
    };
    return game as unknown as RuntimeGame;
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
    The example mounts two independent scenes into one game and reports their update counts. Scene factories also receive the game-owned
    typed event bus through <code>context.events</code>; use it for explicit scene communication without a global singleton. The shared
    manifest asset remains usable while one scene leaves. Scene-owned Svelte UI is implemented as a separate optional host capability; see
    the Scene UI demo for the
    <code>&lt;Game onReady&gt;</code> integration path.
  </p>

  <h2>Communicate through the scene bus</h2>
  <pre><code
      >{`type Events = { score: { points: number } };
const score_scene: SceneFactory<Manifest, Events> = ({ events }) => ({
  name: "score",
  enter: () => events.on("score", ({ points }) => console.log(points)),
});

game.scenes.events.emit("score", { points: 10 });`}</code
    ></pre>
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
