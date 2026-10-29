<script lang="ts">
  import { core_guides } from "../../../../lib/docs/core-guides.js";
</script>

<svelte:head><title>Core documentation</title></svelte:head>

<article>
  <h1>Core</h1>
  <p>
    Focused documentation for Squander's framework-independent runtime APIs. Each page in this section pairs
    an explanation with a live proof, public type details, and copyable usage examples.
  </p>

  <h2>Available guides</h2>
  <ul>
    <li><a href="/docs/examples/text">Text drawing</a> — load a bundled font, prepare glyphs, and render changing labels with WebGPU.</li>
    {#each core_guides as guide}
      <li><a href={`/docs/core/${guide.slug}`}>{guide.title}</a> — {guide.summary}</li>
    {/each}
  </ul>

  <h2>Documentation contract</h2>
  <p>
    A core feature guide should link from this sidebar section, exercise the public API live, explain its
    supported and deferred behavior, show the public types, and include code samples that can be adapted into a game.
  </p>
</article>
