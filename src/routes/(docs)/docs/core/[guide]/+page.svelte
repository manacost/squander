<script lang="ts">
  import CoreGuideExample from "../../../../../lib/docs/CoreGuideExample.svelte";
  import type { PageData } from "./$types.js";

  let { data }: { data: PageData } = $props();
  let guide = $derived(data.guide);
</script>

<svelte:head><title>{guide.title} · Squander Core</title></svelte:head>

<article class="guide">
  <p class="eyebrow">Core guide</p>
  <h1>{guide.title}</h1>
  <p class="summary">{guide.summary}</p>

  <section class="live-example">
    <div>
      <p class="eyebrow">Live example</p>
      <h2>See {guide.title} in action</h2>
      <p>
        The canvas below is a focused version of the minimum example. It is intentionally smaller than the composition playground so you can
        connect each line of code to one visible result.
      </p>
    </div>
    <CoreGuideExample slug={guide.slug} />
  </section>

  <h2>How it works</h2>
  <p>{guide.explanation}</p>

  <h2>Public types</h2>
  <ul>
    {#each guide.types as type_name}
      <li><code>{type_name}</code></li>
    {/each}
  </ul>

  <h2>Minimum viable example</h2>
  <p>Start with this smallest useful version of the feature, then add the options described above.</p>
  <pre><code>{guide.sample}</code></pre>

  <h2>Scope and limitations</h2>
  <p>{guide.limitations}</p>
</article>

<style>
  .guide {
    width: 100%;
    max-width: 900px;
    min-width: 0;
  }
  .eyebrow {
    margin: 0 0 0.5rem;
    color: var(--gray-6);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .summary {
    font-size: 1.25rem;
    max-width: 48rem;
  }
  .live-example {
    min-width: 0;
    margin: 2rem 0;
    padding: 1.25rem 0;
    border-block: 1px solid #39435b;
  }
  .live-example h2 {
    margin: 0 0 0.5rem;
  }
  .live-example p {
    margin: 0;
  }
  pre {
    overflow: auto;
    padding: 1rem 0;
    border-block: 1px solid #39435b;
  }
</style>
