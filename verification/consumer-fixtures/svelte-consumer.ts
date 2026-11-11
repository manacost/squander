import { create_game_adapter, type GameAdapterView, type GameReadyContext } from "squander/svelte";
import { create_game_adapter as create_adapter } from "squander/svelte/adapter";

type State = { score: number };
type Commands = { increment: (amount: number) => number };

const adapter = create_game_adapter<State, Commands>({
  initial_state: { score: 0 },
  commands: { increment: (amount) => amount + 1 },
  create: () => {
    throw new Error("consumer fixture does not mount a browser game");
  },
});
const view: GameAdapterView<State, Commands> = adapter.view;
const result: number = view.commands.increment(1);
void result;

const alternate = create_adapter<State, Commands>({
  initial_state: { score: 0 },
  commands: { increment: (amount) => amount + 1 },
  create: () => {
    throw new Error("consumer fixture does not mount a browser game");
  },
});
void alternate;

declare const ready: GameReadyContext<{}, { score: { points: number } }>;
// @ts-expect-error The default event map rejects undeclared event names.
ready.events.emit("unknown", undefined);
