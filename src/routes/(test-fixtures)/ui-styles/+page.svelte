<script lang="ts">
  import "../../../lib/styles/reset.css";
  import "../../../lib/styles/ui.css";
</script>

<svelte:head>
  <title>Squander UI styles fixture</title>
</svelte:head>

<main class="preview-shell">
  <header class="preview-header">
    <div>
      <p class="preview-label">Squander UI styles</p>
      <h1>Lorem ipsum HUD</h1>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    </div>
    <button type="button" data-testid="primary-action">Start run</button>
  </header>

  <div class="preview-grid" data-testid="preview-grid">
    <section aria-labelledby="status-title">
      <h2 id="status-title">Lorem status</h2>
      <p>Lorem ipsum dolor sit amet.</p>
      <output data-testid="status-output">Lorem ipsum · 1200</output>
      <progress value="72" max="100" aria-label="Wave progress"></progress>
    </section>

    <section aria-labelledby="controls-title">
      <h2 id="controls-title">Lorem controls</h2>
      <form>
        <fieldset>
          <legend>Lorem setup</legend>
          <p>
            <label for="player-name">Call sign</label>
            <input id="player-name" value="Rook" />
          </p>
          <p>
            <label for="difficulty">Difficulty</label>
            <select id="difficulty">
              <option>Lorem ipsum</option>
              <option selected>Dolor sit</option>
              <option>Amet</option>
            </select>
          </p>
          <menu>
            <li><button type="submit">Apply</button></li>
            <li><button type="button" disabled>Locked</button></li>
          </menu>
        </fieldset>
      </form>
    </section>

    <dialog open data-testid="style-dialog" aria-labelledby="dialog-title">
      <h2 id="dialog-title">Lorem ipsum</h2>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
      <button type="button">Resume</button>
    </dialog>
  </div>

  <details open>
    <summary>Lorem notes</summary>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.</p>
  </details>
</main>

<style>
  .preview-shell {
    display: grid;
    gap: 0.75rem;
    min-block-size: 100vh;
    padding: clamp(0.5rem, 2vw, 1.5rem);
  }

  .preview-header,
  .preview-grid {
    display: grid;
    gap: 0.5rem;
  }

  .preview-header {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    padding-block-end: 0.75rem;
  }

  .preview-header > div,
  .preview-grid > section,
  .preview-grid > dialog {
    display: grid;
    gap: 0.375rem;
  }

  .preview-header p,
  .preview-grid p,
  details p {
    max-inline-size: 65ch;
    color: var(--squander-color-text-muted);
  }

  .preview-label {
    color: var(--squander-color-accent) !important;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .preview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .preview-grid > section,
  .preview-grid > dialog {
    background: var(--squander-color-surface);
    padding: 0.625rem;
  }

  progress {
    inline-size: 100%;
  }

  /* The documentation shell loads Open Props globally; keep its unlayered control defaults out of this isolated preview. */
  :global(.preview-shell :where(button, input, select, textarea)) {
    background: var(--squander-color-control);
    color: var(--squander-color-text);
    box-shadow: none;
  }

  :global(.preview-shell button) {
    border: 0;
    border-block-end: var(--squander-button-ledge-size) solid var(--squander-color-control-ledge);
    border-radius: var(--squander-radius);
  }

  :global(.preview-shell :where(input, select, textarea)) {
    border-radius: var(--squander-radius);
    border: 1px solid var(--squander-color-border);
  }

  :global(.preview-shell fieldset) {
    border: 0;
  }

  :global(.preview-shell dialog) {
    box-shadow: none;
  }

  :global(.preview-shell dialog[open]) {
    position: static;
    margin: 0;
    max-inline-size: none;
  }

  :global(.preview-shell details) {
    background: transparent;
  }

  :global(.preview-shell summary) {
    background: transparent;
    color: var(--squander-color-text-muted);
  }

  :global(.preview-shell output) {
    color: var(--squander-color-text-muted);
  }

  :global(.preview-shell :where(button, input, select, textarea):focus-visible) {
    outline: var(--squander-focus-width) solid var(--squander-color-accent);
    outline-offset: var(--squander-focus-offset);
  }

  /* Keep the fixture isolated from the documentation shell's display scale. */
  :global(.preview-shell :where(h1, h2, h3, h4, h5, h6)) {
    color: var(--squander-color-text);
    font-family: var(--squander-font-display);
    font-weight: var(--squander-font-heading-weight);
    line-height: var(--squander-heading-line-height);
  }

  :global(.preview-shell h1) {
    font-size: var(--squander-font-size-h1);
  }

  :global(.preview-shell h2) {
    font-size: var(--squander-font-size-h2);
  }

  :global(.preview-shell h3) {
    font-size: var(--squander-font-size-h3);
  }

  :global(.preview-shell h4) {
    font-size: var(--squander-font-size-h4);
  }

  :global(.preview-shell h5) {
    font-size: var(--squander-font-size-h5);
  }

  :global(.preview-shell h6) {
    font-size: var(--squander-font-size-h6);
  }

  @media (max-width: 44rem) {
    .preview-header {
      grid-template-columns: 1fr;
      align-items: start;
    }

    .preview-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
