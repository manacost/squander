import { create_game, type GameOptions } from "../src/lib/core/runtime/game.js";
import type { ResourceHandle } from "../src/lib/core/runtime/resource_ownership.js";
import type { WebGpuTexture } from "../src/lib/core/runtime/webgpu_renderer.js";

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
  renderer: {
    canvas: {} as HTMLCanvasElement,
    width: 1,
    height: 1,
  },
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

game.assets.load_texture(new Blob(), { filter: "nearest" }).then((handle) => {
  const texture: ResourceHandle<WebGpuTexture> = handle;
  void texture;
});
game.assets.load_texture(new File([], "avatar.png"), { signal: new AbortController().signal });

// @ts-expect-error Dynamic texture loading rejects non-Blob values.
void game.assets.load_texture("not-an-image");

// @ts-expect-error Unknown manifest keys must be rejected.
void game.assets.load("missing");
