import { create_random, type RandomState, type RandomSource } from "../src/lib/index.js";

const random: RandomSource = create_random({ seed: "replay-42" });
const value: number = random.next_float();
const index: number = random.next_int(0, 10);
const picked: string = random.pick(["a", "b"]);
const shuffled: string[] = random.shuffle(["a", "b"]);
const forked: RandomSource = random.fork("loot");
const state: RandomState = random.snapshot();
const restored: RandomSource = create_random({ state });

void value;
void index;
void picked;
void shuffled;
void forked;
void restored;

// @ts-expect-error Random sources require an explicit valid options shape.
create_random({ seed: true });

// @ts-expect-error Snapshots cannot be used as numeric bounds.
random.next_int(state, 10);
