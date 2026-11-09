<script lang="ts">
  import { asset } from "$app/paths";
  import GameHost from "../../../../../lib/svelte/GameHost.svelte";
  import { create_game, type RuntimeGame } from "../../../../../lib/core/index.js";
  import type { GameBridge } from "../../../../../lib/core/runtime/bridge.js";
  import type { ResourceHandle } from "../../../../../lib/core/runtime/resource_ownership.js";
  import type { WebGpuTexture } from "../../../../../lib/core/runtime/webgpu_renderer.js";
  import type { GameAdapterView } from "../../../../../lib/svelte/adapter.js";

  type TextureState = Readonly<{
    status: "loading" | "ready";
    width: number;
    height: number;
    sample: string | null;
  }>;

  const initial_state: TextureState = { status: "loading", width: 0, height: 0, sample: null };
  let texture_handle: ResourceHandle<WebGpuTexture> | undefined;
  let publish_state: ((state: TextureState) => void) | undefined;
  let readback_started = false;

  const create_texture_game = ({
    canvas,
    publish,
  }: {
    canvas: HTMLCanvasElement;
    bridge: GameBridge<TextureState, Record<string, never>>;
    publish: (state: TextureState) => void;
  }): RuntimeGame => {
    publish_state = publish;
    const game = create_game({
      renderer: { canvas, width: 800, height: 450 },
      scheduler: {
        request_frame: (callback) => requestAnimationFrame(callback),
        cancel_frame: (handle) => {
          if (typeof handle === "number") cancelAnimationFrame(handle);
        },
        now_seconds: () => performance.now() / 1000,
      },
      setup: async ({ assets, signal }) => {
        const response = await fetch(asset("textures/player-ship.png"), { signal });
        if (!response.ok) throw new Error(`texture request failed with status ${String(response.status)}`);
        const texture_blob = await response.blob();
        texture_handle = await assets.load_texture(texture_blob, { filter: "nearest", signal });
        const texture = texture_handle.read();
        publish({ status: "ready", width: texture.width, height: texture.height, sample: null });
      },
      update: () => undefined,
      draw: () => {
        if (texture_handle === undefined || readback_started) return;
        readback_started = true;
        const texture = texture_handle.read();
        void game.renderer.draw_texture(texture, { x: 384, y: 209, width: 32, height: 32 }).then((pixels) => {
          let sample = "not found";
          for (let index = 0; index < pixels.length; index += 4) {
            if (pixels[index] === 217 && pixels[index + 1] === 87 && pixels[index + 2] === 99 && pixels[index + 3] === 255) {
              sample = "217,87,99,255";
              break;
            }
          }
          publish_state?.({
            status: "ready",
            width: texture.width,
            height: texture.height,
            sample,
          });
        });
      },
    });
    return game;
  };
</script>

<svelte:head><title>Texture loading</title></svelte:head>

<article>
  <h1>Texture loading</h1>
  <p>
    This example fetches a bundled PNG with a base-aware URL, decodes it through <code>createImageBitmap</code>, and uploads its pixels to
    WebGPU through the game-owned asset cache.
  </p>

  <GameHost class="texture-demo-canvas" {initial_state} commands={{}} create={create_texture_game}>
    {#snippet children(view: GameAdapterView<TextureState, Record<string, never>>)}
      <section data-testid="texture-demo">
        <p>status: <output data-testid="texture-status">{view.state.status}</output></p>
        <p>dimensions: <output data-testid="texture-dimensions">{view.state.width} × {view.state.height}</output></p>
        <p>GPU sample: <output data-testid="texture-sample">{view.state.sample ?? "waiting"}</output></p>
        {#if view.error}<output data-testid="texture-error">{view.error instanceof Error ? view.error.message : "unknown error"}</output
          >{/if}
      </section>
    {/snippet}
  </GameHost>

  <h2>What this demonstrates</h2>
  <ul>
    <li>A static PNG resolved with SvelteKit's base-aware <code>asset</code> helper.</li>
    <li>A checked <code>fetch</code> response converted to a <code>Blob</code> for <code>assets.load_texture</code>.</li>
    <li>Nearest-neighbor filtering for pixel art and a real WebGPU readback of the uploaded texture.</li>
    <li>Game-owned resource cleanup when the host is disposed.</li>
  </ul>

  <h2>Load a bundled texture</h2>
  <pre><code
      >{`const response = await fetch(asset("textures/player-ship.png"), { signal });
if (!response.ok) throw new Error(\`texture request failed: \${response.status}\`);
const texture = await assets.load_texture(await response.blob(), {
  filter: "nearest",
  signal,
});

renderer.draw_texture(texture.read(), {
  x: player.x,
  y: player.y,
});`}</code
    ></pre>

  <h2>Public type shape</h2>
  <p>
    <code>assets.load_texture</code> accepts a <code>Blob</code> or <code>File</code> and returns a
    <code>ResourceHandle&lt;WebGpuTexture&gt;</code>. The handle exposes the decoded width, height, filtering policy, and explicit
    <code>release</code> and <code>share</code> operations. The game resource owner also releases handles during game disposal.
  </p>
</article>

<style>
  :global(.texture-demo-canvas) {
    display: block;
    width: min(100%, 800px);
    height: auto;
    aspect-ratio: 16 / 9;
    background: #000;
  }
</style>
