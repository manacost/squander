<script lang="ts">
  import { GameHost } from "squander/svelte";

  const commands = {
    increment: (amount: number) => amount + 1,
  };
</script>

<GameHost
  initial_state={{ score: 0 }}
  {commands}
  create={() => {
    throw new Error("create a game here");
  }}
>
  {#snippet children(view)}
    <output>{view.state.score}</output>
    <button onclick={() => view.commands.increment(1)}>+1</button>
  {/snippet}
</GameHost>
