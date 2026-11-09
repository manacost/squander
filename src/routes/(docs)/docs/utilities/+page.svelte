<script lang="ts">
  import { create_event_dispatcher, create_signal } from "../../../../lib/signals/index.js";
  import CodeBlock from "../../../../lib/docs/CodeBlock.svelte";

  type GameEvents = {
    player_scored: { points: number };
    level_started: { level: number };
    game_reset: undefined;
  };

  const score_changed = create_signal<number>();
  const game_events = create_event_dispatcher<GameEvents>();
  let score = $state(0);
  let score_history = $state<readonly number[]>([]);
  let event_log = $state<readonly string[]>([]);
  let score_listener_active = $state(true);
  let event_listeners_active = $state(true);

  const stop_score_listener = score_changed.subscribe((next_score) => {
    score = next_score;
    score_history = [...score_history, next_score];
  });
  score_changed.emit(0);
  game_events.on("player_scored", ({ points }) => {
    event_log = [...event_log, `player_scored: +${String(points)}`];
  });
  game_events.once("level_started", ({ level }) => {
    event_log = [...event_log, `level_started: ${String(level)} (once)`];
  });
  game_events.on("game_reset", () => {
    event_log = [...event_log, "game_reset"];
  });

  function change_score(delta: number): void {
    score_changed.emit(score + delta);
  }

  function add_score(): void {
    change_score(10);
  }

  function subtract_score(): void {
    change_score(-10);
  }

  function reset_score(): void {
    score_changed.emit(0);
  }

  function disconnect_score_listener(): void {
    stop_score_listener();
    score_listener_active = false;
  }

  function player_scores(): void {
    game_events.emit("player_scored", { points: 10 });
  }

  function start_level(): void {
    game_events.emit("level_started", { level: 1 });
  }

  function reset_game(): void {
    game_events.emit("game_reset");
  }

  function clear_event_listeners(): void {
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
    <h2 id="utilities-example-title">Connect game state to game events</h2>
    <p>Change a score through a signal, then route gameplay messages through a typed event dispatcher.</p>

    <div class="utility-grid">
      <section class="utility-track" aria-labelledby="signal-track-title">
        <h3 id="signal-track-title"><code>score_changed</code></h3>
        <p>One value stream drives the score display.</p>
        <div class="score-readout">
          <span>Current score</span>
          <strong data-testid="score-value">{String(score)}</strong>
        </div>
        <p>Received: <output data-testid="score-history">{score_history.join(" → ")}</output></p>
        <div class="controls">
          <button type="button" onclick={add_score} disabled={!score_listener_active}>Add 10</button>
          <button type="button" onclick={subtract_score} disabled={!score_listener_active}>Subtract 10</button>
          <button type="button" onclick={reset_score} disabled={!score_listener_active}>Reset score</button>
        </div>
        <button class="secondary-action" type="button" onclick={disconnect_score_listener} disabled={!score_listener_active}
          >Disconnect UI listener</button
        >
      </section>

      <section class="utility-track" aria-labelledby="event-track-title">
        <h3 id="event-track-title">Event dispatcher</h3>
        <p>Named gameplay messages can carry different payloads.</p>
        <p>Events: <output data-testid="event-log">{event_log.length === 0 ? "none yet" : event_log.join(" · ")}</output></p>
        <div class="controls">
          <button type="button" onclick={player_scores} disabled={!event_listeners_active}>Player scores +10</button>
          <button type="button" onclick={start_level} disabled={!event_listeners_active}>Start level 1</button>
          <button type="button" onclick={reset_game} disabled={!event_listeners_active}>Reset game</button>
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

const score_changed = create_signal<number>();
const stop_score_listener = score_changed.subscribe((score) => {
  update_score_display(score);
});

score_changed.emit(100);
stop_score_listener();`}
  />

  <h2>Minimum viable event dispatcher</h2>
  <CodeBlock
    language="typescript"
    code={`import { create_event_dispatcher } from "squander/signals";

type GameEvents = {
  player_scored: { points: number };
  game_reset: undefined;
};

const game_events = create_event_dispatcher<GameEvents>();
game_events.on("player_scored", ({ points }) => add_score(points));
game_events.emit("player_scored", { points: 10 });
game_events.emit("game_reset");`}
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
  .score-readout {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin: 1rem 0;
  }
  .score-readout strong {
    color: white;
    font-family: "Fira Mono", monospace;
    font-size: 1.5rem;
    font-weight: 400;
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
  .secondary-action {
    margin-top: 0.75rem;
    padding: 0;
    background: transparent;
    color: #85e8ff;
    text-decoration: underline;
    text-underline-offset: 0.2em;
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
