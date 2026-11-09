const llms_text = `# Squander

Squander is a TypeScript-first browser-game toolkit. It provides a WebGPU
renderer, a game lifecycle, resource and asset ownership, 2D drawing
primitives, cameras, viewports, input routing, scenes, and an optional Svelte 5
adapter. Svelte is the UI layer, while SvelteKit is the application medium for
delivering routes, documentation, examples, and browser experiences. The core
runtime is independent of both and is designed for composition, ECS-friendly
game code, and agent-assisted development.

## Why use Squander

- Keep game code focused on gameplay while Squander owns WebGPU setup and GPU
  resource lifetime.
- Use strongly typed, functional APIs without adopting a class-heavy engine
  architecture.
- Build browser games with deterministic lifecycle behavior, explicit handles,
  and verifiable rendering.
- Connect a game to Svelte 5 UI without coupling the core runtime to Svelte.
- Give coding agents discoverable package exports, focused examples, and clear
  supported and deferred behavior.

Squander targets 2D browser games. WebGPU is the rendering path; a WebGL
fallback is not promised. Advanced projections, custom shaders, render targets,
mipmaps, and fixed-step simulation are future work rather than current APIs.

## Current goals

- Build a TypeScript-first toolkit for polished 2D browser games with
  composition-friendly, ECS-oriented foundations.
- Keep game code focused on gameplay while Squander owns WebGPU setup, frame
  scheduling, explicit resource lifetime, input routing, scenes, and predictable
  teardown.
- Keep the core runtime independent of Svelte, SvelteKit, and application
  frameworks.
- Use Svelte as the UI layer. Game code owns mutable gameplay state and
  business rules; a typed bridge publishes readonly state and accepts typed
  commands from Svelte UI.
- Use SvelteKit as the delivery medium for routing, documentation, runnable
  examples, composition demos, and the browser/server boundary. SvelteKit
  delivers the surrounding experience; it does not own simulation, rendering,
  or core resource lifetime.
- Provide strong TypeScript inference, explicit ownership, focused
  documentation, and separate CPU, type, coverage, browser, and real-WebGPU
  verification signals.
- Keep deferred capabilities contract-driven: advanced projections, custom
  shaders, render targets, mipmaps, fixed-step scheduling, and action mapping
  require their own supported behavior and evidence before inclusion.
- The initial ECS capability is available from \`squander/ecs\`: define local
  object-shaped component tokens, create independent worlds, run typed fluent
  queries, and use world-level \`export()\`/\`import()\` snapshots. The ECS does
  not register or schedule systems; callers compose ordinary systems and
  lifecycle hooks. Node and trusted-local-origin browser benchmark profiles
  guard the supported workloads. Monotonic numeric IDs are the default;
  create_world(schema, { entity_policy: "generational" }) opts into packed
  generational handles and stale-handle checks. Archetype and typed-column
  optimizations remain deferred.

## Author and project

- Author and maintainer: Rory Duncan
- GitHub: https://github.com/manacost/squander
- npm: https://www.npmjs.com/package/squander
- License: MIT
- Current package version in this repository: 8.1.0

## Table of contents

- [Getting started](#getting-started)
- [Recommended project structure](#recommended-project-structure)
- [Current goals](#current-goals)
- [Use Squander in a SvelteKit project](#use-squander-in-a-sveltekit-project)
- [Core concepts](#core-concepts)
- [Signals and event dispatch](#signals-and-event-dispatch)
- [Entity-component system](#entity-component-system)
- [Game lifecycle and timing](#game-lifecycle-and-timing)
- [WebGPU renderer](#webgpu-renderer)
- [Assets and resources](#assets-and-resources)
- [Sprites and textures](#sprites-and-textures)
- [Shapes](#shapes)
- [Paths and polygons](#paths-and-polygons)
- [Cameras and viewports](#cameras-and-viewports)
- [Input](#input)
- [Scenes](#scenes)
- [Text and fonts](#text-and-fonts)
- [Svelte 5 game UI bridge](#svelte-5-game-ui-bridge)
- [ECS Arena proof game](#ecs-arena-proof-game)
- [Snake example](#snake-example)
- [TypeScript and ownership rules](#typescript-and-ownership-rules)
- [Verification](#verification)
- [Repository map](#repository-map)

## Getting started

Squander is ready in 60 seconds with the SvelteKit path. Squander requires
Node.js 22.17 or newer for development. Install Squander, Svelte, and SvelteKit:

\`\`\`sh
npm install squander@latest svelte@latest @sveltejs/kit@latest
\`\`\`

Create a route such as \`src/routes/+page.svelte\` and mount the exported
\`Game\` component. It creates the browser-side game after mount, owns the
renderer and frame loop, and disposes them when the page unmounts:

\`\`\`svelte
<script lang="ts">
  import { Game, type GameReadyContext } from "squander/svelte";

  const start_game = async ({ scenes }: GameReadyContext): Promise<void> => {
    await scenes.mount(({ renderer }) => ({
      name: "main",
      draw: () => {
        void renderer.clear({ red: 0.05, green: 0.08, blue: 0.15, alpha: 1 });
      },
    }));
  };
</script>

<Game class="game-canvas" onReady={start_game} />
\`\`\`

The first scene clears the canvas so a successful setup is visible. WebGPU
requires a secure context, such as localhost during development or HTTPS in
production. Keep \`Game\` in a Svelte component so WebGPU creation stays
browser-only; do not create a game during server-side rendering. For lower-level
control, import \`create_game\` from the package root or continue with the
[game lifecycle guide](/docs/core/game-lifecycle). Use the
[playground](/docs/examples/playground) for a larger rendered example.

## Use Squander in a SvelteKit project

Create a client-side game component with a canvas. WebGPU needs a secure
context, such as localhost during development or HTTPS in production. Keep
browser-only game creation in a component or another client-only module; do not
create a WebGPU device during server-side rendering.

\`\`\`svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { create_game, type Game } from "squander";

  let canvas: HTMLCanvasElement;
  let game: Game | undefined;

  onMount(() => {
    game = create_game({
      renderer: { canvas, width: 800, height: 450 },
      scheduler: {
        request_frame: (callback) => requestAnimationFrame(callback),
        cancel_frame: (handle) => cancelAnimationFrame(handle),
        now_seconds: () => performance.now() / 1000,
      },
      update: (_time) => {},
      draw: () => {},
    });

    return () => {
      void game?.dispose();
    };
  });
</script>

<canvas bind:this={canvas} width="800" height="450"></canvas>
\`\`\`

For Svelte-driven HUDs and controls, use Svelte as the UI layer: import
\`GameHost\` from \`squander/svelte\` or use \`create_game_adapter\` from
\`squander/svelte/adapter\`. The bridge publishes readonly game snapshots and
accepts typed commands from the UI. The host owns one game instance per mount
and disposes it when unmounted. In a SvelteKit application, keep WebGPU creation
in client-side lifecycle code and use SvelteKit for routing, delivery, and the
surrounding experience. Use Svelte 5 runes in new application components, and
keep gameplay state in the game unless it is UI state that the bridge
intentionally publishes.

## Recommended project structure

Keep the SvelteKit route thin and put game-owned composition under
\`src/lib/game\`. A practical starting structure is:

\`\`\`text
src/
├── lib/
│   └── game/
│       ├── components/  # ECS tokens, local schema, and data shapes
│       ├── scenes/      # lifecycle boundaries and scene composition
│       ├── systems/     # ordinary caller-owned ECS or game systems
│       ├── ui/          # Svelte HUDs, menus, and overlays
│       └── game.ts      # world creation and the game entrypoint
└── routes/
    └── +page.svelte    # mounts squander/svelte and imports game.ts
\`\`\`

Keep \`+page.svelte\` at the application edge:

\`\`\`svelte
<script lang="ts">
  import { Game } from "squander/svelte";
  import { start_game } from "$lib/game/game";
</script>

<Game class="game-canvas" onReady={start_game} />
\`\`\`

Use \`game.ts\` as the composition root. It creates a world from the local
schema, mounts the starting scene, and decides which systems run during each
lifecycle phase. Systems remain ordinary functions, and scenes own ordering,
assets, input, and lifecycle boundaries:

\`\`\`ts
import { create_world } from "squander/ecs";
import type { GameReadyContext } from "squander/svelte";
import { game_schema } from "./components";
import { movement_system } from "./systems/movement";

export const start_game = async ({ scenes }: GameReadyContext): Promise<void> => {
  const world = create_world(game_schema);
  await scenes.mount(({ renderer }) => ({
    name: "play",
    update: ({ delta_seconds }) => movement_system(world, delta_seconds),
    draw: () => {
      void renderer.clear({ red: 0.05, green: 0.08, blue: 0.15, alpha: 1 });
    },
  }));
};
\`\`\`

The ECS does not register or schedule systems. Keep component tokens and the
local schema in \`components/\`, transformations in \`systems/\`, lifecycle
composition in \`scenes/\`, and Svelte UI in \`ui/\`. Gameplay state remains in
the runtime; Svelte reads only the state the game intentionally publishes.

## Core concepts

The package root exports the core runtime. A game owns its renderer, frame
loop, input router, asset cache, resource owner, geometry owner, and scene
composer. Setup runs before the frame loop starts. The \`update\` callback
advances game state, and \`draw\` submits frame-local commands.

\`\`\`ts
import { create_game } from "squander";

const game = create_game({
  renderer: { canvas, width: 800, height: 450 },
  scheduler,
  setup: async ({ assets }) => {
    // Load game-owned assets before the first frame.
    void assets;
  },
  update: ({ delta_seconds }) => {
    // Advance the player, enemies, and simulation.
    void delta_seconds;
  },
  draw: () => {
    // Submit renderer commands here.
  },
});

await game.ready;
\`\`\`

## Signals and event dispatch

Import the standalone reactive utilities from \`squander/signals\`. Signals
carry one value type; event dispatchers map event names to payload types. Both
return unsubscriber functions, support \`once\`, and use a stable listener
snapshot so subscription changes take effect on the next emission.

\`\`\`ts
import { create_event_dispatcher, create_signal } from "squander/signals";

const score_changed = create_signal<number>();
const stop_score = score_changed.subscribe((score) => console.log(score));
score_changed.emit(10);
stop_score();

type Events = {
  score: { points: number };
  reset: undefined;
};

const events = create_event_dispatcher<Events>();
events.on("score", ({ points }) => console.log(points));
events.emit("score", { points: 10 });
events.emit("reset");
\`\`\`

These utilities are standalone and reusable. Game-scoped scene events add
ownership, disposal, and runtime error routing through \`game.scenes.events\`.

## Entity-component system

The optional ECS module is independent of Svelte, scenes, rendering, and the
game loop. An entity-component system (ECS) separates identity, data, and
behavior: an entity is a numeric ID, components are small pieces of data such
as position or health, and systems query entities with the data they need and
update them. This makes it easier to process many similar game objects without
putting every behavior in one large class. In Squander, define object-shaped
component tokens in a local schema and create as many worlds as the application
needs:

\`\`\`ts
// Import the world factory and component definition helper.
import { create_world, define_component } from "squander/ecs";

// Describe the data stored by each position component.
type Position = { x: number; y: number };
// Create a typed token that identifies the position component.
const position = define_component<Position>({ name: "position" });
// Create a world whose local schema contains the position token.
const world = create_world({ position });
// Allocate a cheap numeric entity ID.
const entity = world.create();
// Attach the initial position data to the entity.
world.add(entity, position, { x: 0, y: 0 });

// Require position before iterating matching entities.
world.query().with(position).each(({ read, write }) => {
  // Read the current value, then write the updated x coordinate.
  const { y } = read(position);
  write(position).x += y;
});
\`\`\`

Queries expose only requested component tokens at compile time. Use
\`toArray()\` for live match views or \`toSnapshots()\` for detached copies.
Structural match operations are deferred until the current query finishes.
Monotonic IDs are the default and are never reused. Generational worlds pack a
slot and generation into numeric handles, reuse slots, and reject stale
handles. Version 1 snapshots preserve numeric IDs and require a matching
identity policy.
World-level \`export()\` and \`import()\` preserve numeric entity IDs and
component values without requiring persistence codecs on each component.
JSON, binary formats, migrations, and runtime-only value policies belong in an
application-owned serializer. The ECS provides no scheduler or system registry;
callers decide whether an ordinary system exposes \`enter\`, \`update\`,
\`draw\`, or \`exit\`, and where to invoke those hooks.

## ECS Arena proof game

The live \`/scenes/ecs-arena\` route is a small top-down WebGPU game built on
the ECS API. The caller owns the system order: input, spawn, fire, steering,
movement, combat, and cleanup. The world creates drones and projectiles,
updates position and velocity components through queries, and destroys
colliding entities through deferred structural operations. The HUD reports
score, wave, entity count, and the system order so the ECS behavior is visible
while playing.

Use WASD or arrow keys to move, Space to fire, P or Escape to pause, and R to
restart. The proof game is an example application, not a scheduler or a new
ECS package API. It intentionally omits assets, audio, progression, and
multiplayer.

## Game lifecycle and timing

Use \`game.ready\` to await renderer creation and setup. Use \`pause\`,
\`resume\`, and \`set_visibility\` for lifecycle control. Call \`dispose\`
when a game leaves the page. The frame loop clamps unusually large deltas,
resets timing after suspension, and does not update while paused.

\`\`\`ts
await game.ready;
game.pause();
game.resume();
await game.dispose();
\`\`\`

Current timing is variable-step browser-frame timing. A fixed-step simulation is
not part of the current runtime.

## WebGPU renderer

The renderer creates the adapter, device, canvas context, pipelines, textures,
samplers, and readback path. It requires \`navigator.gpu\` and a secure context.
Use \`create_webgpu_renderer\` directly when a standalone renderer is useful;
normally \`create_game\` creates and owns it.

\`\`\`ts
import { create_webgpu_renderer } from "squander/core/runtime";

const renderer = await create_webgpu_renderer({ canvas, width: 800, height: 450 });
await renderer.clear({ red: 0.04, green: 0.05, blue: 0.1, alpha: 1 });
renderer.dispose();
\`\`\`

Handle \`WebGpuUnavailableError\` and \`GameDeviceLostError\` at an
application boundary. Custom shaders and render targets are not currently
public features.

## Assets and resources

Load textures and fonts through the game-owned asset cache, or create dynamic
textures from \`Blob\` and \`File\` values. Asset loading honors cancellation.
Resources returned by asset and geometry APIs are explicit handles: release
them when the owner no longer needs them. Accepted draws retain a safe lease
until the renderer can release the underlying resource.

\`\`\`ts
const hero = await assets.load_texture(hero_blob, { magnification: "nearest" });
renderer.draw_texture(hero.read(), { x: 400, y: 225, width: 64, height: 64 });
hero.release();
\`\`\`

Use \`game.resources\` and \`game.geometry\` for resources that need a game
lifetime. Do not keep or read a handle after releasing it.

## Sprites and textures

Use \`renderer.draw_texture\` for sprites and atlas regions. A draw can specify
position, size, source region, origin, scale, rotation, horizontal or vertical
flip, tint, opacity, and submission order. Use \`nearest\` filtering for
pixel-art games and \`linear\` filtering for smooth art.

\`\`\`ts
renderer.draw_texture(hero.read(), {
  x: player.x,
  y: player.y,
  width: 48,
  height: 48,
  origin: { x: 0.5, y: 0.5 },
  rotation: degrees(player.angle),
  flip_x: player.facing_left,
  tint: rgba(1, 0.9, 0.9, 1),
  opacity: player.invulnerable ? 0.5 : 1,
});
\`\`\`

Draw order is observable. Selectable blend modes, mipmaps, and anisotropic
filtering are not currently exposed.

## Shapes

Shapes are frame-local commands for HUDs, debug overlays, hit effects, and game
geometry. Supported commands include filled and outlined rectangles, circles,
and lines. Invalid geometry throws; valid zero-area geometry draws nothing.

\`\`\`ts
renderer.draw_commands([
  {
    kind: "rectangle",
    draw: { rectangle: { x: 20, y: 20, width: 180, height: 24 }, color: rgba(0.1, 0.1, 0.15, 1) },
  },
  {
    kind: "circle",
    draw: { circle: { x: player.x, y: player.y, radius: 18 }, color: rgba(0.2, 0.8, 0.4, 1) },
  },
]);
\`\`\`

Rounded caps and joins, dashed strokes, and inside/outside stroke alignment are
deferred.

## Paths and polygons

Create reusable paths for curved effects, trails, and outlines. Create polygons
for filled game regions and collision-like visualizations. Constructors copy
caller data, and updates validate before replacing geometry.

\`\`\`ts
const trail = create_path([move_to(0, 0), quadratic_to(40, -30, 80, 0)]);
const island = create_polygon([
  { x: 0, y: 0 },
  { x: 80, y: 10 },
  { x: 45, y: 60 },
]);

trail.update([move_to(player.x, player.y), line_to(player.x - 80, player.y + 20)]);
\`\`\`

Use the exported path, flattening, stroke, polygon, and triangulation helpers
from \`squander/core/runtime\`. Holes, fill rules, and filled curved paths are
not current features.

## Cameras and viewports

Use a 2D camera to draw world coordinates through position, zoom, and rotation.
Use viewport sizing helpers to keep logical coordinates stable as CSS size,
letterboxing, device pixels, and physical canvas size change.

\`\`\`ts
const camera = create_camera({
  x: player.x,
  y: player.y,
  zoom: 2,
  rotation: degrees(0),
  viewport: game.get_viewport(),
});

camera.draw(() => {
  renderer.draw_texture(hero.read(), { x: player.x, y: player.y });
});
\`\`\`

Drawing inside a camera scope uses world space; drawing outside it uses screen
space. Camera scope restoration is synchronous, including when a callback
throws. Automatic culling and cursor-anchored zoom are deferred.

## Input

The game owns an input router for keyboard, pointer, and gamepad input. Route
input to the active scene first, then use a global fallback for controls such as
pause or opening a menu. Keep input handlers short and update game state in the
game loop when ordering matters.

\`\`\`ts
const remove_pause_input = game.input.on_global((event) => {
  if (event.type === "key" && event.phase === "down" && event.code === "Escape") {
    game.pause();
    return "consume";
  }
  return "pass";
});
\`\`\`

Call \`remove_pause_input\` when the game no longer needs the global handler.

The exact event types and registration methods are exported from
\`squander/core/runtime\`; prefer those types over browser events when writing
game systems.

## Scenes

Scenes are game-owned lifecycle objects. Mount, replace, and remove scenes
asynchronously. Active scenes update and draw from the bottom of the stack to
the top, making overlays and menus natural composition units. Scene factories
can declare typed asset dependencies and use the game-owned event bus.

\`\`\`ts
const menu = await game.scenes.mount(({ events }) => ({
  name: "pause menu",
  init: () => events.on("resume", () => void game.scenes.remove(menu)),
  update: () => {},
  draw: () => draw_pause_menu(),
}));

game.scenes.events.emit("resume", undefined);
\`\`\`

Scene removal disposes the scene permanently. Shared manifest assets remain
usable while one scene leaves. Scene-owned Svelte UI is available through the
optional \`Game\` host and remains outside the core runtime:

\`\`\`svelte
<Game onReady={({ scenes }) => {
  scenes.switch(scenes.create(({ create_ui }) => ({
    name: "hud",
    enter: () => create_ui(Hud, { score: 0 }),
  })));
}} />
\`\`\`

Use \`GameHost\` or \`create_game_adapter\` for the lower-level typed state bridge.

## Text and fonts

Load a bundled font through the font-loading API, prepare its glyphs, and draw
changing game labels or HUD text with the renderer. Font atlas textures follow
the same ownership and filtering rules as other textures.

\`\`\`ts
import { asset } from "$app/paths";

const font_url = \`url("\${asset("fonts/example.ttf")}")\`;
const font = await assets.load_font(font_url, { filter: "nearest" });
renderer.draw_text(font.read(), "SCORE 1200", { x: 24, y: 24, size: 24 });
font.release();
\`\`\`

Use the text example in the documentation site as the current end-to-end
reference. When the site loads a font from its \`static/\` directory, use
SvelteKit's \`asset("fonts/example.ttf")\` helper when building the CSS font
source so the configured deployment base is preserved. Rich text layout and
advanced font shaping are outside the current runtime scope.

## Svelte 5 game UI bridge

Use \`GameHost\` for the common state/command bridge, \`Game\` for scene-owned
Svelte UI, or \`create_game_adapter\` for a custom host. Svelte owns the UI
presentation; the game publishes readonly state snapshots, and the UI calls
typed commands. The command object preserves synchronous and asynchronous
return types. SvelteKit can deliver this UI through routes and browser
experiences without becoming a dependency of the core runtime.

\`\`\`svelte
<GameHost initial_state={{ score: 0 }} {commands} {create}>
  {#snippet children(view)}
    <output>{view.state.score}</output>
    <button onclick={() => view.commands.increment(1)}>+1</button>
  {/snippet}
</GameHost>
\`\`\`

The adapter is optional, Node-safe, and does not make the core runtime depend on
Svelte. A host owns its subscriptions and game and disposes both on unmount.

## Snake example

The Snake example at \`/docs/examples/snake\` is a complete 50×50 arcade game
built into the documentation site. It keeps the simulation in an example-local
state machine and uses \`GameHost\` for menus, score, pause state, and touch
controls. WebGPU shape commands draw the near-black board, readable snake
segments, and randomly colored fruit.

The example supports arrow keys, WASD, and an accessible touch D-pad. Starting,
resuming, restarting, or changing direction through the D-pad returns keyboard
focus to the board, so arrow keys stay with the game instead of scrolling the
documentation page. Wall and self collisions end a run; fruit increases the
score and gradually increases movement speed. The example does not add package
exports, gamepad support, persistent scores, audio, or network play.

\`\`\`ts
type SnakeState = Readonly<{
  status: "start" | "playing" | "paused" | "game-over";
  snake: readonly GridPoint[];
  fruit: GridPoint | null;
  score: number;
}>;
\`\`\`

Use the live page as the end-to-end reference for combining a pure game model,
\`create_game\`, renderer shape commands, browser input routing, and a typed
\`GameHost\` bridge.

## TypeScript and ownership rules

- Import public types from the package exports instead of reaching into source
  files.
- Prefer the package root for normal game code and \`squander/ecs\` for ECS
  code.
- Use \`squander/core\` only when you need the compatibility core barrel.
- Use \`squander/core/runtime\` for lower-level runtime types and helpers.
- Keep the core runtime Svelte-independent; use the Svelte adapter only at the
  application boundary.
- Treat asset, resource, geometry, and scene handles as owned values and release
  them through their documented owner.
- Do not use a released handle or pass a resource between games.
- Use runtime narrowing and typed helpers rather than TypeScript assertions in
  production game code.

## Verification

For a repository checkout, run focused CPU tests with \`npm run test:unit\`,
type checks with \`npm run test:type\`, and Svelte diagnostics with
\`npm run check\`. Run \`npm run test:integration\` for browser flows and
\`npm run test:webgpu\` for real WebGPU rendering.

Real WebGPU verification must use trusted local HTTP or HTTPS, assert secure
context, adapter creation, and device creation, and verify deterministic pixel
or buffer readback. A missing \`navigator.gpu\` or adapter is a failed
verification environment, not a passing skip.

## Repository map

- \`src/lib/core/runtime/\` — lifecycle, assets, geometry, camera, text, input,
  scenes, and WebGPU runtime.
- \`src/lib/svelte/\` — optional Svelte 5 adapter and \`GameHost\`.
- \`src/routes/(docs)/docs/core/\` — focused runtime guides.
- \`src/routes/(docs)/docs/examples/\` — runnable feature and composition demos.
- \`src/routes/(game)/scenes/ecs-arena/\` — the ECS Arena proof game and its deterministic model tests.
- \`src/routes/(docs)/docs/examples/snake/\` — the complete Snake arcade example and its simulation tests.
- \`tests/\` — Playwright integration and real WebGPU fixtures.
- \`specifications/\` — capability contracts, decisions, and evidence.

Read the focused documentation and source exports together when an API detail
matters. The documentation site is at https://github.com/manacost/squander.
`;

// eslint-disable-next-line @typescript-eslint/naming-convention -- SvelteKit requires the GET export name.
export const GET = (_request: Request): Response =>
  new Response(llms_text, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });

export const prerender = true;
