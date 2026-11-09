<script lang="ts">
  import CodeBlock from "../../../../../lib/docs/CodeBlock.svelte";
  import { create_random, type RandomState } from "../../../../../lib/core/index.js";

  let seed = $state("squander-demo");
  let sequence = $state<readonly number[]>([]);
  let snapshot = $state<RandomState | undefined>();
  let run_count = $state(0);

  const sequence_text = $derived(sequence.join(", "));
  const snapshot_text = $derived(snapshot === undefined ? "No snapshot yet" : `${snapshot.algorithm} · ${snapshot.state.join(" / ")}`);

  function run_sequence(): void {
    const random = create_random({ seed });
    sequence = Array.from({ length: 8 }, () => random.next_int(0, 100));
    snapshot = random.snapshot();
    run_count += 1;
  }

  run_sequence();
</script>

<svelte:head><title>Randomization and seeds · Squander core</title></svelte:head>

<article class="guide">
  <header class="guide-intro">
    <p class="eyebrow">Core guide</p>
    <h1>Randomization and seeds</h1>
    <p class="summary">Use browser entropy to start a run, then use a deterministic stream for procedural gameplay, tests, and replays.</p>
  </header>

  <section class="intro-section" aria-labelledby="randomness-model-title">
    <h2 id="randomness-model-title">Separate entropy from gameplay randomness</h2>
    <p>
      <code>create_random()</code> uses <code>crypto.getRandomValues()</code> when it needs a fresh seed. Once created, the source is a
      fast, deterministic <code>xoshiro128**</code> stream. Pass an explicit seed when the run must reproduce exactly.
    </p>
  </section>

  <section class="live-example" aria-labelledby="seed-example-title">
    <p class="eyebrow">Live example</p>
    <h2 id="seed-example-title">Replay the same sequence</h2>
    <p>Enter a seed, generate eight values, then generate them again. The sequence is identical for the same seed.</p>

    <div class="seed-controls">
      <label for="random-seed">Seed</label>
      <input id="random-seed" bind:value={seed} autocomplete="off" />
      <button type="button" onclick={run_sequence}>Generate sequence</button>
    </div>

    <div class="random-readout">
      <div>
        <span>Run</span>
        <strong data-testid="random-run">{String(run_count)}</strong>
      </div>
      <div>
        <span>Values from <code>next_int(0, 100)</code></span>
        <output data-testid="random-sequence">{sequence_text}</output>
      </div>
      <div>
        <span>Snapshot</span>
        <output data-testid="random-snapshot">{snapshot_text}</output>
      </div>
    </div>
  </section>

  <h2>Public interface</h2>
  <ul>
    <li><code>create_random()</code> creates a crypto-seeded source for a normal game run.</li>
    <li><code>create_random({'{ seed: "level-42" }'})</code> creates a reproducible source.</li>
    <li><code>next_float()</code> returns a value in <code>[0, 1)</code>.</li>
    <li><code>next_int(min_inclusive, max_exclusive)</code> uses an exclusive upper bound and avoids modulo bias.</li>
    <li><code>pick()</code> chooses from a nonempty collection, and <code>shuffle()</code> returns a new array.</li>
    <li><code>fork(label)</code> creates a stable independent stream for a gameplay subsystem.</li>
    <li><code>snapshot()</code> captures the stream state for replay or debugging.</li>
  </ul>

  <h2>Copyable example</h2>
  <CodeBlock
    language="typescript"
    code={`import { create_random } from "squander/core";

const random = create_random({ seed: "level-42" });
const spawn_x = random.next_int(0, 800);
const loot = random.pick(["potion", "map", "key"]);

const loot_random = random.fork("loot");
const replay_state = loot_random.snapshot();`}
  />

  <h2>Browser choices</h2>
  <p>
    <code>Math.random()</code> is convenient but has no seed or replay contract. <code>crypto.getRandomValues()</code> is the right source for
    fresh entropy, but it is not seedable. Squander combines them by using browser crypto at the start of a run and a deterministic source during
    gameplay.
  </p>

  <h2>Scope and limitations</h2>
  <p>
    This module is for gameplay, procedural generation, tests, and replay support. It is not a cryptographic API, an anti-cheat mechanism,
    or a secure token generator. The current public stream is CPU-side; WGSL shaders do not receive ambient browser randomness. GPU
    randomness must be added explicitly through shader code and seed or state buffers.
  </p>
</article>

<style>
  .guide {
    width: 100%;
    max-width: 900px;
    min-width: 0;
  }
  .guide-intro {
    display: grid;
    gap: 1.25rem;
  }
  .guide-intro h1 {
    margin: 0;
    line-height: 0.95;
  }
  .guide-intro .eyebrow,
  .guide-intro .summary {
    margin: 0;
  }
  .intro-section {
    margin-top: 2.5rem;
  }
  .intro-section h2 {
    margin: 0 0 0.75rem;
    line-height: 1.1;
  }
  .intro-section p {
    max-width: 48rem;
    margin: 0;
  }
  .eyebrow {
    margin: 0 0 0.5rem;
    color: var(--gray-6);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .summary {
    max-width: 48rem;
    font-size: 1.25rem;
  }
  .live-example {
    margin: 2rem 0;
    padding: 1.25rem 0;
    border-block: 1px solid #39435b;
  }
  .seed-controls {
    display: flex;
    align-items: end;
    gap: 0.75rem;
    margin-top: 1.25rem;
  }
  .seed-controls label {
    display: grid;
    gap: 0.35rem;
    color: #b9b5b8;
    font-size: 0.85rem;
  }
  input,
  button {
    box-sizing: border-box;
    min-height: 2.4rem;
    padding: 0.65rem 0.9rem;
    border: 0;
    border-radius: 0;
    font: inherit;
  }
  input {
    min-width: 15rem;
    background: #202638;
    color: white;
  }
  button {
    background: #39435b;
    color: white;
    cursor: pointer;
  }
  button:hover {
    background: #4a5a7b;
  }
  .random-readout {
    display: grid;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  .random-readout > div {
    display: grid;
    gap: 0.4rem;
  }
  .random-readout span {
    color: #b9b5b8;
  }
  .random-readout strong,
  output {
    display: block;
    min-height: 1.5rem;
    padding: 0.75rem;
    background: #202638;
    color: white;
    font-family: "Fira Mono", monospace;
    overflow-wrap: anywhere;
  }
  @media screen and (max-width: 44rem) {
    .seed-controls {
      align-items: stretch;
      flex-direction: column;
    }
    input {
      min-width: 0;
    }
  }
</style>
