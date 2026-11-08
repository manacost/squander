<script lang="ts">
  import { resolve } from "$app/paths";
  import CodeBlock from "../../../../lib/docs/CodeBlock.svelte";
</script>

<svelte:head><title>Getting started · Squander</title></svelte:head>

<article class="getting-started">
  <h1>Getting started</h1>
  <p class="summary">
    Install Squander, create a browser-safe game instance, and get a clean update and draw loop running in your TypeScript project.
  </p>

  <h2>Install Squander</h2>
  <p>Squander targets modern browsers with WebGPU and requires Node.js 22.17 or newer for local development.</p>
  <pre class="shell"><code>npm install squander@^8</code></pre>
  <p>
    The core package has no Svelte dependency. Add <code>svelte@^5</code> when you want Svelte to provide your UI layer; keep gameplay state and
    the game loop in Squander.
  </p>

  <h2>First steps</h2>
  <p>
    Start with a canvas and a game loop. Run this code in the browser after the canvas exists, such as from a client-only module or a Svelte <code
      >onMount</code
    > callback.
  </p>
  <pre class="markup"><code>&lt;canvas id="game" width="800" height="450"&gt;&lt;/canvas&gt;</code></pre>
  <CodeBlock
    code={`import { create_game } from "squander";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (canvas === null) throw new Error("Missing #game canvas");

const scheduler = {
  request_frame: (callback: () => void) => requestAnimationFrame(callback),
  cancel_frame: (handle: unknown) => {
    if (typeof handle === "number") cancelAnimationFrame(handle);
  },
  now_seconds: () => performance.now() / 1000,
};

const game = create_game({
  renderer: { canvas, width: 800, height: 450 },
  scheduler,
  update: ({ delta_seconds }) => {
    // Advance player, enemy, and world state here.
    void delta_seconds;
  },
  draw: () => {
    // Submit drawing commands here.
  },
});

await game.ready;
// The game is now initialized and its frame loop is running.

const dispose_game = (): Promise<void> => game.dispose();
// Call dispose_game() from your component or page cleanup function.`}
  />

  <h2>What the first game owns</h2>
  <ul>
    <li><code>create_game</code> creates the WebGPU renderer, frame loop, input router, asset cache, and resource owners.</li>
    <li><code>update</code> advances gameplay from a bounded <code>delta_seconds</code> value.</li>
    <li><code>draw</code> submits the commands that render the current state.</li>
    <li><code>game.ready</code> resolves after the renderer and optional async setup are ready.</li>
    <li><code>game.dispose()</code> stops the loop and releases game-owned resources when the page or scene goes away.</li>
  </ul>

  <h2>Browser and framework notes</h2>
  <p>
    WebGPU requires a secure context: use <code>http://localhost</code> or <code>http://127.0.0.1</code> during development and HTTPS in
    production. Do not create a game during server-side rendering. In SvelteKit, create it in <code>onMount</code> and dispose it from the returned
    cleanup function.
  </p>
  <p>
    This first loop intentionally leaves drawing commands open so you can choose your game structure. Continue with the
    <a href={resolve("/(docs)/docs/core/[guide]", { guide: "game-lifecycle" })}>game lifecycle guide</a>, then explore the
    <a href={resolve("/(docs)/docs/examples/playground")}>playground</a> for a rendered example.
  </p>
</article>

<style>
  .getting-started {
    width: 100%;
    max-width: 900px;
    min-width: 0;
  }
  .summary {
    max-width: 48rem;
    font-size: 1.25rem;
  }
  pre {
    box-sizing: border-box;
    max-width: 100%;
    margin: 1rem 0;
    padding: 1rem;
    overflow-x: auto;
    background: #111729;
  }
  code {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .shell {
    border: 1px solid #39435b;
  }
  .markup {
    margin-bottom: 1.5rem;
  }
</style>
