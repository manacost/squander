<script lang="ts">
  type Action = { label: string; run: () => void | Promise<void> };
  type Props = { title: string; body: string; actions: readonly Action[] };

  let { title, body, actions }: Props = $props();
</script>

<section class="stack-panel" aria-label={title}>
  <h2>{title}</h2>
  <p>{body}</p>
  <div class="actions">
    {#each actions as action (action.label)}
      <button type="button" onclick={() => void action.run()}>{action.label}</button>
    {/each}
  </div>
</section>

<style>
  .stack-panel {
    box-sizing: border-box;
    max-width: 22rem;
    margin: 0.75rem;
    padding: 1rem;
    border: 1px solid rgb(180 205 255 / 0.7);
    border-radius: 0.5rem;
    background: rgb(8 18 42 / 0.94);
    color: #eef4ff;
    box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 0.25);
  }

  h2,
  p {
    margin: 0;
  }

  p {
    margin-top: 0.5rem;
    color: #c6d4f2;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>
