<script lang="ts">
  import UserInterface from "./UserInterface.svelte";
  import PixiRenderer from "./PixiRenderer.svelte";
  import { type Snippet } from "svelte";

  import { initialize } from "#lib/legacy/initialize.js";
  import { Scenes, type Scene } from "#lib/core/scene.js";
  interface Props {
    children?: Snippet<any>;
    onStart: () => void;
  }

  let { onStart }: Props = $props();

  async function start(target: HTMLElement) {
    await initialize(target);
    Scenes.init();

    onStart();
  }
</script>

<UserInterface>
  <PixiRenderer onReady={start} />
</UserInterface>
