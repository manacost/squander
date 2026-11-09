<script lang="ts">
  import CodeBlock from "../../../../../lib/docs/CodeBlock.svelte";
  import { create_random } from "../../../../../lib/core/index.js";

  const loot_table: readonly string[] = ["potion", "map", "key", "scroll", "gem"];
  const party: readonly string[] = ["scout", "mage", "tank", "healer"];

  let seed = $state("gregg rulz ok");
  let dice_rolls = $state<readonly number[]>([]);
  let loot = $state("—");
  let shuffled_party = $state<readonly string[]>([]);
  let run_count = $state(0);

  function run_examples(): void {
    const random = create_random({ seed });
    const loot_random = random.fork("loot");
    dice_rolls = Array.from({ length: 6 }, () => random.next_int(1, 7));
    loot = loot_random.pick(loot_table);
    shuffled_party = loot_random.shuffle(party);
    run_count += 1;
  }

  run_examples();
</script>

<svelte:head><title>Random · Squander utilities</title></svelte:head>

<article class="guide">
  <header class="guide-intro">
    <h1>Random</h1>
    <p class="summary">Use one seeded source for rolls, choices, shuffles, procedural content, and replayable game runs.</p>
  </header>

  <section class="live-example" aria-labelledby="random-demo-title">
    <h2 id="random-demo-title">Try the same seed twice</h2>
    <p>Every action below uses a deterministic stream. Change the seed, run it again, or repeat it to reproduce the same results.</p>

    <div class="seed-controls">
      <label for="random-seed">Seed</label>
      <input id="random-seed" bind:value={seed} autocomplete="off" />
      <button type="button" onclick={run_examples}>Run examples</button>
    </div>

    <div class="demo-output">
      <div>
        <span>Run {String(run_count)}</span>
        <output data-testid="random-dice">{dice_rolls.join(", ")}</output>
      </div>
      <div>
        <span><code>pick()</code></span>
        <ul class="choice-list" data-testid="random-loot-options" aria-label="Loot options">
          {#each loot_table as option (option)}
            <li class:chosen={option === loot} data-picked={option === loot ? "true" : "false"}>
              <code>{option}</code>
            </li>
          {/each}
        </ul>
      </div>
      <div>
        <span><code>shuffle()</code></span>
        <output data-testid="random-party">{shuffled_party.join(" → ")}</output>
      </div>
    </div>
  </section>

  <h2>Start with a source</h2>
  <p>Use an explicit seed for tests, procedural generation, and replays. Omit it when each run should start from fresh browser entropy.</p>
  <CodeBlock
    language="typescript"
    code={`import { create_random } from "squander/core";

const random = create_random();
const replayable = create_random({ seed: "level-42" });`}
  />

  <h2>Roll a value</h2>
  <p><code>next_float()</code> returns a value from zero up to, but not including, one.</p>
  <CodeBlock
    language="typescript"
    code={`const chance = random.next_float();
if (chance < 0.1) spawn_rare_drop();`}
  />

  <h2>Choose an integer range</h2>
  <p>The lower bound is inclusive and the upper bound is exclusive. This avoids hand-written range math at every call site.</p>
  <CodeBlock
    language="typescript"
    code={`const spawn_x = random.next_int(0, world_width);
const die_roll = random.next_int(1, 7); // 1 through 6
const target_index = random.next_int(0, targets.length);`}
  />

  <h2>Pick or shuffle values</h2>
  <p>
    <code>pick()</code> rejects an empty collection. <code>shuffle()</code> returns a new array, so the source collection stays unchanged.
  </p>
  <CodeBlock
    language="typescript"
    code={`const item = random.pick(["potion", "map", "key", "scroll", "gem"]);
const turn_order = random.shuffle(["scout", "mage", "tank"]);`}
  />

  <h2>Separate gameplay systems</h2>
  <p>Fork named streams so a new random call in one system does not silently change another system's sequence.</p>
  <CodeBlock
    language="typescript"
    code={`const loot_random = random.fork("loot");
const enemy_random = random.fork("enemies");

const loot_item = loot_random.pick(loot_table);
const enemy_count = enemy_random.next_int(3, 8);`}
  />

  <h2>Save a replay point</h2>
  <p>Snapshots capture the complete stream state. Store one with the run, then recreate the source when you need to continue it.</p>
  <CodeBlock
    language="typescript"
    code={`const checkpoint = random.snapshot();
save_replay({ seed: "level-42", random: checkpoint });

const restored = create_random({ state: checkpoint });`}
  />

  <h2>Keep security separate</h2>
  <p>
    This module is for gameplay and procedural content. It is not a secure token generator, an anti-cheat mechanism, or a cryptographic API.
    Browser crypto supplies fresh entropy when <code>create_random()</code> has no seed; the gameplay stream remains deterministic after creation.
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
  .guide-intro .summary {
    max-width: 48rem;
    margin: 0;
    font-size: 1.25rem;
  }
  .live-example {
    margin: 2rem 0;
    padding: 1.25rem 0;
    border-block: 1px solid #39435b;
  }
  .seed-controls {
    display: flex;
    align-items: center;
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
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--red-4);
    outline-offset: 2px;
  }
  .demo-output {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }
  .demo-output > div {
    display: grid;
    gap: 0.4rem;
    min-width: 0;
  }
  .demo-output span {
    color: #b9b5b8;
  }
  output {
    display: block;
    min-height: 1.5rem;
    padding: 0.75rem;
    background: #202638;
    color: white;
    font-family: "Fira Mono", monospace;
    overflow-wrap: anywhere;
  }
  .choice-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-height: 1.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .choice-list li {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid #39435b;
    color: #b9b5b8;
    font-family: "Fira Mono", monospace;
  }
  .choice-list li.chosen {
    border-color: var(--red-4);
    background: #39435b;
    color: white;
  }
  @media screen and (max-width: 44rem) {
    .seed-controls {
      align-items: stretch;
      flex-direction: column;
    }
    input {
      min-width: 0;
    }
    .demo-output {
      grid-template-columns: 1fr;
    }
  }
</style>
