import type { InputRouter } from "./input.js";

export type GamepadButtonSnapshot = Readonly<{
  pressed: boolean;
  touched: boolean;
  value: number;
}>;

export type GamepadSnapshot = Readonly<{
  index: number;
  id: string;
  connected: boolean;
  timestamp: number;
  buttons: readonly GamepadButtonSnapshot[];
  axes: readonly number[];
}>;

export type GamepadState = Readonly<{
  get: (index: number) => GamepadSnapshot | undefined;
  all: () => readonly GamepadSnapshot[];
}>;

export type BrowserGamepadAdapterOptions = Readonly<{
  router: InputRouter;
  window?: Window;
}>;

export type BrowserGamepadAdapter = Readonly<{
  state: GamepadState;
  poll: () => void;
  dispose: () => void;
}>;

type GamepadSource = Pick<Gamepad, "id" | "index" | "connected" | "timestamp" | "buttons" | "axes">;

const snapshot_gamepad = (gamepad: GamepadSource): GamepadSnapshot =>
  Object.freeze({
    index: gamepad.index,
    id: gamepad.id,
    connected: gamepad.connected,
    timestamp: gamepad.timestamp,
    buttons: Object.freeze(
      gamepad.buttons.map((button) => Object.freeze({ pressed: button.pressed, touched: button.touched, value: button.value })),
    ),
    axes: Object.freeze([...gamepad.axes]),
  });

const button_changed = (before: GamepadButtonSnapshot, after: GamepadButtonSnapshot): boolean =>
  before.pressed !== after.pressed || before.touched !== after.touched || before.value !== after.value;

export const create_browser_gamepad_adapter = (options: BrowserGamepadAdapterOptions): BrowserGamepadAdapter => {
  const browser_window = options.window ?? (typeof window === "undefined" ? undefined : window);
  if (browser_window === undefined || typeof browser_window.navigator.getGamepads !== "function") {
    throw new Error("browser gamepad input requires navigator.getGamepads");
  }
  const previous = new Map<number, GamepadSnapshot>();
  let snapshots: readonly GamepadSnapshot[] = [];
  let disposed = false;

  const state: GamepadState = Object.freeze({
    get: (index) => snapshots.find((gamepad) => gamepad.index === index),
    all: () => snapshots,
  });

  const emit_connected = (gamepad: GamepadSnapshot): void => {
    options.router.dispatch({ type: "gamepad", phase: "connected", gamepad_id: gamepad.index, index: gamepad.index, label: gamepad.id });
  };

  const emit_disconnected = (gamepad: GamepadSnapshot): void => {
    options.router.dispatch({ type: "gamepad", phase: "disconnected", gamepad_id: gamepad.index, index: gamepad.index, label: gamepad.id });
  };

  const emit_changes = (before: GamepadSnapshot, after: GamepadSnapshot): void => {
    const button_count = Math.max(before.buttons.length, after.buttons.length);
    for (let index = 0; index < button_count; index += 1) {
      const old_button = before.buttons[index] ?? { pressed: false, touched: false, value: 0 };
      const new_button = after.buttons[index] ?? { pressed: false, touched: false, value: 0 };
      if (!button_changed(old_button, new_button)) continue;
      options.router.dispatch({
        type: "gamepad",
        phase: "button",
        gamepad_id: after.index,
        index: after.index,
        button: index,
        value: new_button.value,
        pressed: new_button.pressed,
        label: after.id,
      });
    }
    const axis_count = Math.max(before.axes.length, after.axes.length);
    for (let axis = 0; axis < axis_count; axis += 1) {
      const old_value = before.axes[axis] ?? 0;
      const new_value = after.axes[axis] ?? 0;
      if (old_value === new_value) continue;
      options.router.dispatch({
        type: "gamepad",
        phase: "axis",
        gamepad_id: after.index,
        index: after.index,
        axis,
        value: new_value,
        label: after.id,
      });
    }
  };

  const poll = (): void => {
    if (disposed) return;
    const current = browser_window.navigator.getGamepads().filter((gamepad): gamepad is Gamepad => gamepad?.connected === true);
    const next = current.map(snapshot_gamepad).sort((left, right) => left.index - right.index);
    const next_by_index = new Map(next.map((gamepad) => [gamepad.index, gamepad]));
    for (const [index, before] of previous) {
      if (!next_by_index.has(index)) emit_disconnected(before);
    }
    for (const after of next) {
      const before = previous.get(after.index);
      if (before === undefined) emit_connected(after);
      else emit_changes(before, after);
    }
    previous.clear();
    for (const gamepad of next) previous.set(gamepad.index, gamepad);
    snapshots = Object.freeze(next);
  };

  const on_connection_change = (): void => {
    poll();
  };
  browser_window.addEventListener("gamepadconnected", on_connection_change);
  browser_window.addEventListener("gamepaddisconnected", on_connection_change);

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    browser_window.removeEventListener("gamepadconnected", on_connection_change);
    browser_window.removeEventListener("gamepaddisconnected", on_connection_change);
    previous.clear();
    snapshots = [];
  };

  return Object.freeze({ state, poll, dispose });
};
