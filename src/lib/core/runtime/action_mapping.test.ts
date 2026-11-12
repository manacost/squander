import { describe, expect, it } from "vitest";
import { create_action_map } from "./action_mapping.js";
import { create_input_router } from "./input.js";

describe("[action-mapping] action map", () => {
  it("combines keyboard and gamepad bindings with deterministic edge state", () => {
    const router = create_input_router();
    const actions = create_action_map({
      router,
      bindings: {
        confirm: [
          { device: "keyboard", code: "Enter" },
          { device: "gamepad_button", gamepad_id: 2, button: 0 },
        ],
      },
    });

    router.dispatch({
      type: "key",
      phase: "down",
      key: "Enter",
      code: "Enter",
      repeat: false,
      modifiers: { alt: false, ctrl: false, meta: false, shift: false },
    });
    actions.update();
    expect(actions.get("confirm")).toEqual({ value: 1, pressed: true, just_pressed: true, just_released: false });
    actions.update();
    expect(actions.get("confirm").just_pressed).toBe(false);

    router.dispatch({
      type: "key",
      phase: "up",
      key: "Enter",
      code: "Enter",
      repeat: false,
      modifiers: { alt: false, ctrl: false, meta: false, shift: false },
    });
    actions.update();
    expect(actions.get("confirm").just_released).toBe(true);
    router.dispatch({ type: "gamepad", phase: "button", gamepad_id: 2, index: 2, button: 0, value: 1, pressed: true, label: "pad" });
    actions.update();
    expect(actions.get("confirm").just_pressed).toBe(true);
    router.dispatch({ type: "gamepad", phase: "button", gamepad_id: 2, index: 2, button: 0, value: 0, pressed: false, label: "pad" });
    actions.update();
    expect(actions.get("confirm")).toEqual({ value: 0, pressed: false, just_pressed: false, just_released: true });
  });

  it("applies dead zones, inversion, scale, direction, and strongest-value resolution", () => {
    const actions = create_action_map({
      bindings: {
        move: [
          { device: "gamepad_axis", gamepad_id: 1, axis: 0, dead_zone: 0.25, scale: 2 },
          { device: "keyboard", code: "ArrowRight" },
        ],
        aim: [{ device: "gamepad_axis", gamepad_id: 1, axis: 1, direction: "negative", invert: true }],
        any_button: [{ device: "gamepad_button", button: 1 }],
      },
    });
    actions.handle({ type: "gamepad", phase: "axis", gamepad_id: 1, index: 1, axis: 0, value: 0.75, label: "pad" });
    actions.handle({ type: "gamepad", phase: "axis", gamepad_id: 1, index: 1, axis: 1, value: -0.5, label: "pad" });
    actions.handle({ type: "gamepad", phase: "button", gamepad_id: 7, index: 1, button: 1, value: -0.5, pressed: true, label: "pad" });
    actions.update();

    expect(actions.get("move").value).toBeCloseTo(1.3333);
    expect(actions.get("aim").value).toBeCloseTo(0.5);
    expect(actions.get("any_button").value).toBeCloseTo(-0.5);
  });

  it("tracks pointer phases and ignores lifecycle-only gamepad events", () => {
    const actions = create_action_map({ bindings: { click: [{ device: "pointer", button: 0 }] } });
    const pointer = (phase: "down" | "up" | "cancel") => ({
      type: "pointer" as const,
      phase,
      pointer_id: 1,
      pointer_type: "mouse" as const,
      x: 0,
      y: 0,
      button: 0,
      buttons: phase === "down" ? 1 : 0,
      movement_x: 0,
      movement_y: 0,
      wheel_x: 0,
      wheel_y: 0,
      modifiers: { alt: false, ctrl: false, meta: false, shift: false },
    });

    actions.handle({ type: "gamepad", phase: "connected", gamepad_id: 3, index: 0, label: "pad" });
    actions.handle(pointer("down"));
    actions.update();
    expect(actions.get("click")).toEqual({ value: 1, pressed: true, just_pressed: true, just_released: false });
    actions.handle(pointer("cancel"));
    actions.update();
    expect(actions.get("click").just_released).toBe(true);
    actions.handle(pointer("down"));
    actions.handle(pointer("up"));
    actions.update();
    expect(actions.get("click").pressed).toBe(false);
  });

  it("rejects invalid bindings and exposes a snapshot of states", () => {
    const invalid_bindings = [
      { device: "keyboard", code: "" },
      { device: "pointer", button: -1 },
      { device: "gamepad_button", button: -1 },
      { device: "gamepad_axis", axis: -1 },
      { device: "gamepad_axis", axis: 0, dead_zone: -0.1 },
      { device: "gamepad_axis", axis: 0, dead_zone: 1 },
      { device: "gamepad_axis", axis: 0, scale: Number.NaN },
    ] as const;
    for (const binding of invalid_bindings) {
      expect(() => create_action_map({ bindings: { action: [binding] } })).toThrow(RangeError);
    }

    const actions = create_action_map({ bindings: { action: [] } });
    expect(actions.all()).toEqual(new Map([["action", { value: 0, pressed: false, just_pressed: false, just_released: false }]]));
    expect(() => {
      actions.rebind("missing" as "action", []);
    }).toThrow('unknown action "missing"');
  });

  it("rebinds atomically and isolates maps", () => {
    const first = create_action_map({ bindings: { fire: [{ device: "keyboard", code: "Space" }] } });
    const second = create_action_map({ bindings: { fire: [{ device: "keyboard", code: "Space" }] } });
    first.handle({
      type: "key",
      phase: "down",
      key: " ",
      code: "Space",
      repeat: false,
      modifiers: { alt: false, ctrl: false, meta: false, shift: false },
    });
    first.update();
    expect(second.get("fire").pressed).toBe(false);

    expect(() => {
      first.rebind("fire", [{ device: "gamepad_axis", axis: 0, dead_zone: 1 }]);
    }).toThrow(RangeError);
    first.rebind("fire", [{ device: "keyboard", code: "KeyF" }]);
    first.handle({
      type: "key",
      phase: "up",
      key: " ",
      code: "Space",
      repeat: false,
      modifiers: { alt: false, ctrl: false, meta: false, shift: false },
    });
    first.handle({
      type: "key",
      phase: "down",
      key: "f",
      code: "KeyF",
      repeat: false,
      modifiers: { alt: false, ctrl: false, meta: false, shift: false },
    });
    first.update();
    expect(first.get("fire").pressed).toBe(true);
  });

  it("unsubscribes and clears state on disposal", () => {
    const router = create_input_router();
    const actions = create_action_map({ router, bindings: { fire: [{ device: "keyboard", code: "Space" }] } });
    router.dispatch({
      type: "key",
      phase: "down",
      key: " ",
      code: "Space",
      repeat: false,
      modifiers: { alt: false, ctrl: false, meta: false, shift: false },
    });
    actions.update();
    expect(actions.get("fire").pressed).toBe(true);
    actions.dispose();
    actions.dispose();
    router.dispatch({
      type: "key",
      phase: "up",
      key: " ",
      code: "Space",
      repeat: false,
      modifiers: { alt: false, ctrl: false, meta: false, shift: false },
    });
    actions.update();
    expect(actions.all()).toEqual(new Map());
    expect(actions.get("fire")).toEqual({ value: 0, pressed: false, just_pressed: false, just_released: false });
  });
});
