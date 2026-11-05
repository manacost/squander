import { create_game_adapter, type GameAdapterView } from "../src/lib/svelte/index.js";
import type { Game } from "../src/lib/core/runtime/game.js";

const game = {} as Game;
const adapter = create_game_adapter({
  initial_state: { score: 0, loading: true },
  commands: {
    add: (amount: number) => amount + 1,
    reset: () => undefined,
  },
  create: ({ canvas, bridge, publish }) => {
    const canvas_element: HTMLCanvasElement = canvas;
    const current_score: number = bridge.state.get().score;
    publish({ score: current_score + 1, loading: false });
    void canvas_element;
    return game;
  },
});

adapter.subscribe((view: GameAdapterView<{ score: number; loading: boolean }, { add: (amount: number) => number; reset: () => void }>) => {
  const score: number = view.state.score;
  const result: number = view.commands.add(2);
  view.commands.reset();
  void score;
  void result;
});

// @ts-expect-error -- command arguments are inferred and checked.
adapter.view.commands.add("two");
// @ts-expect-error -- unknown commands are not exposed.
adapter.view.commands.missing();
