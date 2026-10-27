<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { asset, resolve } from "$app/paths";
  import { page } from "$app/state";
  import type { LayoutData } from "./$types.js";

  let page_path = $derived(page.url.pathname);

  const links = [["about", "/"]] as const;

  const documentation = ["getting-started", "phase-2", "ui"] as const;

  const scenes = ["pixi-demo", "test", "camera", "ui-test", "ui-bridge", "stack", "complex-example"] as const;
  interface Props {
    data: LayoutData;
    children?: import("svelte").Snippet;
  }

  let { data, children }: Props = $props();

  afterNavigate(() => {
    document.querySelector("#top")?.scrollIntoView({
      behavior: "smooth",
    });
  });
</script>

<svelte:head>
  <link href={asset("fonts.css")} rel="stylesheet" />
  <link href={asset("prism-hopscotch.css")} rel="stylesheet" />
</svelte:head>

<div class="container content">
  <header class="sidebar subtitle">
    <div class="title-and-version">
      <svelte:element this={page_path === "/" ? "h1" : "h2"} class="title">squander</svelte:element>
      <a href={resolve("/package")} class="version"><span class="tiny-v">v</span>{data.package.version}</a>
    </div>

    <nav class="list">
      {#each links as [label, link]}
        <a class="link" class:active={link === page_path} href={resolve("/(docs)")}>{label}</a>
      {/each}

      <h5 class="sep subtitle">Docs</h5>
      {#each documentation as doc}
        {@const link = `/docs/${doc}` as const}
        <a class="link" class:active={link === page_path} href={resolve(`/(docs)/docs/${doc}`)}>{doc}</a>
      {/each}

      <h5 class="sep subtitle">Scenes</h5>
      <div data-sveltekit-reload>
        {#each scenes as scene}
          {@const link = `/scenes/${scene}` as const}
          <a class="link" class:active={link === page_path} href={resolve(`/(game)/scenes/${scene}`)}>{scene}</a>
        {/each}
      </div>
    </nav>
    <div class="links">
      <a class="external-link" href="https://github.com/ancient-cat/squander" target="_blank">github</a>
      <a class="external-link" href="https://www.npmjs.com/package/squander" target="_blank">npm</a>
    </div>
  </header>
  <main class="page">
    <a class="invisible" id="top">top</a>
    {@render children?.()}
  </main>
</div>

<style>
  .invisible {
    visibility: hidden;
  }
  .sidebar {
    margin: 0 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 3rem 2rem;
    background-color: #232121;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .content {
    display: grid;
  }

  .page {
    padding: 2rem 2rem;
    min-height: 100vh;
  }

  @media screen and (min-width: 64rem) {
    .content {
      padding: 0rem 0rem;
      display: grid;
      grid-template-columns: 14rem auto;
      gap: 2.5vw;
      height: 100vh;
    }

    .page {
      padding: 0;
    }
  }

  .page {
    margin-top: 2rem;
  }

  :global(.page :where(h2, h3, h4, h5)) {
    margin: 2rem 0 1rem 0;
  }

  .sep {
    margin-top: 1rem;
  }

  .title {
    font-size: 1.5em;
  }

  .link {
    display: flex;
    padding: 0.25em 0.5em;
    text-decoration: none;
    background-color: hsla(0, 0, 100, 0);
    border-radius: 9px;
    gap: 0.5rem;
  }
  .link:hover {
    background-color: hsla(0deg, 0%, 0%, 0.1);
  }

  .link:before {
    content: "⋱";
    display: inline-block;
    color: #444;
  }

  .active {
    color: #fff;
    background-color: hsla(0deg, 0%, 0%, 0.2);
  }

  .active:before {
    content: "⋊";
    color: #444;

    text-decoration: none;
  }

  .version {
    font-size: 1.25rem;
    text-transform: lowercase;
    color: var(--gray-7);
    text-decoration-color: var(--gray-7);
  }

  .version:hover {
    color: var(--red-4);
    text-decoration-color: var(--red-4);
  }

  .title-and-version {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: end;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .tiny-v {
    font-size: 0.75em;
  }

  .links {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;
    border-top: 1px dashed #444;
    border-bottom: 1px dashed #444;
    padding: 0.25em 0.25em;
    justify-content: space-evenly;
    align-items: center;
  }

  .links a {
    color: var(--gray-5);
  }
</style>
