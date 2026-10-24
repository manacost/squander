# squander

Squander is a TypeScript toolkit for browser games built with **PixiJS 8** and **Svelte 5**. PixiJS renders the game; Svelte renders interactive UI over the canvas. The library provides scene lifecycle and stacking, reactive UI bridges, camera/viewport controls, keyboard input, signals, and game-time utilities.

This repository contains both the npm library and the SvelteKit application used for documentation and playable examples. The package version in this checkout is `1.0.0`.

The replacement framework is planned in [the goals](specifications/goals.md),
[Phase 1](specifications/phase-1.md), and [Phase 2](specifications/phase-2.md).
Current tooling requirements and outstanding lint debt are recorded in
[tooling standards](specifications/tooling-standards.md).

## Develop locally

Use npm with the committed `package-lock.json`. Node.js 22.17 or newer is required; the GitHub Pages workflow uses Node.js 24. SvelteKit 3 configuration lives in `vite.config.ts`; local library imports use the `#lib` package import mapping.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). No environment variables or backend services are required for local development.

Useful routes:

- `/docs/getting-started` — initialization and a first scene.
- `/docs/ui` — connecting scene state to Svelte components.
- `/scenes/pixi-demo` — basic PixiJS rendering.
- `/scenes/stack` — scene push, pop, and switch behavior.
- `/scenes/camera` — viewport controls.
- `/scenes/ui-bridge` — reactive UI bridge.
- `/scenes/complex-example` — a larger battle/UI example.
- `/scenes/test` — experimental scene playground.

## Use the library

In a TypeScript-enabled Svelte application, install the package and its peer dependencies. This checkout declares Svelte `^5.57.1` and PixiJS `^8.5.1` as peers.

```sh
npm install squander svelte@^5.57.1 pixi.js@^8.5.1
```

A minimal Svelte component:

```svelte
<script lang="ts">
  import { Text } from "pixi.js";
  import { Game, Scenes, app } from "squander";

  const hello = Scenes.create(async () => ({
    name: "hello",
    enter() {
      const label = new Text({ text: "Hello, world!", x: 40, y: 40 });
      app.stage.addChild(label);

      return () => {
        app.stage.removeChild(label);
        label.destroy();
      };
    },
    update(ticker) {
      // Advance game logic using the PixiJS ticker.
    },
  }));

  async function start() {
    await Scenes.switch(hello);
  }
</script>

<Game onStart={start} />
```

`Game` initializes the shared PixiJS application, initializes the scene manager, and then calls `onStart`. `Scenes.create` waits for scene-manager initialization before running its factory, so renderer-dependent setup can live inside that factory. Canvas and DOM operations belong in browser lifecycle code.

### Scenes and UI

A scene has a unique `name`, an `update(ticker)` callback, and optional `init`, `enter`, and `exit` hooks. `init` runs once per scene name; `enter` can return a cleanup function. On exit, updates stop, the returned cleanup runs, and then the `exit` hook runs.

- `Scenes.switch(scene)` exits and replaces the top scene.
- `Scenes.push(scene)` adds a scene without exiting or pausing the scenes beneath it.
- `Scenes.pop()` exits and removes the top scene.
- `Scenes.pause(scene)` and `Scenes.resume(scene)` control ticker callbacks.

`create_ui(Component, initialProps)` returns reactive `props` and a `mount()` function. Mount it in a scene's `enter` hook and call the returned cleanup when leaving. Update `ui.props` to change the UI; `ui_proxy` provides reactive state for sharing with other systems. The UI overlay root is supplied by `Game` through `UserInterface`.

The application, scene manager, and UI root are shared singletons. Keep that in mind when changing initialization, navigation, or teardown behavior.

## Repository map

| Location                     | Purpose                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `src/lib/index.ts`           | Public package entry point and exports.                                             |
| `src/lib/core/`              | Application, scenes, input, signals, dispatchers, timing, and observable utilities. |
| `src/lib/core/viewport/`     | In-repository viewport implementation and camera plugins.                           |
| `src/lib/create_viewport.ts` | Viewport creation and mounting helpers.                                             |
| `src/lib/ui/`                | Svelte 5 components and reactive scene/UI bridge.                                   |
| `src/lib/scenes/`            | Demo scenes, UI components, and experiments.                                        |
| `src/routes/(docs)/`         | Documentation pages, Markdown content, and site navigation.                         |
| `src/routes/(game)/scenes/`  | SvelteKit pages that launch the demos.                                              |
| `static/`                    | Static assets used by the site and demos.                                           |
| `src/index.test.ts`          | Current Vitest smoke test.                                                          |
| `tests/`                     | Playwright browser tests.                                                           |
| `.github/workflows/`         | Static-site build and GitHub Pages deployment.                                      |

