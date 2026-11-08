<script lang="ts">
  import { create_world, define_component } from "../../../../../lib/core/index.js";

  type Position = { x: number; y: number };

  const position = define_component<Position>({ name: "position" });
  const world = create_world({ position });
  let entities = $state<readonly number[]>([]);
  let status = $state("Create an entity to start the world");

  function refresh(): void {
    entities = world
      .query()
      .with(position)
      .toArray()
      .map((match) => match.entity);
  }

  function create_entity(): void {
    const entity = world.create();
    world.add(entity, position, { x: entities.length, y: 0 });
    refresh();
    status = `Entity ${String(entity)} now has a position component`;
  }

  function advance_positions(): void {
    world
      .query()
      .with(position)
      .each(({ read, write }) => {
        write(position).x = read(position).x + 1;
      });
    refresh();
    status = `Advanced ${String(entities.length)} live match views`;
  }
</script>

<svelte:head><title>Entity-component system · Squander Core</title></svelte:head>

<article class="guide">
  <p class="eyebrow">Core guide</p>
  <h1>Entity-component system</h1>
  <p class="summary">Create local schemas, query object-shaped components, and keep system composition in the caller.</p>

  <section class="live-example" aria-labelledby="ecs-example-title">
    <p class="eyebrow">Live example</p>
    <h2 id="ecs-example-title">Run a typed world</h2>
    <p>{status}</p>
    <div class="controls">
      <button type="button" onclick={create_entity}>Create entity</button>
      <button type="button" onclick={advance_positions} disabled={entities.length === 0}>Advance positions</button>
    </div>
    <ul>
      {#each entities as entity (entity)}
        <li>entity {String(entity)}: ({world.read(entity, position).x}, {world.read(entity, position).y})</li>
      {/each}
    </ul>
  </section>

  <h2>What this demonstrates</h2>
  <p>
    Component tokens belong to a local schema, and each world owns its membership and component storage. Queries expose only the tokens they
    request. The example uses live match views for the list and a caller-controlled update function for movement.
  </p>

  <h2>Public types</h2>
  <ul>
    <li><code>define_component&lt;Value&gt;()</code></li>
    <li><code>create_world(schema)</code></li>
    <li><code>World&lt;Schema&gt;</code></li>
    <li><code>Query&lt;Schema, Included&gt;</code></li>
    <li><code>QueryMatch&lt;Schema, Included&gt;</code></li>
    <li><code>WorldSnapshot&lt;Schema&gt;</code></li>
  </ul>

  <h2>Minimum viable example</h2>
  <pre><code
      >{`type Position = { x: number; y: number };
const position = define_component<Position>({ name: "position" });
const world = create_world({ position });

world.query().with(position).each(({ read, write }) => {
  write(position).x += read(position).y;
});

const snapshot = world.export();
world.import(snapshot);`}</code
    ></pre>

  <h2>Scope and limitations</h2>
  <p>
    The ECS uses object-shaped components and dense sparse-set columns today. Structural changes from a query match are deferred until
    iteration finishes. The ECS does not provide a scheduler or system registry. JSON and binary serialization, migrations, typed columns,
    and archetype storage remain application or later optimization seams.
  </p>
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
    margin: 2rem 0;
    padding: 1.25rem 0;
    border-block: 1px solid #39435b;
  }
  .controls {
    display: flex;
    gap: 0.75rem;
    margin: 1rem 0;
  }
  button {
    padding: 0.65rem 0.9rem;
    border: 0;
    background: #39435b;
    color: white;
    cursor: pointer;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  pre {
    overflow-x: auto;
    padding: 1rem;
    background: #202638;
    color: white;
  }
</style>
