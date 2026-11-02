<script lang="ts">
  import type { Component } from "svelte";

  type Props = {
    component: Component<Record<string, unknown>>;
    initial_props: Record<string, unknown>;
  };

  let { component, initial_props }: Props = $props();
  const get_initial_props = (): Record<string, unknown> => initial_props;
  let props = $state(get_initial_props());
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Svelte requires a capitalized dynamic component binding.
  let SceneComponent = $derived(component);

  export const update = (patch: Record<string, unknown>): void => {
    props = { ...props, ...patch };
  };
</script>

<SceneComponent {...props} />
