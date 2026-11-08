<script lang="ts">
  import { resolve } from "$app/paths";
  import CodeBlock from "../../../../lib/docs/CodeBlock.svelte";
</script>

<svelte:head><title>Getting started · Squander</title></svelte:head>

<article class="getting-started">
  <h1>Getting started</h1>
  <p class="summary">Go from a fresh SvelteKit project to a running Squander game in 60 seconds.</p>

  <h2>Install the stack</h2>
  <p>From your SvelteKit project, install Squander alongside the Svelte runtime and SvelteKit:</p>
  <pre class="shell"><code>npm install squander@latest svelte@latest @sveltejs/kit@latest</code></pre>
  <p>
    If you already have a SvelteKit project, its Svelte and SvelteKit packages are probably installed. The command above shows the complete
    stack that the example uses.
  </p>

  <h2>Mount the Game component</h2>
  <p>
    Put this in a route such as <code>src/routes/+page.svelte</code>. <code>Game</code> creates the browser-side game after mount, owns its renderer
    and frame loop, and disposes them when the page unmounts.
  </p>
  <CodeBlock
    language="svelte"
    code={`<script lang="ts">
  import { Game, type GameReadyContext } from "squander/svelte";

  const start_game = async ({ scenes }: GameReadyContext): Promise<void> => {
    await scenes.mount(({ renderer }) => ({
      name: "main",
      draw: () => {
        void renderer.clear({ red: 0.05, green: 0.08, blue: 0.15, alpha: 1 });
      },
    }));
  };
\u003C/script>

<Game class="game-canvas" onReady={start_game} />

<style>
  :global(.game-canvas) {
    width: min(100%, 800px);
    aspect-ratio: 16 / 9;
  }
</style>`}
  />

  <h2>What you get</h2>
  <ul>
    <li>A WebGPU canvas initialized through the SvelteKit client lifecycle.</li>
    <li>A running update and draw loop with a game-owned scene stack.</li>
    <li>Automatic cleanup when the Svelte component unmounts.</li>
    <li>A first scene that clears the canvas so you can see the game is alive.</li>
  </ul>

  <h2>Browser requirements</h2>
  <p>
    WebGPU requires a secure context: use <code>http://localhost</code> or <code>http://127.0.0.1</code> during development and HTTPS in
    production. Keep <code>Game</code> in a Svelte component so WebGPU creation stays browser-only; do not create a game during server-side rendering.
  </p>
  <p>
    When you need lower-level lifecycle control, continue with the
    <a href={resolve("/(docs)/docs/core/[guide]", { guide: "game-lifecycle" })}>game lifecycle guide</a>. For a larger rendered example,
    open the
    <a href={resolve("/(docs)/docs/examples/playground")}>playground</a>.
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
</style>
