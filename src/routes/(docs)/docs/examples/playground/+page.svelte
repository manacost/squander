<script lang="ts">
  import GameHost from "../../../../../lib/svelte/GameHost.svelte";
  import {
    create_camera,
    create_game,
    create_path,
    create_polygon,
    flatten_path,
    rgba,
    type RuntimeGame,
  } from "../../../../../lib/core/index.js";
  import type { GameBridge } from "../../../../../lib/core/runtime/bridge.js";
  import type { WebGpuFont, WebGpuTexture } from "../../../../../lib/core/runtime/index.js";
  import type { GameAdapterView } from "../../../../../lib/svelte/adapter.js";

  type PlaygroundState = Readonly<{
    status: "loading" | "ready" | "paused" | "asset-error" | "disposed";
    generation: number;
    asset_error: string | null;
    ticks: number;
    fps: number;
  }>;
  type PlaygroundCommands = {
    pause: () => void;
    resume: () => void;
    fail_asset: () => Promise<void>;
  };
  const playground_characters = [
    "0123456789",
    " !@#$%^&*()-_=+[]{};:'\",.<>/?\\|~`",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "abcdefghijklmnopqrstuvwxyz",
  ].join("");
  const character_rows = ["0123456789 !@#$%^&*()-_=+[]{};:'\",.<>/?\\|~`", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"];

  let active_game: RuntimeGame | undefined;
  let publish_state: ((state: PlaygroundState) => void) | undefined;
  let generation = 0;
  let status: PlaygroundState["status"] = "loading";
  let asset_error: string | null = null;
  let ticks = 0;
  let fps = 0;
  let fps_elapsed = 0;
  let fps_frames = 0;
  let simulation_paused = false;
  let texture: WebGpuTexture | undefined;
  let font: WebGpuFont | undefined;
  const camera = create_camera({ x: 400, y: 225, viewport: { logical_width: 800, logical_height: 450 } });
  const polygon = create_polygon([
    { x: 520, y: 120 },
    { x: 590, y: 120 },
    { x: 555, y: 180 },
  ]);
  const path = create_path([
    { kind: "move", x: 80, y: 260 },
    { kind: "quadratic", control_x: 260, control_y: 180, x: 450, y: 260 },
  ]);
  const publish_playground_state = (): void => {
    publish_state?.({ status, generation, asset_error, ticks, fps });
  };
  const commands: PlaygroundCommands = {
    pause: () => {
      active_game?.pause();
      simulation_paused = true;
      status = "paused";
      asset_error = null;
      publish_playground_state();
    },
    resume: () => {
      active_game?.resume();
      simulation_paused = false;
      status = "ready";
      asset_error = null;
      publish_playground_state();
    },
    fail_asset: async () => {
      if (active_game === undefined) return;
      try {
        await active_game.assets.load_texture(new Blob(["not-an-image"], { type: "image/png" }));
      } catch (error) {
        status = "asset-error";
        asset_error = error instanceof Error ? error.name : "asset failure";
        publish_playground_state();
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
      renderer: { canvas, width: 800, height: 450 },
      scheduler: {
        request_frame: (callback) => requestAnimationFrame(callback),
        cancel_frame: (handle) => {
          cancelAnimationFrame(handle as number);
        },
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
          source.toBlob((blob) => {
            if (blob === null) reject(new Error("could not encode playground texture"));
            else resolve(blob);
          }, "image/png");
        });
        const texture_handle = await assets.load_texture(image_blob, {
          magnification: "nearest",
          minification: "linear",
        });
        texture = texture_handle.read();
        font = await renderer.create_font_from_url('url("/fonts/GeostarFill-Regular.ttf")', {
          characters: playground_characters,
          size: 18,
        });
        generation += 1;
        status = "ready";
        asset_error = null;
        ticks = 0;
        fps = 0;
        fps_elapsed = 0;
        fps_frames = 0;
        publish_playground_state();
      },
      update: (time) => {
        if (simulation_paused) return;
        ticks += 1;
        fps_frames += 1;
        fps_elapsed += time.delta_seconds;
        if (fps_elapsed >= 0.25) {
          fps = Math.round(fps_frames / fps_elapsed);
          fps_elapsed = 0;
          fps_frames = 0;
          simulation_paused = false;
          publish_playground_state();
        }
      },
      draw: () => {
        if (texture === undefined || font === undefined) return;
        const current_texture = texture;
        const current_font = font;
        const stroke = flatten_path(path.get_commands(), 0.5);
        const polygon_points = polygon.get_points();
        void camera.draw(() =>
          active_game?.renderer.draw_commands([
            {
              kind: "texture",
              draw: {
                texture: current_texture,
                options: { x: 50, y: 50, width: 100, height: 100, rotation: 0.15, tint: rgba(1, 1, 1, 1) },
              },
            },
            { kind: "rectangle", draw: { rectangle: { x: 220, y: 70, width: 110, height: 70 }, color: rgba(0.2, 0.5, 1, 0.8) } },
            { kind: "circle", draw: { circle: { x: 390, y: 105, radius: 40 }, color: rgba(1, 0.35, 0.35, 0.8) } },
            { kind: "polygon", draw: { points: polygon_points, color: rgba(0.3, 1, 0.4, 0.9) } },
            { kind: "stroke", draw: { subpaths: stroke, width: 3, color: rgba(1, 1, 1, 0.9) } },
            { kind: "text", draw: { font: current_font, text: "P", options: { x: 700, y: 80, size: 28, color: rgba(1, 0.8, 0.25, 1) } } },
            ...character_rows.map((text, index) => ({
              kind: "text" as const,
              draw: { font: current_font, text, options: { x: 50, y: 300 + index * 30, size: 14, color: rgba(0.75, 0.85, 1, 1) } },
            })),
            {
              kind: "text",
              draw: {
                font: current_font,
                text: `TICKS ${String(ticks)}`,
                options: { x: 550, y: 410, size: 18, color: rgba(0.5, 0.85, 1, 1) },
              },
            },
            {
              kind: "text",
              draw: { font: current_font, text: `FPS ${String(fps)}`, options: { x: 700, y: 410, size: 18, color: rgba(0.5, 1, 0.65, 1) } },
            },
          ]),
        );
      },
    });
    active_game = game;
    return game;
  };
