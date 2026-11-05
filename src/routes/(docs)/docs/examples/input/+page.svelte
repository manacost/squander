<script lang="ts">
  import { onMount } from "svelte";
  import {
    create_browser_gamepad_adapter,
    create_browser_input_adapter,
    create_input_router,
    type InputEvent,
    type BrowserGamepadAdapter,
    type BrowserInputAdapter,
  } from "../../../../../lib/core/index.js";

  let host = $state<HTMLElement>();
  let log = $state<string[]>([]);
  let gamepad_status = $state("checking browser support…");
  let browser_adapter: BrowserInputAdapter | undefined;
  let gamepad_adapter: BrowserGamepadAdapter | undefined;

  const add_log = (message: string): void => {
    log = [message, ...log].slice(0, 8);
  };

  const describe = (event: InputEvent): string => {
    if (event.type === "key") return `keyboard ${event.phase}: ${event.key || event.code}`;
    if (event.type === "pointer") return `pointer ${event.phase}: ${String(Math.round(event.x))}, ${String(Math.round(event.y))}`;
    if (event.phase === "connected" || event.phase === "disconnected") return `gamepad ${event.phase}: ${event.label}`;
    if ("button" in event) return `gamepad button ${String(event.button)}: ${String(event.value)}`;
    if ("axis" in event) return `gamepad axis ${String(event.axis)}: ${event.value.toFixed(2)}`;
    return "input event";
  };

  onMount(() => {
    if (host === undefined) return;
    const router = create_input_router();
    const scene = router.push_scene((event) => {
      if (event.type === "key" && event.key === "Escape" && event.phase === "down") {
        add_log("scene consumed Escape");
        return "consume_and_prevent_default";
      }
      return "pass";
    });
    router.on_global((event) => {
      add_log(describe(event));
      return "pass";
    });
    browser_adapter = create_browser_input_adapter({ host, router });
    try {
      gamepad_adapter = create_browser_gamepad_adapter({ router });
      gamepad_status = `${String(gamepad_adapter.state.all().length)} gamepads visible; polling with the demo cadence`;
      const poll_handle = window.setInterval(() => {
        gamepad_adapter?.poll();
        gamepad_status = `${String(gamepad_adapter?.state.all().length ?? 0)} gamepads visible; polling with the demo cadence`;
      }, 100);
      return () => {
        window.clearInterval(poll_handle);
        gamepad_adapter?.dispose();
        browser_adapter?.dispose();
        router.remove_scene(scene);
        router.dispose();
      };
    } catch (error) {
      gamepad_status = error instanceof Error ? error.message : "gamepad API unavailable";
      return () => {
        browser_adapter?.dispose();
        router.remove_scene(scene);
        router.dispose();
      };
    }
  });
</script>

<svelte:head><title>Input routing · Squander Core</title></svelte:head>

<article>
  <p class="eyebrow">Core guide</p>
  <h1>Input routing</h1>
  <p class="summary">
    Give the active scene first chance to handle raw keyboard, pointer, and gamepad input, then fall back to global handlers.
  </p>

  <section class="demo" bind:this={host} data-testid="input-demo-host">
    <div class="demo-copy">
      <p><strong>Try it:</strong> press Escape, click the button, move over the panel, or focus the text field and type.</p>
      <p>Escape is consumed by the scene. The button and text field retain browser behavior.</p>
      <button
        type="button"
        data-testid="input-demo-button"
        onclick={() => {
          add_log("native button click");
        }}>Native button</button
      >
      <label>Editable control <input data-testid="input-demo-editable" placeholder="typing stays native" /></label>
    </div>
    <div class="status" data-testid="input-gamepad-status">{gamepad_status}</div>
    <ol data-testid="input-demo-log">
      {#each log as entry, index (index)}
        <li>{entry}</li>
      {:else}
        <li>waiting for input…</li>
      {/each}
    </ol>
  </section>

  <h2>How it works</h2>
  <p>
    The core router is browser-independent. Attach <code>create_browser_input_adapter</code> to a host element to normalize DOM events. The
    adapter listens in capture phase, skips editable controls by default, and applies <code>preventDefault()</code> only when a handler
    returns <code>consume_and_prevent_default</code>.
  </p>
  <p>
    Scene handlers are registered automatically with scene lifecycle. The newest active scene runs first; global handlers receive events
    only when scenes pass them. Gamepad state is sampled when the owner calls <code>poll()</code>.
  </p>

  <h2>Public types</h2>
  <ul>
    <li><code>InputEvent</code>, <code>InputDisposition</code>, and <code>InputRouter</code></li>
    <li><code>SceneDefinition.input</code> and <code>Game.input</code></li>
    <li><code>BrowserInputAdapter</code> and <code>BrowserGamepadAdapter</code></li>
    <li><code>GamepadState</code>, <code>GamepadSnapshot</code>, and <code>GamepadButtonSnapshot</code></li>
  </ul>

  <h2>Minimum viable example</h2>
  <pre><code
      >{`const router = create_input_router();
router.on_global((event) => {
  console.log(event);
  return "pass";
});

const browser_input = create_browser_input_adapter({
  host: game_host,
  router: game.input,
});

const gamepads = create_browser_gamepad_adapter({ router: game.input });
gamepads.poll();
console.log(gamepads.state.all());`}</code
    ></pre>

  <h2>Scope and limitations</h2>
  <p>
    Phase 3B handles raw devices, ownership, and browser default-action policy. Action mapping, rebinding, text input/IME, gesture
    recognition, pointer hit testing, and haptics remain separate capabilities. A physical gamepad must be connected and exposed to the
    browser before its state can be observed.
  </p>
</article>

<style>
  article {
    max-width: 56rem;
  }
  .eyebrow {
    color: var(--gray-6);
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .summary {
    font-size: 1.25rem;
  }
  .demo {
    display: grid;
    gap: 1rem;
    margin: 2rem 0;
    padding: 1.25rem;
    border: 1px solid #39435b;
    background: #111729;
  }
  .demo-copy {
    display: grid;
    gap: 0.75rem;
  }
  button,
  input {
    margin-left: 0.5rem;
    padding: 0.45rem 0.6rem;
  }
  .status {
    color: var(--gray-6);
  }
  ol {
    min-height: 8rem;
    margin: 0;
    padding-left: 1.5rem;
  }
  pre {
    padding: 1rem;
    overflow-x: auto;
    background: #111729;
  }
</style>
