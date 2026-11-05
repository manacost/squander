import { create_game, type GameOptions, type SceneFactory, type SceneHandle } from "../src/lib/core/index.js";

type Manifest = {
  hero: {
    load: (signal: AbortSignal) => Promise<string>;
    destroy: (resource: string) => void;
  };
};

const scheduler = {
  request_frame: () => 0,
  cancel_frame: () => undefined,
  now_seconds: () => 0,
};

const options: GameOptions<Manifest> = {
  renderer: { canvas: {} as HTMLCanvasElement, width: 1, height: 1 },
  scheduler,
  manifest: {
    hero: { load: async () => "hero", destroy: () => undefined },
  },
  update: () => undefined,
  draw: () => undefined,
};

const game = create_game(options);
const factory: SceneFactory<Manifest> = ({ signal }) => ({
  name: "typed scene",
  init: () => {
    signal.throwIfAborted();
  },
  update: (time) => {
    const delta: number = time.delta_seconds;
    void delta;
  },
  input: (event) => {
    if (event.type === "key") {
      const code: string = event.code;
      void code;
    }
    return "pass";
  },
});

const dependency_factory: SceneFactory<Manifest> = ({ assets }) => ({
  name: "dependency scene",
  dependencies: { hero: "hero" },
  init: async () => {
    const handle = await assets.load("hero");
    const value: string = handle.read();
    void value;
  },
});
void dependency_factory;

const manifest_factory: SceneFactory<Manifest> = ({ manifest }) => ({
  name: manifest.hero.load.name,
});
void manifest_factory;

game.scenes.mount(factory).then((handle: SceneHandle) => {
  void game.scenes.remove(handle);
});

// @ts-expect-error Scene factories must return a named scene definition.
const invalid_factory: SceneFactory<Manifest> = () => ({ update: () => undefined });
void invalid_factory;

// @ts-expect-error A scene handle is not a string identifier.
void game.scenes.remove("scene-id");

const invalid_manifest_factory: SceneFactory<Manifest> = ({ manifest }) => {
  // @ts-expect-error Unknown manifest keys must be rejected in scene context.
  void manifest.missing;
  return { name: "invalid" };
};
void invalid_manifest_factory;

type SceneEvents = {
  score: { points: number };
  reset: undefined;
};

const typed_game = create_game<Manifest, SceneEvents>(options);
const typed_factory: SceneFactory<Manifest, SceneEvents> = ({ events }) => {
  events.on("score", ({ points }) => {
    const typed_points: number = points;
    void typed_points;
  });
  events.emit("score", { points: 1 });
  // @ts-expect-error Event payloads must match the declared event map.
  events.emit("score", { points: "one" });
  // @ts-expect-error Unknown event names must be rejected.
  events.emit("missing", undefined);
  return { name: "typed events" };
};
void typed_game;
void typed_factory;

typed_game.input.on_global((event) => {
  if (event.type === "gamepad" && event.phase === "axis") {
    const value: number = event.value;
    void value;
  }
  return "pass";
});

// @ts-expect-error Scene input handlers must return a declared routing disposition.
const invalid_input_factory: SceneFactory<Manifest> = () => ({ name: "invalid input", input: () => "handled" });
void invalid_input_factory;

const invalid_dependency_factory: SceneFactory<Manifest> = () => ({
  name: "invalid dependency",
  dependencies: {
    // @ts-expect-error Dependency values must be keys from the parent manifest.
    hero: "missing",
  },
});
void invalid_dependency_factory;
