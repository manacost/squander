<script lang="ts">
  import { onDestroy } from "svelte";
  import { highlight_code, type CodeLanguage } from "./highlight-code.js";

  type Props = { code: string; language?: CodeLanguage };
  type CopyState = "idle" | "copied" | "error";

  let { code, language = "typescript" }: Props = $props();
  const highlighted_code = $derived(highlight_code(code, language));
  let copy_state = $state<CopyState>("idle");
  let reset_timeout: ReturnType<typeof setTimeout> | undefined;
  const copy_label = $derived(copy_state === "copied" ? "copied · ready" : copy_state === "error" ? "copy unavailable" : "copy sample");

  function schedule_reset(): void {
    if (reset_timeout !== undefined) clearTimeout(reset_timeout);
    reset_timeout = setTimeout(() => {
      copy_state = "idle";
      reset_timeout = undefined;
    }, 1800);
  }

  async function copy_code(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      copy_state = "copied";
    } catch {
      copy_state = "error";
    }
    schedule_reset();
  }

  onDestroy(() => {
    if (reset_timeout !== undefined) clearTimeout(reset_timeout);
  });
</script>

<div class:copied={copy_state === "copied"} class:error={copy_state === "error"} class="code-block">
  <div class="code-toolbar">
    <span class="code-language">{language}</span>
    <button class="copy-button" type="button" aria-label={copy_label} onclick={copy_code}>{copy_label}</button>
  </div>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- Prism returns escaped markup for the trusted code sample. -->
  <pre class={`language-${language}`}><code class={`language-${language}`}>{@html highlighted_code}</code></pre>
</div>

<style>
  .code-block {
    margin: 0.5em 0;
    border-block: 1px solid #39435b;
    background: #322931;
  }

  .code-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.35rem 1rem;
    border-bottom: 1px solid #39435b;
    background: #151923;
    color: #b9b5b8;
    font-family: "Fira Mono", Menlo, Monaco, "Lucida Console", "Courier New", Courier, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .code-language {
    color: #fdcc59;
  }

  .copy-button {
    padding: 0.25rem 0.55rem;
    border: 1px solid #6076a8;
    border-radius: 0;
    background: #39435b;
    box-shadow: none;
    color: #fff;
    font: inherit;
    line-height: 1.1;
    letter-spacing: inherit;
    text-transform: inherit;
    cursor: pointer;
    transition:
      background-color 120ms ease-out,
      border-color 120ms ease-out,
      color 120ms ease-out;
  }

  .copy-button:hover {
    border-color: #eef2fb;
    background: #4a5a7b;
  }

  .copy-button:active {
    transform: translateY(1px);
  }

  .copy-button:focus-visible {
    outline: 2px solid var(--red-4);
    outline-offset: 2px;
  }

  .copied .copy-button {
    border-color: #8fc13e;
    color: #d8f39b;
  }

  .error .copy-button {
    border-color: #dd464c;
    color: #ffb4b6;
  }

  .code-block pre {
    margin: 0;
    background: transparent;
  }

  @media (prefers-reduced-motion: reduce) {
    .copy-button {
      transition: none;
    }
  }
</style>
