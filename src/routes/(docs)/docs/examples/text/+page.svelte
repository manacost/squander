<script lang="ts">
  import GameHost from "../../../../../lib/svelte/GameHost.svelte";
  import CodeBlock from "../../../../../lib/docs/CodeBlock.svelte";
  import { create_game, rgba, type RuntimeGame } from "../../../../../lib/core/index.js";
  import type { GameBridge } from "../../../../../lib/core/runtime/bridge.js";
  import type { WebGpuFont } from "../../../../../lib/core/runtime/index.js";

  type TextState = Readonly<{ status: "loading" | "ready"; ticks: number }>;
  type TextCommands = Record<string, never>;

  let active_game: RuntimeGame | undefined;
  let font: WebGpuFont | undefined;
  let ticks = 0;
  const character_rows = ["0123456789", "!@#$%^&*()-_=+[]{};:'\",.<>/?\\|~`", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"];

  const create_text_game = ({
    canvas,
    publish,
  }: {
    canvas: HTMLCanvasElement;
    bridge: GameBridge<TextState, TextCommands>;
    publish: (state: TextState) => void;
  }): RuntimeGame => {
    const game = create_game({
      renderer: { canvas, width: 720, height: 420 },
      scheduler: {
        request_frame: (callback) => requestAnimationFrame(callback),
        cancel_frame: (handle) => cancelAnimationFrame(handle as number),
        now_seconds: () => performance.now() / 1000,
      },
      setup: async ({ assets }) => {
        const font_handle = await assets.load_font('url("/fonts/GeostarFill-Regular.ttf")', {
          characters: character_rows.join(""),
          size: 28,
        });
        font = font_handle.read();
        publish({ status: "ready", ticks });
      },
      update: () => {
        ticks += 1;
        publish({ status: "ready", ticks });
      },
      draw: () => {
        if (font === undefined) return;
        void active_game?.renderer.draw_commands([
          { kind: "text", draw: { font, text: "Bundled text works", options: { x: 32, y: 32, size: 30, color: rgba(1, 0.82, 0.3, 1) } } },
          ...character_rows.map((text, index) => ({
            kind: "text" as const,
            draw: { font: font!, text, options: { x: 32, y: 120 + index * 48, size: 24, color: rgba(0.65, 0.9, 1, 1) } },
          })),
          { kind: "text", draw: { font, text: `TICKS ${ticks}`, options: { x: 500, y: 370, size: 20, color: rgba(0.45, 1, 0.65, 1) } } },
        ]);
      },
    });
    active_game = game;
    return game;
  };
</script>

<svelte:head><title>Text drawing example</title></svelte:head>

<article class="text-example">
  <h1>Text drawing</h1>
  <p>
    This example loads a bundled font, prepares glyphs with Canvas 2D, and uploads reusable glyph textures to WebGPU. The live label changes
    without rebuilding one large label texture.
  </p>

  <GameHost class="text-canvas" initial_state={{ status: "loading", ticks: 0 }} commands={{}} create={create_text_game}>
    {#snippet children(view)}
      <p data-testid="text-example-status">status: {view.state.status}</p>
      <p data-testid="text-example-ticks">ticks: {view.state.ticks}</p>
      {#if view.error}<p data-testid="text-example-error">
          {view.error instanceof Error ? view.error.message : "unknown text initialization error"}
        </p>{/if}
    {/snippet}
  </GameHost>

  <h2>What you'll see</h2>
  <ul>
    <li>A bundled font loaded from <code>/fonts/GeostarFill-Regular.ttf</code>.</li>
    <li>Digits, common symbols, uppercase letters, and lowercase letters rendered as glyphs.</li>
    <li>Typed font ownership through <code>assets.load_font</code>.</li>
    <li>Reusable glyph preparation in a live WebGPU canvas.</li>
    <li>A tick label that changes every frame.</li>
  </ul>

  <h2>Load a font</h2>
  <CodeBlock
    code={`const font_handle = await assets.load_font(
  'url("/fonts/GeostarFill-Regular.ttf")',
  { characters: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", size: 28 },
);

const font = font_handle.read();`}
  />

  <h2>Draw text</h2>
  <CodeBlock
    code={`renderer.draw_commands([
  {
    kind: "text",
    draw: {
      font,
      text: \`Score: \${score}\`,
      options: {
        x: 32,
        y: 32,
        size: 24,
        color: rgba(1, 0.82, 0.3, 1),
        opacity: 1,
      },
    },
  },
]);`}
  />

  <h2>Text API</h2>
  <p>
    <code>FontOptions</code> accepts <code>characters</code>, <code>size</code>, <code>weight</code>,
    <code>style</code>, and filtering options. <code>TextDrawOptions</code> accepts position, size, color, opacity, and the active camera transform.
    Font handles are owned resources: release the handle when the font is no longer needed, or let the game-owned asset cache clean it up during
    disposal.
  </p>
  <p>
    Phase 2 intentionally does not promise wrapping, rich layout, shaping, fallback, or arbitrary-script coverage. Supported glyphs
    requested later are added to the non-evicting atlas until its typed 4096×4096 capacity limit is reached.
  </p>
</article>

<style>
  .text-example {
    width: 100%;
    max-width: 960px;
    min-width: 0;
  }
  :global(.text-canvas) {
    display: block;
    width: min(100%, 720px);
    height: auto;
    aspect-ratio: 12 / 7;
    background: #05070d;
    border: 1px solid #39435b;
  }
</style>
