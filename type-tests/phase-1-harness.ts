// This fixture verifies the Phase 1 type-test harness only. Replacement API
// contracts will move here as the Phase 2 public types are implemented.

type CommandMap = {
  increment: (amount: number) => void;
  persist: () => Promise<boolean>;
};

type ReadonlyState = Readonly<{
  score: number;
  label: string;
}>;

type Bridge<State, Commands extends Record<string, (...args: never[]) => unknown>> = {
  readonly state: State;
  command<Name extends keyof Commands>(name: Name, ...args: Parameters<Commands[Name]>): ReturnType<Commands[Name]>;
};

declare const bridge: Bridge<ReadonlyState, CommandMap>;

const score: number = bridge.state.score;
const label: string = bridge.state.label;
const save_result: Promise<boolean> = bridge.command("persist");
bridge.command("increment", 1);

void score;
void label;
void save_result;

// @ts-expect-error -- command names must come from the declared command map.
bridge.command("missing");
// @ts-expect-error -- command parameters remain inferred and type checked.
bridge.command("increment", "one");
