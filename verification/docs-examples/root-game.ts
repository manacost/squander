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
