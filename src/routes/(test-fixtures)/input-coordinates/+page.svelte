<script lang="ts">
  import { onMount } from "svelte";
  import {
    calculate_fixed_viewport,
    create_browser_input_adapter,
    create_input_router,
    type PointerInputEvent,
  } from "../../../lib/core/index.js";

  let host: HTMLDivElement;
  let pointer_events = $state<PointerInputEvent[]>([]);
  const viewport = calculate_fixed_viewport({
    logical_width: 800,
    logical_height: 450,
    css_width: 400,
    css_height: 400,
    device_pixel_ratio: 1,
  });

  onMount(() => {
    const router = create_input_router();
    router.on_global((event) => {
      if (event.type === "pointer") pointer_events.push(event);
      return "pass";
    });
    const adapter = create_browser_input_adapter({ host, router, viewport });
    return () => {
      adapter.dispose();
      router.dispose();
    };
  });
</script>

<main>
  <div bind:this={host} class="input-host" data-testid="logical-input-host"></div>
  <output data-testid="logical-input-events">{JSON.stringify(pointer_events)}</output>
</main>

<style>
  :global(body) {
    margin: 0;
  }

  main {
    min-height: 100vh;
  }

  .input-host {
    position: absolute;
    top: 40px;
    left: 50px;
    width: 400px;
    height: 400px;
  }
</style>
