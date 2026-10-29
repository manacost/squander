<script lang="ts">
  import GameHost from "../../../../../lib/svelte/GameHost.svelte";
  import type { Game } from "../../../../../lib/core/runtime/game.js";

  type State = Readonly<{ score: number }>;
  let left_publish: ((state: State) => void) | undefined;
  const commands = {
    increment: (amount: number) => {
      const next_score = (current_score += amount);
      left_publish?.({ score: next_score });
      return next_score;
    },
  };
  let current_score = 0;
  const create_game_instance = (publish: (state: State) => void, on_dispose: () => void): Game =>
    ({
      ready: Promise.resolve(),
      renderer: {},
      resources: {},
      geometry: {},
      assets: {},
      resize: () => undefined,
      get_viewport: () => ({
        logical_width: 1,
        logical_height: 1,
        css_width: 1,
        css_height: 1,
        physical_width: 1,
        physical_height: 1,
        content_width: 1,
        content_height: 1,
        offset_x: 0,
        offset_y: 0,
      }),
      pause: () => undefined,
      resume: () => undefined,
      set_visibility: () => undefined,
      dispose: async () => on_dispose(),
      get_state: () => "running",
    }) as unknown as Game;
  const create = ({ publish }: { publish: (state: State) => void; canvas: HTMLCanvasElement; bridge: unknown }): Game => {
    left_publish = publish;
    publish({ score: current_score });
    return create_game_instance(publish, () => {
      left_publish = undefined;
    });
  };
</script>

<svelte:head><title>Svelte 5 UI bridge</title></svelte:head>

<article class="svelte-guide">
  <p class="eyebrow">Demos · Svelte bridge</p>
  <h1>Svelte 5 UI bridge</h1>
  <p class="summary">This demo shows Svelte observing readonly game snapshots and invoking typed commands without making the core runtime depend on Svelte.</p>

  <section class="flow" aria-label="Svelte bridge data flow">
    <div class="flow-card"><strong>Game code</strong><span>publish(state)</span></div>
    <div class="flow-arrow" aria-hidden="true">→</div>
    <div class="flow-card"><strong>GameAdapter</strong><span>readonly view</span></div>
    <div class="flow-arrow" aria-hidden="true">→</div>
    <div class="flow-card"><strong>Svelte UI</strong><span>render snapshot</span></div>
    <div class="flow-return">UI event → typed command → game code</div>
  </section>

  <h2>Live proof: one host</h2>
  <p>This example focuses on the common path. One host owns one adapter and game instance. The status becomes <code>ready</code> after <code>game.ready</code>, and disposal occurs when the host unmounts. The adapter test suite covers advanced multi-host isolation.</p>

<GameHost initial_state={{ score: 0 }} {commands} {create}>
  {#snippet children(view)}
    <output data-testid="adapter-status">{view.status}</output>
    <output data-testid="adapter-score">{view.state.score}</output>
    <button data-testid="adapter-increment" onclick={() => view.commands.increment(2)}>Increment</button>
  {/snippet}
</GameHost>

  <h2>What the bridge owns</h2>
  <ul>
    <li><strong>Game → UI:</strong> game code is the only publisher; Svelte receives readonly snapshots.</li>
    <li><strong>UI → game:</strong> commands are inferred from the command object and preserve sync or async returns.</li>
    <li><strong>Lifecycle:</strong> <code>GameHost</code> mounts one adapter per canvas and disposes it on unmount.</li>
    <li><strong>Isolation:</strong> each host keeps its state, commands, subscriptions, and game separate from other hosts.</li>
  </ul>

  <h2>Use the host component</h2>
  <pre><code>{`type State = Readonly<{ score: number }>;
const commands = { increment: (amount: number) => score += amount };

<GameHost initial_state={{ score: 0 }} {commands} {create}>
  {#snippet children(view)}
    <output>{view.state.score}</output>
    <button onclick={() => view.commands.increment(1)}>+1</button>
  {/snippet}
{/GameHost>`}</code></pre>

  <h2>Use the adapter directly</h2>
  <pre><code>{`const adapter = create_game_adapter({ initial_state: { score: 0 }, commands, create });
const unsubscribe = adapter.subscribe((view) => render(view));
await adapter.mount(canvas);
await adapter.dispose();`}</code></pre>

  <h2>Public types</h2>
  <ul>
    <li><code>GameAdapterView&lt;State, Commands&gt;</code> — readonly state, lifecycle status, error, and typed commands.</li>
    <li><code>GameAdapterOptions&lt;State, Commands&gt;</code> — initial state, command map, scheduler, and game factory.</li>
    <li><code>GameBridge&lt;State, Commands&gt;</code> — the game-owned publisher and readonly bridge surface.</li>
    <li><code>GameHost</code> — Svelte 5 render-prop host that owns mount and disposal.</li>
  </ul>
  <p class="note">The demo uses a deterministic fake game so bridge behavior is easy to inspect. Advanced multi-host isolation is kept in the adapter unit suite, while the browser fixture verifies real mount, navigation disposal, and recreation.</p>
</article>

<style>
  .svelte-guide { max-width: 960px; }
  .eyebrow { margin: 0 0 0.5rem; color: var(--gray-6); font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; }
  .summary { max-width: 52rem; font-size: 1.25rem; }
  .flow { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin: 2rem 0; padding: 1.25rem; border: 1px solid #39435b; border-radius: 0.6rem; background: #151923; }
  .flow-card { display: grid; gap: 0.25rem; min-width: 8rem; padding: 0.75rem; border-radius: 0.4rem; background: #39435b; }
  .flow-card span { color: #cad5ef; font-size: 0.85rem; }
  .flow-arrow { color: #aab8d8; font-size: 1.5rem; }
  .flow-return { flex-basis: 100%; color: #aab8d8; font-size: 0.9rem; }
  pre { overflow: auto; padding: 1rem; border-radius: 0.5rem; background: #151923; }
  .note { margin-top: 2rem; padding: 1rem; border-left: 3px solid #6076a8; background: #eef2fb; color: #26334e; }
</style>
