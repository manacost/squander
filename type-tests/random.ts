import { create_random, type RandomState, type RandomSource } from "../src/lib/index.js";

const random: RandomSource = create_random({ seed: "replay-42" });
const value: number = random.next_float();
const index: number = random.next_int(0, 10);
const state: RandomState = random.snapshot();
const restored: RandomSource = create_random({ state });

void value;
void index;
void restored;

// @ts-expect-error Random sources require an explicit valid options shape.
create_random({ seed: true });

// @ts-expect-error Snapshots cannot be used as numeric bounds.
random.next_int(state, 10);
