<script lang="ts">
  type Props = {
    label: string;
    onAdvance: () => Promise<void>;
    onUpdate?: () => void;
  };

  let { label, onAdvance, onUpdate }: Props = $props();
</script>

<section data-testid="scene-ui-panel">
  <p data-testid="scene-ui-label">{label}</p>
  <button data-testid="scene-ui-advance" onclick={() => void onAdvance()}>Advance</button>
  {#if onUpdate}
    <button data-testid="scene-ui-update" onclick={onUpdate}>Update</button>
  {/if}
</section>
