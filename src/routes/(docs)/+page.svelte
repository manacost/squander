<script lang="ts">
  import { resolve } from "$app/paths";
</script>

<svelte:head><title>Squander · Build browser games with TypeScript</title></svelte:head>

<article class="landing">
  <h1>Squander your time building games</h1>
  <p class="lead">Squander is a code-first browser game toolkit for spending your time making games, not managing engine ceremony.</p>

  <section aria-labelledby="code-first-heading">
    <h2 id="code-first-heading">Code-first, loop-owned</h2>
    <p>
      Inspired by <strong>Love2D</strong> and <strong>MonoGame</strong>, Squander keeps the API close to the game itself. You own your
      systems and decide how they compose around the <code>update</code> and <code>draw</code> loops.
    </p>
    <p>
      The runtime handles WebGPU setup, resources, input, scenes, and lifecycle. Your code owns game state, rules, and the order those
      systems run. The core stays independent of Svelte; add Svelte 5 when you want a UI layer.
    </p>
  </section>

  <section aria-labelledby="svelte-heading">
    <h2 id="svelte-heading">Svelte for UI, atop your game</h2>
    <p>
      The web has made user interfaces powerful and flexible. Use Svelte for menus, HUDs, overlays, and settings instead of rebuilding
      entire layout systems and rendering flows—or settling for rudimentary substitutes.
    </p>
    <p>Squander keeps the game state and loop in your hands while Svelte handles the interface around it.</p>
  </section>

  <section aria-labelledby="agentic-heading">
    <h2 id="agentic-heading">Built for agentically aligned development</h2>
    <p>
      Public types, copyable examples, and deterministic verification make Squander legible to both humans and coding agents. Read the
      <a href={resolve("llms.txt")}>llms.txt</a> for a compact, agent-facing map of the API, current scope, and supported workflows.
    </p>
  </section>

  <section class="getting-started" aria-labelledby="getting-started-heading">
    <h2 id="getting-started-heading">Start with a working game loop</h2>
    <p>Install Squander, create a browser-safe game, and get your first update and draw loop running.</p>
    <a class="start-link" href={resolve("docs/getting-started")}>Read Getting started →</a>
  </section>
</article>

<style>
  .landing {
    width: 100%;
    max-width: 58rem;
    min-width: 0;
  }
  .lead {
    max-width: 48rem;
    font-size: 1.35rem;
  }
  section {
    max-width: 68ch;
    margin-top: 2.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid #39435b;
  }
  section p {
    margin-bottom: 1rem;
  }
  .getting-started {
    margin-top: 3rem;
  }
  .start-link {
    display: inline-block;
    margin-top: 0.25rem;
    padding: 0.65rem 0.9rem;
    background: #39435b;
    color: white;
    text-decoration: none;
  }
  .start-link:hover {
    background: #4a5a7b;
  }
</style>
