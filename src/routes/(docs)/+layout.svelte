<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { asset, resolve } from "$app/paths";
  import { page } from "$app/state";
  import { core_guides } from "../../lib/docs/core-guides.js";
  import type { LayoutData } from "./$types.js";

  let page_path = $derived(page.url.pathname);

  const links = [["about", "/"]] satisfies readonly (readonly [string, string])[];

  const documentation = [
    {
      label: "core",
      href: "/docs/core",
      target: "/(docs)/docs/core",
      children: [
        { label: "text", href: "/docs/examples/text" },
        { label: "input routing", href: "/docs/examples/input" },
        ...core_guides.map((guide) => ({ label: guide.label, href: `/docs/core/${guide.slug}` })),
      ],
    },
    {
      label: "demos",
      href: "/docs/examples/playground",
      target: "/(docs)/docs/examples/playground",
      children: [
        { label: "playground", href: "/docs/examples/playground", target: "/(docs)/docs/examples/playground" },
        { label: "scenes", href: "/docs/examples/scenes", target: "/(docs)/docs/examples/scenes" },
        { label: "scene UI", href: "/docs/examples/scene-ui", target: "/(docs)/docs/examples/scene-ui" },
        { label: "svelte", href: "/docs/examples/svelte", target: "/(docs)/docs/examples/svelte" },
      ],
    },
  ] as const;
  type Props = {
    data: LayoutData;
    children?: import("svelte").Snippet;
  };

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
      {#each links as [label, link] (link)}
        <a class="link" class:active={link === page_path} href={resolve("/(docs)")}>{label}</a>
      {/each}

      <h5 class="sep subtitle">Docs</h5>
      {#each documentation as doc (doc.href)}
        <a class="link" class:active={doc.href === page_path} href={resolve(doc.target)}>{doc.label}</a>
        {#if doc.children}
          {#each doc.children as child (child.href)}
            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- child URLs are explicit public docs paths. -->
            <a class="link nested" class:active={child.href === page_path} href={child.href}>{child.label}</a>
          {/each}
        {/if}
      {/each}
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
    min-width: 0;
    width: 100%;
  }

  .page {
    padding: 2rem 2rem;
    min-width: 0;
    max-width: 100%;
    min-height: 100vh;
    overflow-wrap: anywhere;
  }

  :global(.page :where(pre, table)) {
    max-width: 100%;
    overflow-x: auto;
  }

  :global(.page pre) {
    box-sizing: border-box;
    min-width: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  :global(.page code) {
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  :global(.page :not(pre) > code) {
    padding: 0;
    border-radius: 0;
    background: transparent;
  }

  :global(.page pre > code) {
    display: block;
    max-width: 100%;
    min-width: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  :global(.page :where(img, canvas, svg, video)) {
    max-width: 100%;
    height: auto;
  }

  :global(.page :where(a, code, output)) {
    overflow-wrap: anywhere;
  }

  @media screen and (min-width: 64rem) {
    .content {
      padding: 0rem 0rem;
      display: block;
      min-height: 100vh;
    }

    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 10;
      box-sizing: border-box;
      width: 14rem;
      height: 100vh;
      overflow-y: auto;
    }

    .page {
      margin-left: calc(14rem + 2.5vw);
      padding: 0;
    }
  }

  @media screen and (max-width: 63.99rem) {
    .sidebar {
      position: static;
      height: auto;
      overflow: visible;
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
    gap: 0.5rem;
  }
  .link:hover {
    background-color: hsla(0deg, 0%, 0%, 0.1);
  }

  .nested {
    margin-left: 0.75rem;
    font-size: 0.95em;
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
