export type InputModifiers = Readonly<{
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}>;

export type KeyboardInputEvent = Readonly<{
  type: "key";
  phase: "down" | "up";
  key: string;
  code: string;
  repeat: boolean;
  modifiers: InputModifiers;
}>;

export type PointerInputEvent = Readonly<{
  type: "pointer";
  phase: "down" | "up" | "move" | "cancel" | "wheel";
  pointer_id: number;
  pointer_type: "mouse" | "pen" | "touch";
  x: number;
  y: number;
  button: number;
  buttons: number;
  movement_x: number;
  movement_y: number;
  wheel_x: number;
  wheel_y: number;
  modifiers: InputModifiers;
}>;

export type GamepadInputEvent =
  | Readonly<{
      type: "gamepad";
      phase: "connected" | "disconnected";
      gamepad_id: number;
      index: number;
      label: string;
    }>
  | Readonly<{
      type: "gamepad";
      phase: "button";
      gamepad_id: number;
      index: number;
      button: number;
      value: number;
      pressed: boolean;
      label: string;
    }>
  | Readonly<{
      type: "gamepad";
      phase: "axis";
      gamepad_id: number;
      index: number;
      axis: number;
      value: number;
      label: string;
    }>;

export type InputEvent = KeyboardInputEvent | PointerInputEvent | GamepadInputEvent;

export type InputDisposition = "pass" | "consume" | "consume_and_prevent_default";

export type InputHandler = (event: InputEvent) => InputDisposition;

export type InputSceneHandle = Readonly<object>;

export type InputRouter = Readonly<{
  push_scene: (handler: InputHandler) => InputSceneHandle;
  remove_scene: (scene: InputSceneHandle) => void;
  on_global: (handler: InputHandler, options?: Readonly<{ capture?: boolean }>) => () => void;
  dispatch: (event: InputEvent) => InputDisposition;
  dispose: () => void;
}>;

export type InputRouterOptions = Readonly<{
  on_error?: (cause: unknown) => void;
}>;

type SceneRecord = Readonly<{
  handle: InputSceneHandle;
  handler: InputHandler;
}>;

type GlobalRecord = Readonly<{
  handler: InputHandler;
  capture: boolean;
}>;

const is_consuming = (disposition: InputDisposition): boolean => disposition !== "pass";

export const create_input_router = (options: InputRouterOptions = {}): InputRouter => {
  const scenes: SceneRecord[] = [];
  const globals: GlobalRecord[] = [];
  let disposed = false;

  const invoke = (handler: InputHandler, event: InputEvent): InputDisposition => {
    try {
      return handler(event);
    } catch (cause) {
      options.on_error?.(cause);
      return "pass";
    }
  };

  const push_scene = (handler: InputHandler): InputSceneHandle => {
    if (disposed) return Object.freeze({});
    const record: SceneRecord = { handle: Object.freeze({}), handler };
    scenes.push(record);
    return record.handle;
  };

  const remove_scene = (scene: InputSceneHandle): void => {
    const index = scenes.findIndex((record) => record.handle === scene);
    if (index >= 0) scenes.splice(index, 1);
  };

  const on_global = (handler: InputHandler, global_options: Readonly<{ capture?: boolean }> = {}): (() => void) => {
    if (disposed) return () => undefined;
    const record: GlobalRecord = { handler, capture: global_options.capture === true };
    globals.push(record);
    return () => {
      const index = globals.indexOf(record);
      if (index >= 0) globals.splice(index, 1);
    };
  };

  const dispatch = (event: InputEvent): InputDisposition => {
    if (disposed) return "pass";
    const capture_globals = globals.filter((record) => record.capture);
    for (const record of capture_globals) {
      const disposition = invoke(record.handler, event);
      if (is_consuming(disposition)) return disposition;
    }
    for (const record of [...scenes].reverse()) {
      const disposition = invoke(record.handler, event);
      if (is_consuming(disposition)) return disposition;
    }
    for (const record of globals.filter((candidate) => !candidate.capture)) {
      const disposition = invoke(record.handler, event);
      if (is_consuming(disposition)) return disposition;
    }
    return "pass";
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    scenes.length = 0;
    globals.length = 0;
  };

  return Object.freeze({ push_scene, remove_scene, on_global, dispatch, dispose });
};
