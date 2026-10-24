<script lang="ts">
  import { resolve } from "$app/paths";
  interface Props {
    children?: import("svelte").Snippet;
  }

  let { children }: Props = $props();
</script>

{@render children?.()}

<footer class="backlink" data-sveltekit-reload>
  <a href={resolve("/(docs)")}>Back to root</a>
</footer>

<style>
  .backlink {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 1rem 1rem;
    display: flex;
    justify-content: center;
    z-index: 2;
  }

  .backlink :where(:global(a)) {
    color: #fff !important;
  }
</style>