</script>

<svelte:head><title>Squander composition playground</title></svelte:head>

<GameHost
  class="playground-canvas"
  initial_state={{ status: "loading", generation: 0, asset_error: null, ticks: 0, fps: 0 }}
  {commands}
  create={create_playground}
>
  {#snippet children(view: GameAdapterView<PlaygroundState, typeof commands>)}
    <section data-testid="phase-2-playground">
      <p>status: <output data-testid="playground-status">{view.state.status}</output></p>
      <p>generation: <output data-testid="playground-generation">{view.state.generation}</output></p>
      <p>ticks: <output data-testid="playground-ticks">{view.state.ticks}</output></p>
      <p>fps: <output data-testid="playground-fps">{view.state.fps}</output></p>
      {#if view.error}<output data-testid="playground-error"
          >{view.error instanceof Error
            ? `${view.error.message}${view.error.cause instanceof Error ? `: ${view.error.cause.message}` : ""}`
            : "unknown error"}</output
        >{/if}
      {#if view.state.asset_error}<output data-testid="playground-asset-error">{view.state.asset_error}</output>{/if}
      <button
        data-testid="playground-pause"
        onclick={() => {
          view.commands.pause();
        }}>Pause</button
      >
      <button
        data-testid="playground-resume"
        onclick={() => {
          view.commands.resume();
        }}>Resume</button
      >
      <button data-testid="playground-fail-asset" onclick={() => void view.commands.fail_asset()}>Fail asset</button>
    </section>
  {/snippet}
</GameHost>

<style>
  :global(.playground-canvas) {
    display: block;
    width: min(100%, 960px);
    height: auto;
    aspect-ratio: 16 / 9;
    background: #000;
  }
</style>