`#lib/*` resolves to `src/lib/*` through the package import map. Files in `src/lib` are the packaging input, including demos; a file's presence there does not mean it is exported from the package root. Check `src/lib/index.ts` and the `exports` map in `package.json` when changing the consumer-facing API.

`dist/` (library), `build/` (static site), and `.svelte-kit/` (SvelteKit-generated files) are generated output and ignored by git. Edit source files rather than these directories.

## Commands and validation

| Command                    | Purpose                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`              | Start the documentation/demo development server.                                   |
| `npm run check`            | Generate SvelteKit types and run Svelte/TypeScript checks.                         |
| `npm run check:watch`      | Watch Svelte/TypeScript checks.                                                    |
| `npm run lint`             | Check repository formatting, then run ESLint.                                      |
| `npm run format`           | Rewrite formatting throughout the repository.                                      |
| `npm run test:unit`        | Run the Vitest unit suite once.                                                    |
| `npm run test:unit:watch`  | Run Vitest in interactive watch mode.                                              |
| `npm run test:integration` | Run Playwright; its web server builds the project and starts preview on port 4173. |
| `npm test`                 | Run the Playwright browser tests, then the Vitest unit suite.                      |
| `npm run package`          | Generate library output in `dist/` and validate it with Publint.                   |
| `npm run build`            | Build the static site, then package the library.                                   |
| `npm run preview`          | Serve an existing site build locally.                                              |

Install Playwright's browser before the first integration run if it is not already available:

```sh
npx playwright install chromium
```

The unit suite covers observable stores, signals, event dispatch, keyboard mapping, game time, ECS operations, and scene lifecycle. Playwright checks the project landing page and documentation navigation. Vitest discovers `src/**/*.{test,spec}.{js,ts}`; files such as `battle_test.ts` and the separate `test/` directory are not included by that pattern. Rendering changes still require exercising the relevant demo in a browser.

For code changes, run checks relevant to the touched area, add focused behavior tests where practical, and exercise the affected demo in a browser. Use `npm run package` for public API changes and `npm run build` for site/build changes. Record existing failures separately from failures introduced by a change. For documentation-only changes, a targeted formatting check is sufficient:

```sh
npx prettier --check README.md
```

## Build and deployment

SvelteKit uses the static adapter and prerenders routes. `npm run build` produces the site in `build/` and the package in `dist/`.

For a site hosted under a subpath, set `BASE_PATH` during the build:

```sh
BASE_PATH=/squander npm run build
```

The GitHub Pages workflow builds on pushes to `main`, sets `BASE_PATH` to the repository name, and deploys `build/`. It does not currently run lint, type checks, or tests as separate gates. npm publishing is separate; `prepublishOnly` runs the packaging command.

## Context for contributors and agents

The git history starts with TypeScript game utilities and ECS exploration, then introduces SvelteKit for development and packaging. Later changes add scene-driven UI, async initialization, viewport controls, and scene stacking. The Svelte 5 migration (`5bc99aa`) replaces the earlier UI implementation with rune-based state; the current `1.0.0` version follows that migration. Package renames reset earlier version numbering, so older version numbers alone are not a reliable guide to the current API. The latest committed work (`f4653b1`) explores isometric rendering.

Start with the public exports, the implementation being changed, and a relevant demo. The source is the authority when older documentation differs: for example, the UI guide still includes legacy `export let` syntax, while current components use Svelte 5 `$props` and `$state`.

Before editing, inspect `git status` and preserve existing work. Keep changes scoped, follow neighboring naming and lifecycle patterns, and update examples or docs when changing behavior. The formatter uses two spaces, double quotes, trailing commas, and a 140-character print width; prefer formatting touched files over running the repository-wide formatter for a small change.

## License

MIT. See [LICENSE](LICENSE).
