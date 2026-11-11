import { create_game } from "squander";

declare const canvas: HTMLCanvasElement;
const game = create_game({
  renderer: { canvas, width: 800, height: 450 },
  scheduler: {
    request_frame: (callback) => requestAnimationFrame(callback),
    cancel_frame: (handle) => {
      if (typeof handle !== "number") throw new Error("browser frame handles must be numbers");
      cancelAnimationFrame(handle);
    },
    now_seconds: () => performance.now() / 1000,
  },
  setup: async ({ assets, signal }) => {
    const texture = await assets.load_texture(new Blob(), { signal });
    texture.release();
  },
  update: () => undefined,
  draw: () => undefined,
});

await game.ready;
