import { create_update_clock, type FixedStepOptions, type UpdateClock, type UpdateTime } from "./timing.js";

export type FrameScheduler = Readonly<{
  request_frame: (callback: () => void) => unknown;
  cancel_frame: (handle: unknown) => void;
  now_seconds: () => number;
}>;

export type FrameLoopOptions = Readonly<{
  scheduler: FrameScheduler;
  update: (time: UpdateTime) => void;
  draw: () => unknown;
  on_error?: (error: unknown) => void;
  max_delta_seconds?: number;
  fixed_step?: FixedStepOptions;
}>;

export type FrameLoopState = "idle" | "running" | "paused" | "hidden" | "stopped" | "disposed";

export type FrameLoop = Readonly<{
  start: () => void;
  pause: () => void;
  resume: () => void;
  set_visibility: (visible: boolean) => void;
  dispose: () => Promise<void>;
  fail: (error: unknown) => void;
  get_state: () => FrameLoopState;
}>;

export const create_frame_loop = (options: FrameLoopOptions): FrameLoop => {
  const update_clock: UpdateClock = create_update_clock({ max_delta_seconds: options.max_delta_seconds });
  let state: FrameLoopState = "idle";
  let frame_handle: unknown;
  let cleanup_promise: Promise<void> | undefined;
  let manually_paused = false;
  const fixed_step = options.fixed_step;
  if (fixed_step !== undefined) {
    if (!Number.isFinite(fixed_step.step_seconds) || fixed_step.step_seconds <= 0) {
      throw new RangeError("fixed_step.step_seconds must be finite and greater than zero");
    }
    if (
      fixed_step.max_steps_per_frame !== undefined &&
      (!Number.isInteger(fixed_step.max_steps_per_frame) || fixed_step.max_steps_per_frame <= 0)
    ) {
      throw new RangeError("fixed_step.max_steps_per_frame must be a positive integer");
    }
  }
  const max_steps_per_frame = fixed_step?.max_steps_per_frame ?? 5;
  let fixed_accumulator_seconds = 0;
  let fixed_elapsed_seconds = 0;
  let fixed_update_index = 0;

  const report_error = (error: unknown): void => {
    if (state === "disposed") {
      return;
    }
    if (frame_handle !== undefined) {
      options.scheduler.cancel_frame(frame_handle);
      frame_handle = undefined;
    }
    state = "stopped";
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
        const sampled_time = update_clock.sample(options.scheduler.now_seconds());
        if (fixed_step === undefined) {
          options.update(sampled_time);
        } else {
          fixed_accumulator_seconds += sampled_time.measured_delta_seconds;
          let steps = 0;
          let discarded_seconds = 0;
          const fixed_times: UpdateTime[] = [];
          while (fixed_accumulator_seconds >= fixed_step.step_seconds && steps < max_steps_per_frame) {
            fixed_accumulator_seconds -= fixed_step.step_seconds;
            fixed_elapsed_seconds += fixed_step.step_seconds;
            const fixed_time: UpdateTime = Object.freeze({
              delta_seconds: fixed_step.step_seconds,
              elapsed_seconds: fixed_elapsed_seconds,
              update_index: fixed_update_index,
              measured_delta_seconds: sampled_time.measured_delta_seconds,
              delta_was_clamped: false,
              discarded_seconds: 0,
            });
            fixed_update_index += 1;
            fixed_times.push(fixed_time);
            steps += 1;
          }
          if (steps === max_steps_per_frame && fixed_accumulator_seconds >= fixed_step.step_seconds) {
            discarded_seconds = fixed_accumulator_seconds;
            fixed_accumulator_seconds = 0;
          }
          if (discarded_seconds > 0) {
            const last_index = fixed_times.length - 1;
            const last_time = fixed_times[last_index];
            fixed_times[last_index] = Object.freeze({
              ...last_time,
              delta_was_clamped: true,
              discarded_seconds,
            });
          }
          fixed_times.forEach(options.update);
        }
      }
      const draw_result = options.draw();
      if (
        draw_result !== null &&
        (typeof draw_result === "object" || typeof draw_result === "function") &&
        "then" in draw_result &&
        typeof draw_result.then === "function"
      ) {
        void Promise.resolve(draw_result).then(
          () => {
            schedule();
          },
          (error: unknown) => {
            report_error(error);
          },
        );
        return;
      }
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

  const fail = (error: unknown): void => {
    if (state === "disposed" || state === "stopped") {
      return;
    }
    report_error(error);
  };

  return Object.freeze({ start, pause, resume, set_visibility, dispose, fail, get_state: () => state });
};
