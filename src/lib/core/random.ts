export type RandomSeed = number | string;

export type RandomState = Readonly<{
  algorithm: "xoshiro128**";
  state: readonly [number, number, number, number];
  stream_key?: readonly [number, number, number, number];
}>;

export type RandomOptions = Readonly<{
  seed?: RandomSeed;
  state?: RandomState;
}>;

export type RandomSource = Readonly<{
  next_u32: () => number;
  next_float: () => number;
  next_int: (min_inclusive: number, max_exclusive: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
  fork: (label: string) => RandomSource;
  snapshot: () => RandomState;
}>;

const uint32_range = 0x1_0000_0000;
const uint32_max = 0xffff_ffff;
const algorithm: RandomState["algorithm"] = "xoshiro128**";

type MutableState = [number, number, number, number];

const normalize_word = (value: number, name: string): number => {
  if (!Number.isInteger(value) || value < 0 || value > uint32_max) {
    throw new RangeError(`${name} must be an unsigned 32-bit integer`);
  }
  return value;
};

const clone_state = (state: readonly [number, number, number, number]): MutableState => [
  normalize_word(state[0], "state[0]"),
  normalize_word(state[1], "state[1]"),
  normalize_word(state[2], "state[2]"),
  normalize_word(state[3], "state[3]"),
];

const rotate_left = (value: number, shift: number): number => (value << shift) | (value >>> (32 - shift));

const mix32 = (value: number): number => {
  let mixed = value;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x85eb_ca6b);
  mixed = Math.imul(mixed ^ (mixed >>> 13), 0xc2b2_ae35);
  return (mixed ^ (mixed >>> 16)) >>> 0;
};

const hash_string = (value: string, initial: number): number => {
  let hash = initial;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16_777_619) >>> 0;
  }
  return hash;
};

const words_from_seed = (seed_value: number): MutableState => {
  const words: MutableState = [0, 0, 0, 0];
  for (let index = 0; index < words.length; index += 1) {
    seed_value = (seed_value + 0x9e37_79b9) >>> 0;
    words[index] = mix32(seed_value);
  }
  if (words.every((word) => word === 0)) {
    words[0] = 1;
  }
  return words;
};

const seed_words = (seed: RandomSeed): MutableState => {
  if (typeof seed === "number") {
    if (!Number.isSafeInteger(seed)) {
      throw new RangeError("numeric seeds must be safe integers");
    }
    return words_from_seed(seed >>> 0);
  }
  return words_from_seed(hash_string(seed, 2_166_136_261));
};

const derive_stream_key = (parent_key: readonly [number, number, number, number], label: string): MutableState => {
  let seed_value = 2_166_136_261;
  for (const word of parent_key) {
    seed_value = Math.imul(seed_value ^ word, 16_777_619) >>> 0;
  }
  return words_from_seed(hash_string(label, seed_value));
};

const entropy_state = (): MutableState => {
  const values = globalThis.crypto.getRandomValues(new Uint32Array(4));
  const state: MutableState = [values[0], values[1], values[2], values[3]];
  if (state.every((word) => word === 0)) {
    state[0] = 1;
  }
  return state;
};

const state_from_snapshot = (snapshot: RandomState): { state: MutableState; stream_key: MutableState } => {
  const state = clone_state(snapshot.state);
  if (state.every((word) => word === 0)) {
    throw new RangeError("random state cannot be all zero");
  }
  const stream_key = snapshot.stream_key === undefined ? clone_state(snapshot.state) : clone_state(snapshot.stream_key);
  if (stream_key.every((word) => word === 0)) {
    throw new RangeError("random stream key cannot be all zero");
  }
  return { state, stream_key };
};

const create_source = (state: MutableState, stream_key: MutableState): RandomSource => {
  const next_u32 = (): number => {
    const result = Math.imul(rotate_left(Math.imul(state[1], 5), 7), 9) >>> 0;
    const temporary = (state[1] << 9) >>> 0;

    state[2] = (state[2] ^ state[0]) >>> 0;
    state[3] = (state[3] ^ state[1]) >>> 0;
    state[1] = (state[1] ^ state[2]) >>> 0;
    state[0] = (state[0] ^ state[3]) >>> 0;
    state[2] = (state[2] ^ temporary) >>> 0;
    state[3] = rotate_left(state[3], 11) >>> 0;

    return result;
  };

  const next_float = (): number => next_u32() / uint32_range;

  const next_int = (min_inclusive: number, max_exclusive: number): number => {
    if (!Number.isSafeInteger(min_inclusive) || !Number.isSafeInteger(max_exclusive)) {
      throw new RangeError("random integer bounds must be safe integers");
    }
    if (max_exclusive <= min_inclusive) {
      throw new RangeError("random integer upper bound must be greater than its lower bound");
    }
    const range = max_exclusive - min_inclusive;
    if (range > uint32_range) {
      throw new RangeError("random integer range must fit in an unsigned 32-bit value");
    }

    const limit = uint32_range - (uint32_range % range);
    let value = next_u32();
    while (value >= limit) {
      value = next_u32();
    }
    return min_inclusive + (value % range);
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new RangeError("cannot pick from an empty collection");
    }
    return items[next_int(0, items.length)];
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap_index = next_int(0, index + 1);
      const current = shuffled[index];
      shuffled[index] = shuffled[swap_index];
      shuffled[swap_index] = current;
    }
    return shuffled;
  };

  const fork = (label: string): RandomSource => {
    const child_state = derive_stream_key(stream_key, label);
    return create_source(clone_state(child_state), clone_state(child_state));
  };

  const snapshot = (): RandomState => ({
    algorithm,
    state: [state[0], state[1], state[2], state[3]],
    stream_key: [stream_key[0], stream_key[1], stream_key[2], stream_key[3]],
  });

  return Object.freeze({ next_u32, next_float, next_int, pick, shuffle, fork, snapshot });
};

export const create_random = (options: RandomOptions = {}): RandomSource => {
  if (options.seed !== undefined && options.state !== undefined) {
    throw new RangeError("random options cannot include both seed and state");
  }
  const source_state =
    options.state !== undefined
      ? state_from_snapshot(options.state)
      : options.seed !== undefined
        ? (() => {
            const state = seed_words(options.seed);
            return { state, stream_key: clone_state(state) };
          })()
        : (() => {
            const state = entropy_state();
            return { state, stream_key: clone_state(state) };
          })();
  return create_source(source_state.state, source_state.stream_key);
};
