# squander

Squander is a TypeScript browser-game toolkit with a WebGPU renderer and an
optional Svelte 5 adapter. The Phase 2 replacement runtime owns game lifecycle,
assets, sprites, primitives, paths, polygons, cameras, viewports, filtering,
fonts, and typed UI state bridges.

This checkout contains the npm package and the SvelteKit documentation site.
The package version is `2.0.0`.

## Develop locally

Node.js 22.17 or newer is required. Install the locked dependencies and start
the documentation site:

```sh
npm ci
npm run dev
```

Useful routes:

- `/docs/core` — focused runtime guides with types, code samples, and proof links.
- `/docs/examples/playground` — the composed WebGPU playground.
- `/docs/examples/svelte` — the Svelte 5 adapter and UI bridge example.
- `/docs/examples/text` — bundled-font loading and text rendering.

## Use the core runtime

The package root and `squander/core` expose the same replacement runtime. The
core package has no Svelte dependency.

```sh
npm install squander@^2 svelte@^5
```

```ts
import { create_game } from "squander";

const canvas = document.querySelector("canvas");
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("canvas is required");

const game = create_game({
  renderer: { canvas, width: 800, height: 450 },
  setup: ({ renderer }) => {
    void renderer;
  },
  update: (delta_seconds) => {
    void delta_seconds;
  },
  draw: () => undefined,
});

await game.ready;
```

Use `squander/core/runtime` when importing lower-level runtime types. Resources
returned by the game-owned asset and geometry APIs are explicit handles and
must be released by their owner. Draw calls and pure value helpers do not need
release.

## Use the Svelte adapter

The Svelte integration is opt-in:

```ts
import { create_game_adapter } from "squander/svelte/adapter";
import GameHost from "squander/svelte";
```

`GameHost` owns one game instance per mount and exposes a readonly snapshot with
typed commands. `create_game_adapter` is available for custom hosts and remains
Node-safe; Svelte components must be compiled by a Svelte-aware consumer.

## Evidence and verification

The replacement runtime is documented as verified slices. Capability contracts
live in `specs/`, and detailed evidence lives in
`specifications/checkpoints/`.

```sh
npm run test:unit
npm run test:type
npm run check
npm run test:integration
npm run test:webgpu
npm run check:coverage
npm run validate:specs
npm run package
npm run validate:package
npm run validate:consumer
```

The WebGPU suite requires trusted local Chromium with the configured GPU flags.
Missing WebGPU is a failed verification environment, not a passing skip.
Deterministic texture/buffer readback is the rendering correctness gate;
screenshots are supplemental visual evidence.

## Repository map

| Location                           | Purpose                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `src/lib/core/runtime/`            | Replacement lifecycle, assets, geometry, camera, text, and WebGPU runtime. |
| `src/lib/svelte/`                  | Optional Svelte 5 adapter and `GameHost` component.                        |
| `src/routes/(docs)/docs/core/`    | Focused runtime guides and usage examples.                                |
| `src/routes/(docs)/docs/examples/` | Runnable composition and feature examples.                               |
| `tests/`                           | Playwright integration and real WebGPU fixtures.                           |
| `specs/`                           | Capability contracts and promotion criteria.                               |
| `specifications/checkpoints/`      | Evidence records, gaps, and go/no-go decisions.                            |

Generated `dist/`, `build/`, and `.svelte-kit/` output is ignored; edit source
files instead.

## License

MIT. See [LICENSE](LICENSE).
