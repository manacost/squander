# squander

Squander is a TypeScript browser-game toolkit with a WebGPU renderer and an
optional Svelte 5 adapter. The current runtime owns game lifecycle, assets,
sprites, primitives, paths, polygons, cameras, viewports, filtering, fonts,
scenes, input routing, scene-owned UI, and typed UI state bridges.

This checkout contains the npm package and the SvelteKit documentation site.

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
core runtime does not import Svelte at runtime, but this package currently
requires Svelte as a peer dependency for its Svelte entry points.

```sh
npm install squander@^8 svelte@^5
```

<!-- example:root-game:start -->

```ts
import { create_game, type FrameScheduler } from "squander";

const canvas = document.querySelector("canvas");
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("canvas is required");

const scheduler: FrameScheduler = {
  request_frame: (callback) => requestAnimationFrame(callback),
  cancel_frame: (handle) => {
    if (typeof handle !== "number") throw new Error("browser frame handles must be numbers");
    cancelAnimationFrame(handle);
  },
  now_seconds: () => performance.now() / 1000,
};

const game = create_game({
  renderer: { canvas, width: 800, height: 450 },
  scheduler,
  setup: ({ renderer }) => {
    void renderer;
  },
  update: ({ delta_seconds }) => {
    void delta_seconds;
  },
  draw: () => undefined,
});

await game.ready;
```

<!-- example:root-game:end -->

Use `squander/core/runtime` when importing lower-level runtime types. Resources
returned by the game-owned asset and geometry APIs are explicit handles and
must be released by their owner. Draw calls and pure value helpers do not need
release.

## Use signals and event dispatch

Use `squander/signals` for standalone typed signals and event dispatchers:

```ts
import { create_event_dispatcher, create_signal } from "squander/signals";

const score_changed = create_signal<number>();
const stop_score = score_changed.subscribe((score) => console.log(score));
score_changed.emit(10);
stop_score();

type Events = { score: { points: number }; reset: undefined };
const events = create_event_dispatcher<Events>();
events.on("score", ({ points }) => console.log(points));
events.emit("score", { points: 10 });
events.emit("reset");
```

Both utilities return unsubscriber functions, support one-time listeners, and
use stable listener snapshots. Game-scoped scene events remain available from
`game.scenes.events` with game ownership, disposal, and runtime error routing.

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

The replacement runtime is documented as verified capabilities. Current
contracts live in `specs/`, durable rationale lives in
`specifications/decisions.md`, and detailed historical evidence lives in
`specifications/history/`.

```sh
npm run test:unit
npm run test:type
npm run check
npm run test:integration
npm run test:benchmark:ecs
npm run test:benchmark:ecs:browser
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

CI uses two verification lanes. Pull requests run the portable quality lane on
standard GitHub-hosted runners, including CPU, type, package, documentation,
browser, ECS, and advisory benchmark checks. Real WebGPU verification stays in
the protected hardware lane and runs on `main` pushes or manual dispatch against
a trusted Linux GPU runner. Pull requests must not execute untrusted code on a
persistent self-hosted GPU runner. The hardware lane records its browser, host,
adapter, backend, viewport, DPR, and fixture metadata as artifacts.

## Repository map

| Location                           | Purpose                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `src/lib/core/runtime/`            | Replacement lifecycle, assets, geometry, camera, text, and WebGPU runtime. |
| `src/lib/signals/`                 | Standalone typed signals and event dispatchers.                            |
| `src/lib/svelte/`                  | Optional Svelte 5 adapter and `GameHost` component.                        |
| `src/routes/(docs)/docs/core/`     | Focused runtime guides and usage examples.                                 |
| `src/routes/(docs)/docs/examples/` | Runnable composition and feature examples.                                 |
| `tests/`                           | Playwright integration and real WebGPU fixtures.                           |
| `specs/`                           | Capability contracts and promotion criteria.                               |
| `specifications/history/`          | Archived implementation plans, checkpoints, and historical evidence.       |
| `specifications/decisions.md`      | Durable architecture decisions and boundaries.                             |

Generated `dist/`, `build/`, and `.svelte-kit/` output is ignored; edit source
files instead.

## License

MIT. See [LICENSE](LICENSE).
