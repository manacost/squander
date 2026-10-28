import { create_game, type GameOptions } from "../src/lib/core/runtime/game.js";

const scheduler = {
  request_frame: () => 0,
  cancel_frame: () => undefined,
  now_seconds: () => 0,
};

const options: GameOptions<{
  hero: {
    load: (signal: AbortSignal) => Promise<string>;
    destroy: (resource: string) => void;
  };
}> = {
  scheduler,
  manifest: {
    hero: {
      load: async () => "hero",
      destroy: () => undefined,
    },
  },
  update: () => undefined,
  draw: () => undefined,
};

const game = create_game(options);
game.assets.load("hero").then((handle) => {
  const value: string = handle.read();
  void value;
});

// @ts-expect-error Unknown manifest keys must be rejected.
void game.assets.load("missing");
