<script lang="ts">
  import type { PageData } from "./$types.js";

  let { data }: { data: PageData } = $props();
  let guide = $derived(data.guide);
</script>

<svelte:head><title>{guide.title} · Squander Core</title></svelte:head>

<article class="guide">
  <p class="eyebrow">Core guide</p>
  <h1>{guide.title}</h1>
  <p class="summary">{guide.summary}</p>

  <section class="proof">
    <div>
      <p class="eyebrow">Live example</p>
      <h2>Run it</h2>
      <p>{guide.proof}</p>
    </div>
    <a class="button" href={guide.live_href}>{guide.live_label} →</a>
  </section>

  <h2>How it works</h2>
  <p>{guide.explanation}</p>

  <h2>Public types</h2>
  <ul>
    {#each guide.types as type_name}
      <li><code>{type_name}</code></li>
    {/each}
  </ul>

  <h2>Usage</h2>
  <pre><code>{guide.sample}</code></pre>

  <h2>Scope and limitations</h2>
  <p>{guide.limitations}</p>
</article>

<style>
  .guide { max-width: 900px; }
  .eyebrow { margin: 0 0 0.5rem; color: var(--gray-6); font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; }
  .summary { font-size: 1.25rem; max-width: 48rem; }
  .proof { display: flex; align-items: end; justify-content: space-between; gap: 2rem; margin: 2rem 0; padding: 1.25rem; border: 1px solid #39435b; border-radius: 0.6rem; background: #151923; }
  .proof h2 { margin: 0 0 0.5rem; }
  .proof p { margin: 0; }
  .button { display: inline-block; flex: 0 0 auto; padding: 0.65rem 0.9rem; border-radius: 0.4rem; background: #39435b; color: white; text-decoration: none; }
  .button:hover { background: #4a5a7b; }
  pre { overflow: auto; padding: 1rem; border-radius: 0.5rem; background: #151923; }
  @media (max-width: 40rem) { .proof { align-items: start; flex-direction: column; } }
</style>
