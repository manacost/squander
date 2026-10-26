export type UpdateTime = Readonly<{
  delta_seconds: number;
  elapsed_seconds: number;
  update_index: number;
  measured_delta_seconds: number;
  delta_was_clamped: boolean;
}>;

export type UpdateClockOptions = Readonly<{
  max_delta_seconds?: number;
}>;

export type UpdateClock = Readonly<{
  sample: (timestamp_seconds: number) => UpdateTime;
  reset: (timestamp_seconds: number) => void;
}>;

const default_max_delta_seconds = 0.1;

const assert_finite = (value: number, name: string): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
};

const create_update_time = (
  delta_seconds: number,
  elapsed_seconds: number,
  update_index: number,
  measured_delta_seconds: number,
  delta_was_clamped: boolean,
): UpdateTime =>
  Object.freeze({
    delta_seconds,
    elapsed_seconds,
    update_index,
    measured_delta_seconds,
    delta_was_clamped,
  });

export const create_update_clock = (options: UpdateClockOptions = {}): UpdateClock => {
  const max_delta_seconds = options.max_delta_seconds ?? default_max_delta_seconds;
  if (!Number.isFinite(max_delta_seconds) || max_delta_seconds <= 0) {
    throw new RangeError("max_delta_seconds must be finite and greater than zero");
  }

  let previous_timestamp_seconds: number | undefined;
  let first_sample_after_reset = false;
  let elapsed_seconds = 0;
  let update_index = 0;

  const sample = (timestamp_seconds: number): UpdateTime => {
    assert_finite(timestamp_seconds, "timestamp_seconds");

    if (previous_timestamp_seconds === undefined) {
      previous_timestamp_seconds = timestamp_seconds;
      const first_time = create_update_time(0, elapsed_seconds, update_index, 0, false);
      update_index += 1;
      return first_time;
    }

    if (first_sample_after_reset) {
      first_sample_after_reset = false;
      previous_timestamp_seconds = timestamp_seconds;
      const reset_time = create_update_time(0, elapsed_seconds, update_index, 0, false);
      update_index += 1;
      return reset_time;
    }

    const measured_delta_seconds = Math.max(0, timestamp_seconds - previous_timestamp_seconds);
    previous_timestamp_seconds = timestamp_seconds;
    const delta_seconds = Math.min(measured_delta_seconds, max_delta_seconds);
    const delta_was_clamped = delta_seconds !== measured_delta_seconds;
    elapsed_seconds += delta_seconds;
    const time = create_update_time(delta_seconds, elapsed_seconds, update_index, measured_delta_seconds, delta_was_clamped);
    update_index += 1;
    return time;
  };

  const reset = (timestamp_seconds: number): void => {
    assert_finite(timestamp_seconds, "timestamp_seconds");
    previous_timestamp_seconds = timestamp_seconds;
    first_sample_after_reset = true;
  };

  return Object.freeze({ sample, reset });
};
