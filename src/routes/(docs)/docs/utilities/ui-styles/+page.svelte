<script lang="ts">
  import { resolve } from "$app/paths";
  import CodeBlock from "../../../../../lib/docs/CodeBlock.svelte";

  const preview_url = resolve("/(test-fixtures)/ui-styles");
</script>

<svelte:head><title>UI styles · Squander utilities</title></svelte:head>

<article class="guide">
  <header class="guide-intro">
    <h1>UI styles</h1>
    <p class="summary">Give game HUDs, menus, overlays, and forms a quiet, predictable baseline with two opt-in CSS entry points.</p>
    <p class="goal"><strong>Goal:</strong> Use a basic UI until you're ready to stylize further.</p>
  </header>

  <section class="live-example" aria-labelledby="ui-styles-preview-title">
    <h2 id="ui-styles-preview-title">See the default theme</h2>
    <p>The preview uses semantic HTML only. It has no Squander UI components and no required class vocabulary.</p>
    <iframe title="Squander UI styles preview" src={preview_url}></iframe>
  </section>

  <h2>Choose the layer you need</h2>
  <p>
    Import <code>reset.css</code> when you want a normalized document baseline. Import <code>ui.css</code> when you want Squander’s dark, quiet
    utility theme. The theme does not import the reset, so each layer stays independently useful.
  </p>
  <CodeBlock
    language="css"
    code={`@import "squander/styles/reset.css";
@import "squander/styles/ui.css";`}
  />

  <h2>Use semantic markup</h2>
  <p>
    The theme styles native headings, links, buttons, form controls, dialogs, menus, fieldsets, tables, details, progress, and status
    outputs. Forms use compact aligned rows, and buttons use a flat lower ledge instead of a full border. Compose your game UI with the HTML
    semantics that describe its job.
  </p>
  <CodeBlock
    language="html"
    code={`<dialog open>
  <h2>Run paused</h2>
  <p>Resume when you are ready.</p>
  <button type="button">Resume</button>
</dialog>`}
  />

  <h2>Customize the tokens</h2>
  <p>Override the public custom properties in your application stylesheet. The shipped rules live in a low-priority CSS layer.</p>
  <CodeBlock
    language="css"
    code={`:root {
  --squander-color-accent: #7de2b0;
  --squander-color-control: #741c3b;
  --squander-font-display: "Your Display Face", sans-serif;
  --squander-font-heading-weight: 400;
  --squander-button-ledge-size: 3px;
}`}
  />

  <h2>Scope and limits</h2>
  <p>
    The stylesheet is globally active after import and is designed for game-facing HTML. It keeps heading steps close together instead of
    imposing document-style information hierarchy, uses compact form spacing, and reduces borders to purposeful boundaries and control
    edges. It does not create layout containers, style the WebGPU canvas, add runtime behavior, or provide a light theme. Consumer CSS can
    override the tokens and add application-specific layout or component rules.
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

  .summary {
    max-width: 48rem;
    margin: 0;
    font-size: 1rem;
  }

  .goal {
    margin: 0;
    color: #8e9abd;
    font-size: 0.8rem;
  }

  .live-example {
    display: grid;
    gap: 0.75rem;
    margin: 2rem 0;
    padding: 1.25rem 0;
    border-block: 1px solid #39435b;
  }

  iframe {
    display: block;
    inline-size: 100%;
    min-block-size: 720px;
    border: 1px solid #39435b;
    background: #05070d;
  }

  @media screen and (max-width: 44rem) {
    iframe {
      min-block-size: 960px;
    }
  }
</style>
