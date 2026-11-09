<script lang="ts">
  import { create_event_dispatcher, create_signal } from "../../../../lib/signals/index.js";
  import CodeBlock from "../../../../lib/docs/CodeBlock.svelte";

  type GameEvents = {
    score: { points: number };
    reset: undefined;
  };

  const score_signal = create_signal<number>();
  const game_events = create_event_dispatcher<GameEvents>();
  let signal_values = $state<readonly number[]>([]);
  let event_log = $state<readonly string[]>([]);
  let signal_listener_active = $state(true);
  let event_listeners_active = $state(true);

  const stop_signal = score_signal.subscribe((score) => {
    signal_values = [...signal_values, score];
  });
  const stop_score_event = game_events.on("score", ({ points }) => {
    event_log = [...event_log, `score +${String(points)}`];
  });
  game_events.once("reset", () => {
    event_log = [...event_log, "reset (once)"];
  });

  function emit_signal(): void {
    const current_score = signal_values.length === 0 ? 0 : signal_values[signal_values.length - 1];
    score_signal.emit(current_score + 10);
  }

  function stop_signal_listener(): void {
    stop_signal();
    signal_listener_active = false;
  }

  function emit_score_event(): void {
    game_events.emit("score", { points: 10 });
  }

  function emit_reset_event(): void {
    game_events.emit("reset");
  }

  function clear_event_listeners(): void {
    stop_score_event();
    game_events.clear();
    event_listeners_active = false;
  }
</script>

<svelte:head><title>Signals and event dispatch · Squander utilities</title></svelte:head>

<article class="guide">
  <header class="guide-intro">
    <p class="eyebrow">Utilities guide</p>
    <h1>Signals and event dispatch</h1>
    <p class="summary">Use small, typed primitives to publish values, route named events, and keep game systems loosely coupled.</p>
  </header>

  <section class="intro-section" aria-labelledby="what-are-signals-title">
    <h2 id="what-are-signals-title">What are these utilities?</h2>
    <p>
      A signal represents one stream of values. An event dispatcher maps event names to their payload types. Both let callers subscribe with
      a callback and receive an unsubscriber, without depending on the DOM or a game runtime.
    </p>
  </section>

  <section class="live-example" aria-labelledby="utilities-example-title">
    <p class="eyebrow">Live example</p>
    <h2 id="utilities-example-title">Publish values and named events</h2>
    <p>Emit a score through a signal, route a typed score event, or fire a reset listener that runs once.</p>

    <div class="utility-grid">
      <section class="utility-track" aria-labelledby="signal-track-title">
        <h3 id="signal-track-title">Signal</h3>
        <p>Values: <output data-testid="signal-values">{signal_values.length === 0 ? "none yet" : signal_values.join(", ")}</output></p>
        <div class="controls">
          <button type="button" onclick={emit_signal} disabled={!signal_listener_active}>Emit signal</button>
          <button type="button" onclick={stop_signal_listener} disabled={!signal_listener_active}>Stop listener</button>
        </div>
      </section>

      <section class="utility-track" aria-labelledby="event-track-title">
        <h3 id="event-track-title">Event dispatcher</h3>
        <p>Events: <output data-testid="event-log">{event_log.length === 0 ? "none yet" : event_log.join(" · ")}</output></p>
        <div class="controls">
          <button type="button" onclick={emit_score_event} disabled={!event_listeners_active}>Emit score</button>
          <button type="button" onclick={emit_reset_event} disabled={!event_listeners_active}>Emit reset once</button>
          <button type="button" onclick={clear_event_listeners} disabled={!event_listeners_active}>Clear listeners</button>
        </div>
      </section>
    </div>
  </section>

  <h2>Choose a primitive</h2>
  <ul>
    <li><strong>Signal</strong> is for one value type, such as health, score, or a loading percentage.</li>
    <li><strong>Event dispatcher</strong> is for several named messages with different payload types.</li>
    <li><strong>Scene events</strong> are for game-scoped communication that also needs ownership, disposal, and runtime error routing.</li>
  </ul>

  <h2>Public types</h2>
  <ul>
    <li><code>Signal&lt;EventDetail&gt;</code> and <code>create_signal&lt;EventDetail&gt;()</code></li>
    <li><code>EventDispatcher&lt;EventMap&gt;</code> and <code>create_event_dispatcher&lt;EventMap&gt;()</code></li>
    <li><code>SignalUnsubscriber</code></li>
    <li><code>EventMap</code> keys describe event names, and <code>undefined</code> describes an event with no payload</li>
  </ul>

  <h2>Minimum viable signal</h2>
  <CodeBlock
    language="typescript"
    code={`import { create_signal } from "squander/signals";

const health_changed = create_signal<number>();
const stop_health_listener = health_changed.subscribe((health) => {
  console.log(health);
});

health_changed.emit(100);
stop_health_listener();`}
  />

  <h2>Minimum viable event dispatcher</h2>
  <CodeBlock
    language="typescript"
    code={`import { create_event_dispatcher } from "squander/signals";

type GameEvents = {
  score: { points: number };
  reset: undefined;
};

const game_events = create_event_dispatcher<GameEvents>();
game_events.on("score", ({ points }) => console.log(points));
game_events.emit("score", { points: 10 });
game_events.emit("reset");`}
  />

  <h2>Scope and limitations</h2>
  <p>
    These utilities are standalone and reusable. They do not schedule work, serialize payloads, or own a game lifetime. Use the scene event
    bus when events belong to a game and should be disposed with its scene manager. Listener changes during an emission take effect on the
    next emission, and <code>once</code> listeners unsubscribe before their callback runs.
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
  .utility-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
    margin-top: 1.25rem;
  }
  .utility-track {
    min-width: 0;
    padding-top: 1rem;
    border-top: 1px solid #39435b;
  }
  .utility-track h3 {
    margin: 0 0 0.5rem;
  }
  .utility-track p {
    margin: 0;
  }
  output {
    display: block;
    min-height: 1.5rem;
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: #202638;
    color: white;
    font-family: "Fira Mono", monospace;
    overflow-wrap: anywhere;
  }
  .controls {
    display: flex;
    gap: 0.75rem;
    margin: 1rem 0 0;
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
  @media screen and (max-width: 44rem) {
    .utility-grid {
      grid-template-columns: 1fr;
    }
    .controls {
      flex-wrap: wrap;
    }
  }
</style>
