import type { InputEvent, InputRouter } from "./input.js";

export type ActionBinding =
  | Readonly<{ device: "keyboard"; code: string }>
  | Readonly<{ device: "pointer"; button: number }>
  | Readonly<{ device: "gamepad_button"; button: number; gamepad_id?: number }>
  | Readonly<{
      device: "gamepad_axis";
      axis: number;
      gamepad_id?: number;
      direction?: "positive" | "negative";
      dead_zone?: number;
      invert?: boolean;
      scale?: number;
    }>;

export type ActionBindingMap = Readonly<Record<string, readonly ActionBinding[]>>;

export type ActionState = Readonly<{
  value: number;
  pressed: boolean;
  just_pressed: boolean;
  just_released: boolean;
}>;

export type ActionMap<Actions extends string> = Readonly<{
  handle: (event: InputEvent) => void;
  update: () => void;
  get: (action: Actions) => ActionState;
  all: () => ReadonlyMap<Actions, ActionState>;
  rebind: (action: Actions, bindings: readonly ActionBinding[]) => void;
  dispose: () => void;
}>;

export type CreateActionMapOptions<Bindings extends ActionBindingMap> = Readonly<{
  bindings: Bindings;
  router?: InputRouter;
}>;

const empty_state = (): ActionState => Object.freeze({ value: 0, pressed: false, just_pressed: false, just_released: false });

const assert_binding = (binding: ActionBinding): void => {
  if (binding.device === "keyboard") {
    if (binding.code.length === 0) throw new RangeError("keyboard binding code must not be empty");
    return;
  }
  if (binding.device === "pointer") {
    if (!Number.isInteger(binding.button) || binding.button < 0)
      throw new RangeError("pointer binding button must be a nonnegative integer");
    return;
  }
  if (binding.device === "gamepad_button") {
    if (!Number.isInteger(binding.button) || binding.button < 0) throw new RangeError("gamepad button must be a nonnegative integer");
    return;
  }
  if (!Number.isInteger(binding.axis) || binding.axis < 0) throw new RangeError("gamepad axis must be a nonnegative integer");
  const dead_zone = binding.dead_zone ?? 0;
  const scale = binding.scale ?? 1;
  if (!Number.isFinite(dead_zone) || dead_zone < 0 || dead_zone >= 1) throw new RangeError("gamepad axis dead_zone must be in [0, 1)");
  if (!Number.isFinite(scale)) throw new RangeError("gamepad axis scale must be finite");
};

const validate_bindings = (bindings: readonly ActionBinding[]): readonly ActionBinding[] => {
  bindings.forEach(assert_binding);
  return Object.freeze([...bindings]);
};

const button_key = (gamepad_id: number, button: number): string => `${String(gamepad_id)}:${String(button)}`;
const axis_key = (gamepad_id: number, axis: number): string => `${String(gamepad_id)}:${String(axis)}`;

const strongest_matching_value = (values: ReadonlyMap<string, number>, suffix: string): number => {
  let strongest = 0;
  for (const [key, value] of values) {
    if (key.endsWith(suffix) && Math.abs(value) > Math.abs(strongest)) strongest = value;
  }
  return strongest;
};

const binding_value = (
  binding: ActionBinding,
  keyboard: ReadonlySet<string>,
  pointers: ReadonlySet<number>,
  gamepad_buttons: ReadonlyMap<string, number>,
  gamepad_axes: ReadonlyMap<string, number>,
): number => {
  if (binding.device === "keyboard") return keyboard.has(binding.code) ? 1 : 0;
  if (binding.device === "pointer") return pointers.has(binding.button) ? 1 : 0;
  if (binding.device === "gamepad_button") {
    return binding.gamepad_id === undefined
      ? strongest_matching_value(gamepad_buttons, `:${String(binding.button)}`)
      : (gamepad_buttons.get(button_key(binding.gamepad_id, binding.button)) ?? 0);
  }
  const raw =
    binding.gamepad_id === undefined
      ? strongest_matching_value(gamepad_axes, `:${String(binding.axis)}`)
      : (gamepad_axes.get(axis_key(binding.gamepad_id, binding.axis)) ?? 0);
  const dead_zone = binding.dead_zone ?? 0;
  const magnitude = Math.abs(raw);
  if (magnitude <= dead_zone) return 0;
  const normalized = ((magnitude - dead_zone) / (1 - dead_zone)) * (raw < 0 ? -1 : 1);
  if (binding.direction === "positive" && normalized < 0) return 0;
  if (binding.direction === "negative" && normalized > 0) return 0;
  return normalized * (binding.invert === true ? -1 : 1) * (binding.scale ?? 1);
};

export const create_action_map = <const Bindings extends ActionBindingMap>(
  options: CreateActionMapOptions<Bindings>,
): ActionMap<keyof Bindings & string> => {
  const actions = new Map<keyof Bindings & string, readonly ActionBinding[]>();
  for (const [name, bindings] of Object.entries(options.bindings)) {
    actions.set(name, validate_bindings(bindings));
  }
  const states = new Map<keyof Bindings & string, ActionState>();
  for (const name of actions.keys()) states.set(name, empty_state());
  const keyboard = new Set<string>();
  const pointers = new Set<number>();
  const gamepad_buttons = new Map<string, number>();
  const gamepad_axes = new Map<string, number>();
  let disposed = false;

  const handle = (event: InputEvent): void => {
    if (disposed) return;
    if (event.type === "key") {
      if (event.phase === "down") keyboard.add(event.code);
      if (event.phase === "up") keyboard.delete(event.code);
      return;
    }
    if (event.type === "pointer") {
      if (event.phase === "down") pointers.add(event.button);
      if (event.phase === "up" || event.phase === "cancel") pointers.delete(event.button);
      return;
    }
    if (event.phase === "button") {
      gamepad_buttons.set(button_key(event.gamepad_id, event.button), event.value);
      return;
    }
    if (event.phase === "axis") gamepad_axes.set(axis_key(event.gamepad_id, event.axis), event.value);
  };

  const update = (): void => {
    if (disposed) return;
    for (const [name, bindings] of actions) {
      let value = 0;
      for (const binding of bindings) {
        const contribution = binding_value(binding, keyboard, pointers, gamepad_buttons, gamepad_axes);
        if (Math.abs(contribution) > Math.abs(value)) value = contribution;
      }
      const previous = states.get(name) ?? empty_state();
      const pressed = Math.abs(value) > 0;
      states.set(
        name,
        Object.freeze({ value, pressed, just_pressed: pressed && !previous.pressed, just_released: !pressed && previous.pressed }),
      );
    }
  };

  const get = (action: keyof Bindings & string): ActionState => states.get(action) ?? empty_state();
  const all = (): ReadonlyMap<keyof Bindings & string, ActionState> => new Map(states);
  const rebind = (action: keyof Bindings & string, bindings: readonly ActionBinding[]): void => {
    const next_bindings = validate_bindings(bindings);
    if (!actions.has(action)) throw new RangeError(`unknown action "${action}"`);
    actions.set(action, next_bindings);
  };
  const unsubscribe = options.router?.on_global((event) => {
    handle(event);
    return "pass";
  });
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    unsubscribe?.();
    keyboard.clear();
    pointers.clear();
    gamepad_buttons.clear();
    gamepad_axes.clear();
    states.clear();
  };

  return Object.freeze({ handle, update, get, all, rebind, dispose });
};
