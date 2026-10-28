<script lang="ts">
  import GameHost from "../../../../../lib/svelte/GameHost.svelte";
  import {
    create_camera,
    create_game,
    create_path,
    create_polygon,
    create_stroke_geometry,
    flatten_path,
    rgba,
    type RuntimeGame,
  } from "../../../../../lib/core/index.js";
  import type { GameBridge } from "../../../../../lib/core/runtime/bridge.js";
  import type { WebGpuFont, WebGpuTexture } from "../../../../../lib/core/runtime/index.js";

  type PlaygroundState = Readonly<{
    status: "loading" | "ready" | "paused" | "asset-error" | "disposed";
    generation: number;
    asset_error: string | null;
  }>;
  type PlaygroundCommands = {
    pause: () => void;
    resume: () => void;
    fail_asset: () => Promise<void>;
  };

  let active_game: RuntimeGame | undefined;
  let publish_state: ((state: PlaygroundState) => void) | undefined;
  let generation = 0;
  let texture: WebGpuTexture | undefined;
  let font: WebGpuFont | undefined;
  const camera = create_camera({ viewport: { logical_width: 320, logical_height: 180 } });
  const polygon = create_polygon([
    { x: 210, y: 90 },
    { x: 250, y: 90 },
    { x: 230, y: 125 },
  ]);
  const path = create_path([
    { kind: "move", x: 24, y: 142 },
    { kind: "quadratic", control_x: 90, control_y: 100, x: 150, y: 142 },
  ]);
  const commands: PlaygroundCommands = {
    pause: () => {
      active_game?.pause();
      publish_state?.({ status: "paused", generation, asset_error: null });
    },
    resume: () => {
      active_game?.resume();
      publish_state?.({ status: "ready", generation, asset_error: null });
    },
    fail_asset: async () => {
      if (active_game === undefined) return;
      try {
        await active_game.assets.load_texture(new Blob(["not-an-image"], { type: "image/png" }));
      } catch (error) {
        publish_state?.({ status: "asset-error", generation, asset_error: error instanceof Error ? error.name : "asset failure" });
      }
    },
  };

  const create_playground = ({
    canvas,
    publish,
  }: {
    canvas: HTMLCanvasElement;
    bridge: GameBridge<PlaygroundState, PlaygroundCommands>;
    publish: (state: PlaygroundState) => void;
  }): RuntimeGame => {
    publish_state = publish;
    const game = create_game({
      renderer: { canvas, width: 320, height: 180 },
      scheduler: {
        request_frame: (callback) => requestAnimationFrame(callback),
        cancel_frame: (handle) => cancelAnimationFrame(handle as number),
        now_seconds: () => performance.now() / 1000,
      },
      setup: async ({ assets, renderer }) => {
        const source = document.createElement("canvas");
        source.width = 32;
        source.height = 32;
        const source_context = source.getContext("2d");
        if (source_context === null) throw new Error("Canvas 2D preparation is unavailable");
        source_context.fillStyle = "#202a44";
        source_context.fillRect(0, 0, 32, 32);
        source_context.fillStyle = "#ffcc66";
        source_context.beginPath();
        source_context.arc(16, 16, 10, 0, Math.PI * 2);
        source_context.fill();
        const image_blob = await new Promise<Blob>((resolve, reject) => {
          source.toBlob((blob) => (blob === null ? reject(new Error("could not encode playground texture")) : resolve(blob)), "image/png");
        });
        const texture_handle = await assets.load_texture(image_blob, {
          magnification: "nearest",
          minification: "linear",
        });
        texture = texture_handle.read();
        font = await renderer.create_font_from_url('local("Arial")', { characters: "P", size: 18 });
        generation += 1;
        publish({ status: "ready", generation, asset_error: null });
      },
      update: () => undefined,
      draw: () => {
        if (texture === undefined || font === undefined) return;
        const stroke = flatten_path(path.get_commands(), 0.5);
        const polygon_points = polygon.get_points();
        void camera.draw(() =>
          active_game?.renderer.draw_commands([
            {
              kind: "texture",
              draw: { texture: texture!, options: { x: 18, y: 18, width: 48, height: 48, rotation: 0.15, tint: rgba(1, 1, 1, 1) } },
            },
            { kind: "rectangle", draw: { rectangle: { x: 86, y: 24, width: 48, height: 32 }, color: rgba(0.2, 0.5, 1, 0.8) } },
            { kind: "circle", draw: { circle: { x: 160, y: 40, radius: 18 }, color: rgba(1, 0.35, 0.35, 0.8) } },
            { kind: "polygon", draw: { points: polygon_points, color: rgba(0.3, 1, 0.4, 0.9) } },
            { kind: "stroke", draw: { subpaths: stroke, width: 3, color: rgba(1, 1, 1, 0.9) } },
            { kind: "text", draw: { font: font!, text: "P", options: { x: 276, y: 28, color: rgba(1, 0.8, 0.25, 1) } } },
          ]),
        );
      },
    });
    active_game = game;
    return game;
  };
</script>

<svelte:head><title>Phase 2 composition playground</title></svelte:head>

<GameHost initial_state={{ status: "loading", generation: 0, asset_error: null }} {commands} create={create_playground}>
  {#snippet children(view)}
    <section data-testid="phase-2-playground">
      <output data-testid="playground-status">{view.state.status}</output>
      <output data-testid="playground-generation">{view.state.generation}</output>
      {#if view.error}<output data-testid="playground-error"
          >{view.error instanceof Error
            ? `${view.error.message}${view.error.cause instanceof Error ? `: ${view.error.cause.message}` : ""}`
            : "unknown error"}</output
        >{/if}
      {#if view.state.asset_error}<output data-testid="playground-asset-error">{view.state.asset_error}</output>{/if}
      <button data-testid="playground-pause" onclick={() => view.commands.pause()}>Pause</button>
      <button data-testid="playground-resume" onclick={() => view.commands.resume()}>Resume</button>
      <button data-testid="playground-fail-asset" onclick={() => void view.commands.fail_asset()}>Fail asset</button>
    </section>
  {/snippet}
</GameHost>
