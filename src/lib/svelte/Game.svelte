<script
  lang="ts"
  generics="Manifest extends AssetManifest = AssetManifest, EventMap extends Record<string, unknown> = Record<string, unknown>"
>
  import { onMount } from "svelte";
  import { create_game, type AssetManifest, type Game as CoreGame } from "../core/index.js";
  import { calculate_responsive_viewport } from "../core/runtime/viewport_sizing.js";
  import { create_game_ready_context, type GameProps } from "./scenes.js";

  let { manifest, onReady: on_ready, onError: on_error, class: class_name }: GameProps<Manifest, EventMap> = $props();
  let canvas = $state<HTMLCanvasElement>();
  let ui_root = $state<HTMLDivElement>();

  onMount(() => {
    if (canvas === undefined || ui_root === undefined) return;
    const canvas_element = canvas;
    const ui_root_element = ui_root;
    const controller = new AbortController();
    let dispose_ui: (() => void) | undefined;
    let game: CoreGame<Manifest, EventMap> | undefined;
    let ready = false;
    let error_reported = false;
    const resize = (): void => {
      if (game === undefined || !ready) return;
      const bounds = canvas_element.getBoundingClientRect();
      game.resize(
        calculate_responsive_viewport({
          css_width: Math.max(1, bounds.width),
          css_height: Math.max(1, bounds.height),
          device_pixel_ratio: window.devicePixelRatio,
        }),
      );
    };

    const bounds = canvas_element.getBoundingClientRect();
    const created_game = create_game<Manifest, EventMap>({
      manifest,
      renderer: { canvas: canvas_element, width: Math.max(1, bounds.width), height: Math.max(1, bounds.height) },
      scheduler: {
        request_frame: (callback) => requestAnimationFrame(callback),
        cancel_frame: (handle) => {
          cancelAnimationFrame(handle as number);
        },
        now_seconds: () => performance.now() / 1000,
      },
      update: () => undefined,
      draw: () => undefined,
      on_error: (error) => {
        error_reported = true;
        if (on_error !== undefined) on_error(error);
      },
    });
    game = created_game;
    const observer = new ResizeObserver(resize);
    observer.observe(canvas_element);

    void (async () => {
      try {
        await created_game.ready;
        if (controller.signal.aborted) return;
        ready = true;
        resize();
        const ready_context = create_game_ready_context(created_game, ui_root_element, controller.signal);
        dispose_ui = ready_context.controller.dispose;
        if (on_ready !== undefined) await on_ready(ready_context.context);
      } catch (cause) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- on_error is an optional public callback.
        if (!controller.signal.aborted && !error_reported && on_error !== undefined) on_error(cause);
        dispose_ui?.();
        await created_game.dispose();
      }
    })();

    return () => {
      controller.abort();
      observer.disconnect();
      dispose_ui?.();
      void created_game.dispose();
    };
  });
</script>

<div class={class_name}>
  <canvas bind:this={canvas}></canvas>
  <div class="scene-ui-layer" bind:this={ui_root}></div>
</div>

<style>
  div {
    position: relative;
  }

  canvas,
  .scene-ui-layer {
    display: block;
    width: 100%;
    height: 100%;
  }

  .scene-ui-layer {
    inset: 0;
    pointer-events: none;
    position: absolute;
  }

  .scene-ui-layer :global(*) {
    pointer-events: auto;
  }
</style>
