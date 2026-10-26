import { create_update_clock, type UpdateClock, type UpdateTime } from "./timing.js";

export type FrameScheduler = Readonly<{
  request_frame: (callback: () => void) => unknown;
  cancel_frame: (handle: unknown) => void;
  now_seconds: () => number;
}>;

export type FrameLoopOptions = Readonly<{
  scheduler: FrameScheduler;
  update: (time: UpdateTime) => void;
  draw: () => void;
  on_error?: (error: unknown) => void;
  max_delta_seconds?: number;
}>;

export type FrameLoopState = "idle" | "running" | "paused" | "hidden" | "stopped" | "disposed";

export type FrameLoop = Readonly<{
  start: () => void;
  pause: () => void;
  resume: () => void;
  set_visibility: (visible: boolean) => void;
  dispose: () => Promise<void>;
  get_state: () => FrameLoopState;
}>;

export const create_frame_loop = (options: FrameLoopOptions): FrameLoop => {
  const update_clock: UpdateClock = create_update_clock({ max_delta_seconds: options.max_delta_seconds });
  let state: FrameLoopState = "idle";
  let frame_handle: unknown;
  let cleanup_promise: Promise<void> | undefined;
  let manually_paused = false;

  const report_error = (error: unknown): void => {
    state = "stopped";
    if (frame_handle !== undefined) {
      options.scheduler.cancel_frame(frame_handle);
      frame_handle = undefined;
    }
    options.on_error?.(error);
  };

  const schedule = (): void => {
    if (state === "running" || state === "paused") {
      frame_handle = options.scheduler.request_frame(run_frame);
    }
  };

  const run_frame = (): void => {
    frame_handle = undefined;
    if (state !== "running" && state !== "paused") {
      return;
    }

    try {
      if (state === "running") {
        options.update(update_clock.sample(options.scheduler.now_seconds()));
      }
      options.draw();
    } catch (error) {
      report_error(error);
      return;
    }

    schedule();
  };

  const start = (): void => {
    if (state !== "idle") {
      return;
    }
    state = "running";
    schedule();
  };

  const pause = (): void => {
    if (state === "running") {
      manually_paused = true;
      state = "paused";
    }
  };

  const resume = (): void => {
    if (state === "paused" && manually_paused) {
      manually_paused = false;
      update_clock.reset(options.scheduler.now_seconds());
      state = "running";
    }
  };

  const set_visibility = (visible: boolean): void => {
    if (!visible) {
      if (state === "running" || state === "paused") {
        state = "hidden";
        update_clock.reset(options.scheduler.now_seconds());
        if (frame_handle !== undefined) {
          options.scheduler.cancel_frame(frame_handle);
          frame_handle = undefined;
        }
      }
      return;
    }

    if (state === "hidden") {
      state = manually_paused ? "paused" : "running";
      update_clock.reset(options.scheduler.now_seconds());
      schedule();
    }
  };

  const dispose = (): Promise<void> => {
    if (cleanup_promise !== undefined) {
      return cleanup_promise;
    }
    state = "disposed";
    if (frame_handle !== undefined) {
      options.scheduler.cancel_frame(frame_handle);
      frame_handle = undefined;
    }
    cleanup_promise = Promise.resolve();
    return cleanup_promise;
  };

  return Object.freeze({ start, pause, resume, set_visibility, dispose, get_state: () => state });
};
