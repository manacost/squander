<script lang="ts">
  import CoreGuideExample from "../../../../../lib/docs/CoreGuideExample.svelte";
  import CodeBlock from "../../../../../lib/docs/CodeBlock.svelte";
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
      <p>{guide.example_description}</p>
    </div>
    {#if guide.slug === "svelte-bridge"}
      <a class="example-link" href="/docs/examples/svelte">Open the focused Svelte bridge example →</a>
    {:else}
      <CoreGuideExample slug={guide.slug} />
    {/if}
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
  <CodeBlock code={guide.sample} />

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
  .example-link {
    display: inline-block;
    margin-top: 1.25rem;
    padding: 0.65rem 0.9rem;
    background: #39435b;
    color: white;
    text-decoration: none;
  }
  .example-link:hover {
    background: #4a5a7b;
  }
</style>
