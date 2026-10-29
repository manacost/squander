<script lang="ts">
  import GameHost from "../svelte/GameHost.svelte";
  import { create_camera, create_game, create_path, create_polygon, degrees, flatten_path, rgba, type RuntimeGame } from "../core/index.js";
  import type { GameBridge } from "../core/runtime/bridge.js";
  import type { RenderCommand, WebGpuRenderer, WebGpuTexture } from "../core/runtime/webgpu_renderer.js";

  type Props = { slug: string };
  type ExampleState = Readonly<{ status: "loading" | "ready"; ticks: number }>;
  type ExampleCommands = Record<string, never>;

  let { slug }: Props = $props();
  let active_game: RuntimeGame | undefined;
  let texture: WebGpuTexture | undefined;
  let linear_texture: WebGpuTexture | undefined;
  let angle = 0;

  const create_demo_texture = (renderer: WebGpuRenderer, filtering?: { magnification: "nearest" | "linear" }): WebGpuTexture => {
    const pixels = new Uint8Array([
      255, 205, 92, 255, 32, 42, 68, 255, 32, 42, 68, 255, 255, 205, 92, 255, 255, 205, 92, 255, 32, 42, 68, 255, 32, 42, 68, 255, 255, 205,
      92, 255,
    ]);
    return renderer.create_texture(pixels, 2, 2, filtering);
  };

  const create_demo_blob = async (): Promise<Blob> => {
    const source = document.createElement("canvas");
    source.width = 2;
    source.height = 2;
    const context = source.getContext("2d");
    if (context === null) throw new Error("Canvas 2D preparation is unavailable");
    context.fillStyle = "#ffcd5c";
    context.fillRect(0, 0, 1, 1);
    context.fillRect(1, 1, 1, 1);
    context.fillStyle = "#202a44";
    context.fillRect(1, 0, 1, 1);
    context.fillRect(0, 1, 1, 1);
    const blob = await new Promise<Blob>((resolve, reject) => {
      source.toBlob(
        (next_blob) => (next_blob === null ? reject(new Error("could not encode example texture")) : resolve(next_blob)),
        "image/png",
      );
    });
    return blob;
  };

  const draw_example = (renderer: WebGpuRenderer, ticks: number): void => {
    const commands: RenderCommand[] = [
      { kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 800, height: 450 }, color: rgba(0.04, 0.05, 0.09, 1) } },
    ];
    if (slug === "shape-drawing") {
      commands.push(
        { kind: "rectangle", draw: { rectangle: { x: 80, y: 100, width: 180, height: 100 }, color: rgba(0.2, 0.5, 1, 1) } },
        { kind: "circle", draw: { circle: { x: 400, y: 150, radius: 60 }, color: rgba(1, 0.35, 0.35, 1) } },
        { kind: "line", draw: { line: { from: { x: 540, y: 210 }, to: { x: 720, y: 80 } }, stroke_width: 8, color: rgba(0.3, 1, 0.4, 1) } },
      );
    } else if (slug === "paths-and-polygons") {
      const path = create_path([
        { kind: "move", x: 80, y: 260 },
        { kind: "quadratic", control_x: 300, control_y: 80, x: 520, y: 260 },
      ]);
      const polygon = create_polygon([
        { x: 610, y: 120 },
        { x: 730, y: 180 },
        { x: 650, y: 300 },
        { x: 560, y: 220 },
      ]);
      commands.push(
        { kind: "stroke", draw: { subpaths: flatten_path(path.get_commands(), 0.5), width: 8, color: rgba(1, 0.8, 0.25, 1) } },
        { kind: "polygon", draw: { points: polygon.get_points(), color: rgba(0.3, 0.8, 1, 0.9) } },
        { kind: "polygon_outline", draw: { points: polygon.get_points(), stroke_width: 5, color: rgba(1, 1, 1, 1) } },
      );
    } else if (slug === "camera-2d") {
      const camera = create_camera({
        x: 400,
        y: 225,
        zoom: 1.5,
        rotation: degrees(10),
        viewport: { logical_width: 800, logical_height: 450 },
      });
      camera.draw(() => {
        commands.push(
          { kind: "rectangle", draw: { rectangle: { x: 250, y: 150, width: 300, height: 150 }, color: rgba(0.25, 0.55, 1, 0.9) } },
          { kind: "circle", draw: { circle: { x: 400, y: 225, radius: 42 }, color: rgba(1, 0.7, 0.2, 1) } },
        );
      });
    } else if (slug === "viewport-sizing") {
      const viewport = renderer.get_viewport();
      commands.push(
        {
          kind: "rectangle_outline",
          draw: {
            rectangle: { x: 20, y: 20, width: viewport.logical_width - 40, height: viewport.logical_height - 40 },
            stroke_width: 8,
            color: rgba(0.3, 0.8, 1, 1),
          },
        },
        {
          kind: "circle",
          draw: { circle: { x: viewport.logical_width / 2, y: viewport.logical_height / 2, radius: 44 }, color: rgba(1, 0.7, 0.2, 1) },
        },
      );
    } else if (slug === "texture-filtering") {
      if (texture !== undefined && linear_texture !== undefined) {
        commands.push(
          { kind: "texture", draw: { texture, options: { x: 80, y: 80, width: 260, height: 260 } } },
          { kind: "texture", draw: { texture: linear_texture, options: { x: 460, y: 80, width: 260, height: 260 } } },
        );
      }
    } else if (texture !== undefined) {
      commands.push({
        kind: "texture",
        draw: {
          texture,
          options: { x: 280, y: 95, width: 240, height: 240, rotation: angle, origin: { x: 0.5, y: 0.5 }, tint: rgba(1, 0.9, 0.75, 1) },
        },
      });
      if (slug === "sprite-drawing") {
        commands.push({
          kind: "texture",
          draw: { texture, options: { x: 90, y: 90, width: 120, height: 120, flip_x: true, tint: rgba(0.4, 0.8, 1, 1), opacity: 0.85 } },
        });
      }
    }
    if (
      slug === "game-lifecycle" ||
      slug === "game-timing" ||
      slug === "asset-loading" ||
      slug === "dynamic-assets" ||
      slug === "resource-ownership" ||
      slug === "webgpu-runtime"
    ) {
      commands.push({
        kind: "circle",
        draw: { circle: { x: 400 + Math.cos(angle) * 120, y: 225 + Math.sin(angle) * 80, radius: 34 }, color: rgba(0.35, 1, 0.55, 1) },
      });
    }
    void renderer.draw_commands(commands);
  };

  const create_example = ({
    canvas,
    publish,
  }: {
    canvas: HTMLCanvasElement;
    bridge: GameBridge<ExampleState, ExampleCommands>;
    publish: (state: ExampleState) => void;
  }): RuntimeGame => {
    const game = create_game({
      renderer: { canvas, width: 800, height: 450 },
      scheduler: {
        request_frame: (callback) => requestAnimationFrame(callback),
        cancel_frame: (handle) => cancelAnimationFrame(handle as number),
        now_seconds: () => performance.now() / 1000,
      },
      setup: async ({ renderer, assets, resources }) => {
        if (slug === "asset-loading") {
          texture = await assets.load_texture(await create_demo_blob(), { magnification: "nearest" }).then((handle) => handle.read());
        } else if (slug === "dynamic-assets") {
          const file = new File([await create_demo_blob()], "example.png", { type: "image/png" });
          texture = await assets.load_texture(file, { magnification: "nearest" }).then((handle) => handle.read());
        } else if (slug === "resource-ownership") {
          const owned_texture = create_demo_texture(renderer, { magnification: "nearest" });
          texture = resources.acquire(owned_texture, (resource) => resource.release()).read();
        } else {
          texture = create_demo_texture(renderer, { magnification: "nearest" });
        }
        if (slug === "texture-filtering") linear_texture = create_demo_texture(renderer, { magnification: "linear" });
        publish({ status: "ready", ticks: 0 });
      },
      update: ({ delta_seconds }) => {
        angle += delta_seconds;
        publish({ status: "ready", ticks: Math.round(angle * 60) });
      },
      draw: () => {
        if (active_game !== undefined) draw_example(active_game.renderer, Math.round(angle * 60));
      },
    });
    active_game = game;
    return game;
  };
</script>

<GameHost class="core-example-canvas" initial_state={{ status: "loading", ticks: 0 }} commands={{}} create={create_example}>
  {#snippet children(view)}
    <div class="example-meta">
      <span>live rendering</span>
      <output data-testid={`core-example-status-${slug}`}>{view.state.status}</output>
      <output data-testid={`core-example-ticks-${slug}`}>ticks {view.state.ticks}</output>
    </div>
    {#if view.error}<output data-testid={`core-example-error-${slug}`}
        >{view.error instanceof Error ? view.error.message : "example failed"}</output
      >{/if}
  {/snippet}
</GameHost>

<style>
  :global(.core-example-canvas) {
    display: block;
    width: min(100%, 800px);
    height: auto;
    aspect-ratio: 16 / 9;
    background: #05070d;
    border: 1px solid #39435b;
  }
  .example-meta {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    color: var(--gray-6);
    font-size: 0.85rem;
  }
</style>
