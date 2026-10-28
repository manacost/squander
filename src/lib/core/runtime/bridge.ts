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

const readonly_snapshot = <Value>(value: Value): Value => {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => readonly_snapshot(entry))) as Value;
  }
  const copy = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, readonly_snapshot(entry)]));
  return Object.freeze(copy) as Value;
};

export const create_game_bridge = <State, Commands extends BridgeCommands>(
  initial_state: State,
  commands: Commands,
): GameBridgeController<State, Commands> => {
  let current_state = readonly_snapshot(initial_state) as Readonly<State>;
  let disposed = false;
  const subscribers = new Set<StateSubscriber<State>>();

  const publish = (state: State): void => {
    if (disposed) return;
    current_state = readonly_snapshot(state) as Readonly<State>;
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

  const command_entries = Object.entries(commands).map(([key, command]) => [
    key,
    (...args: never[]) => {
      if (disposed) throw new Error("game bridge is disposed");
      return command(...args);
    },
  ]);
  const bridge = Object.freeze({
    state: Object.freeze({ get: () => current_state, subscribe }),
    commands: Object.freeze(Object.fromEntries(command_entries)) as GameBridge<State, Commands>["commands"],
  });

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    subscribers.clear();
  };

  return Object.freeze({ bridge, publish, dispose });
};
