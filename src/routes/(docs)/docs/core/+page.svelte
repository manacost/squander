<script lang="ts">
  import { core_guides } from "../../../../lib/docs/core-guides.js";
</script>

<svelte:head><title>Core documentation</title></svelte:head>

<article>
  <h1>Core</h1>
  <p>
    Focused documentation for Squander's framework-independent runtime APIs. Each page in this section pairs a use case with a minimum
    viable code sample, public type details, and the most direct available proof.
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
    A core feature guide should link from this sidebar section, teach one use case, show its result in a focused live example, explain its
    supported and deferred behavior, show the public types, and include a code sample that can be adapted into a game. Tests remain
    repository evidence, not visitor-facing proof.
  </p>
</article>
