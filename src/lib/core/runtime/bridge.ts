export type BridgeCommands = Readonly<Record<string, (...args: never[]) => unknown>>;

export type StateSubscriber<State> = (state: Readonly<State>) => void;

export type GameBridge<State, Commands extends BridgeCommands> = Readonly<{
  state: Readonly<{
    get: () => Readonly<State>;
    subscribe: (subscriber: StateSubscriber<State>) => () => void;
  }>;
  commands: {
    [Key in keyof Commands]: (...args: Parameters<Commands[Key]>) => ReturnType<Commands[Key]>;
  };
}>;

export type GameBridgeController<State, Commands extends BridgeCommands> = Readonly<{
  bridge: GameBridge<State, Commands>;
  publish: (state: State) => void;
  dispose: () => void;
}>;

function readonly_snapshot<Value>(value: Value): Value;
function readonly_snapshot(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  if (value instanceof Array) {
    const snapshot: unknown[] = value.map((entry: unknown) => readonly_snapshot(entry));
    return Object.freeze(snapshot);
  }
  const copy: Record<string, unknown> = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, readonly_snapshot(entry)]));
  return Object.freeze(copy);
}

function create_command_map<Commands extends BridgeCommands>(
  entries: [string, (...args: never[]) => unknown][],
  _template: Commands,
): GameBridge<unknown, Commands>["commands"];
function create_command_map(entries: [string, (...args: never[]) => unknown][], _template: BridgeCommands): unknown {
  return Object.freeze(Object.fromEntries(entries));
}

export const create_game_bridge = <State, Commands extends BridgeCommands>(
  initial_state: State,
  commands: Commands,
): GameBridgeController<State, Commands> => {
  let current_state: Readonly<State> = readonly_snapshot(initial_state);
  let disposed = false;
  const subscribers = new Set<StateSubscriber<State>>();

  const publish = (state: State): void => {
    if (disposed) return;
    current_state = readonly_snapshot(state);
    for (const subscriber of subscribers) subscriber(current_state);
  };

  const subscribe = (subscriber: StateSubscriber<State>): (() => void) => {
    if (disposed) return () => undefined;
    subscribers.add(subscriber);
    subscriber(current_state);
    return () => {
      subscribers.delete(subscriber);
    };
  };

  const command_entries: [string, (...args: never[]) => unknown][] = Object.entries(commands).map(([key, command]) => [
    key,
    (...args: never[]) => {
      if (disposed) throw new Error("game bridge is disposed");
      return command(...args);
    },
  ]);
  const bridge = Object.freeze({
    state: Object.freeze({ get: () => current_state, subscribe }),
    commands: create_command_map(command_entries, commands),
  });

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    subscribers.clear();
  };

  return Object.freeze({ bridge, publish, dispose });
};
