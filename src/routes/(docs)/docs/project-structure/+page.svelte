<script lang="ts">
  import CodeBlock from "../../../../lib/docs/CodeBlock.svelte";
</script>

<svelte:head><title>Project structure · Squander</title></svelte:head>

<article class="project-structure">
  <h1>Organize your game project</h1>
  <p class="summary">Keep the route thin, the game state local, and every ECS concern easy to find as your game grows.</p>

  <h2>Start with a game module</h2>
  <p>
    Squander does not require a generated project layout. For a SvelteKit game, this structure gives the runtime a clear home while keeping
    browser routes focused on composition:
  </p>
  <pre class="tree"><code
      >src/
├── lib/
│   └── game/
│       ├── components/
│       │   ├── index.ts
│       │   └── ...
│       ├── scenes/
│       │   ├── main-menu.ts
│       │   └── play.ts
│       ├── systems/
│       │   ├── movement.ts
│       │   └── combat.ts
│       ├── ui/
│       │   ├── Hud.svelte
│       │   └── PauseMenu.svelte
│       └── game.ts
└── routes/
    └── +page.svelte</code
    ></pre>

  <p>
    Add folders only when the game needs them. The important boundary is <code>src/lib/game</code>: it contains game-owned state and
    composition, while <code>src/routes</code> delivers that game through SvelteKit.
  </p>

  <h2>Keep the route at the edge</h2>
  <p>
    A route should connect SvelteKit to the game and stay out of gameplay. Import the <code>Game</code> component from
    <code>squander/svelte</code> and the game entrypoint from your own module:
  </p>
  <CodeBlock
    language="svelte"
    code={`<script lang="ts">
  import { Game } from "squander/svelte";
  import { start_game } from "$lib/game/game";
\u003C/script>

<Game class="game-canvas" onReady={start_game} />

<style>
  :global(.game-canvas) {
    width: min(100%, 800px);
    aspect-ratio: 16 / 9;
  }
</style>`}
  />

  <h2>Make <code>game.ts</code> the composition root</h2>
  <p>
    Use <code>game.ts</code> to create the world for one game instance, mount the starting scene, and decide which systems run in which lifecycle
    phase. It should assemble the game, not contain every mechanic.
  </p>
  <CodeBlock
    language="typescript"
    code={`import { create_world } from "squander/ecs";
import type { GameReadyContext } from "squander/svelte";
import { game_schema } from "./components";
import { movement_system } from "./systems/movement";

export const start_game = async ({ scenes }: GameReadyContext): Promise<void> => {
  const world = create_world(game_schema);

  await scenes.mount(({ renderer }) => ({
    name: "play",
    update: ({ delta_seconds }) => {
      movement_system(world, delta_seconds);
    },
    draw: () => {
      void renderer.clear({ red: 0.05, green: 0.08, blue: 0.15, alpha: 1 });
    },
  }));
};`}
  />

  <h2>Let each folder own one kind of decision</h2>
  <dl class="ownership-list">
    <div>
      <dt><code>components/</code></dt>
      <dd>Define component tokens, the local schema, and the data shape shared by systems.</dd>
    </div>
    <div>
      <dt><code>systems/</code></dt>
      <dd>Write ordinary functions that query and update a world. They do not register themselves with an ECS scheduler.</dd>
    </div>
    <div>
      <dt><code>scenes/</code></dt>
      <dd>Own lifecycle boundaries, assets, input, and which systems run together for a mode of play.</dd>
    </div>
    <div>
      <dt><code>ui/</code></dt>
      <dd>
        Keep HUDs, menus, and overlays in Svelte. UI reads the state you intentionally publish; it does not become the gameplay source of
        truth.
      </dd>
    </div>
    <div>
      <dt><code>game.ts</code></dt>
      <dd>Assemble the world and scenes, define game-level events, and expose the entrypoint that the route calls.</dd>
    </div>
  </dl>

  <h2>Define the ECS schema locally</h2>
  <p>
    Squander's ECS uses component tokens that belong to a local schema. Keep those tokens together so systems share one typed vocabulary
    without global registration or declaration merging:
  </p>
  <CodeBlock
    language="typescript"
    code={`import { define_component, define_components, type World } from "squander/ecs";

export type Position = { x: number; y: number };

export const position = define_component<Position>({ name: "position" });
export const game_schema = define_components({ position });
export type GameWorld = World<typeof game_schema>;`}
  />

  <h2>Keep systems small and caller-owned</h2>
  <p>
    A system is just a function with the dependencies it needs. The scene or game module owns ordering, so the same system can be reused in
    a different scene or composed with non-ECS game code:
  </p>
  <CodeBlock
    language="typescript"
    code={`import { position, type GameWorld } from "../components";

export const movement_system = (world: GameWorld, delta_seconds: number): void => {
  world.query().with(position).each(({ write }) => {
    write(position).x += 60 * delta_seconds;
  });
};`}
  />

  <h2>Why this scales</h2>
  <ul>
    <li>The route remains a small SvelteKit adapter instead of becoming a second game loop.</li>
    <li>The game module owns composition without hiding the update and draw order.</li>
    <li>Components describe data, systems describe transformations, and scenes describe lifecycle.</li>
    <li>Svelte stays at the UI seam, while gameplay state remains in the game runtime.</li>
  </ul>

  <p class="next-step">
    Start with one <code>game.ts</code>, one scene, and a local schema. Split a folder when a game concern has its own vocabulary or
    lifecycle—not because the tree looks more complete.
  </p>
</article>

<style>
  .project-structure {
    width: 100%;
    max-width: 900px;
    min-width: 0;
  }
  .summary {
    max-width: 48rem;
    font-size: 1.25rem;
  }
  .project-structure h2 {
    margin-top: 2.5rem;
  }
  .project-structure p {
    max-width: 52rem;
  }
  pre {
    box-sizing: border-box;
    max-width: 100%;
    margin: 1rem 0;
    padding: 1rem;
    overflow-x: auto;
    background: #111729;
  }
  code {
    overflow-wrap: anywhere;
  }
  .tree {
    border: 1px solid #39435b;
  }
  .tree code {
    white-space: pre;
    overflow-wrap: normal;
  }
  .ownership-list {
    display: grid;
    gap: 1rem;
    margin: 1.25rem 0 0;
  }
  .ownership-list div {
    padding-top: 0.75rem;
    border-top: 1px solid #39435b;
  }
  .ownership-list dt {
    font-weight: 700;
  }
  .ownership-list dd {
    max-width: 52rem;
    margin: 0.35rem 0 0;
  }
  .next-step {
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #39435b;
  }
</style>
