// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { create_browser_gamepad_adapter } from "./browser_gamepad.js";
import { create_input_router, type InputEvent } from "./input.js";

type MutableGamepad = {
  id: string;
  index: number;
  connected: boolean;
  timestamp: number;
  buttons: { pressed: boolean; touched: boolean; value: number }[];
  axes: number[];
};

const gamepad = (index: number, id = "Test Pad"): MutableGamepad => ({
  id,
  index,
  connected: true,
  timestamp: 1,
  buttons: [{ pressed: false, touched: false, value: 0 }],
  axes: [0],
});

const create_environment = (pads: (MutableGamepad | null)[]) => {
  const event_target = new EventTarget();
  const environment = Object.assign(event_target, {
    navigator: { getGamepads: () => pads as unknown as readonly Gamepad[] },
  }) as unknown as Window;
  return environment;
};

describe("create_browser_gamepad_adapter", () => {
  it("discovers connected pads and exposes immutable snapshots", () => {
    const pad = gamepad(2);
    const environment = create_environment([null, null, pad]);
    const router = create_input_router();
    const events: InputEvent[] = [];
    router.on_global((event) => {
      events.push(event);
      return "pass";
    });
    const adapter = create_browser_gamepad_adapter({ router, window: environment });

    adapter.poll();

    expect(events).toEqual([{ type: "gamepad", phase: "connected", gamepad_id: 2, index: 2, label: "Test Pad" }]);
    expect(adapter.state.get(2)).toEqual(
      expect.objectContaining({ index: 2, id: "Test Pad", buttons: [{ pressed: false, touched: false, value: 0 }], axes: [0] }),
    );
    expect(Object.isFrozen(adapter.state.get(2))).toBe(true);
    expect(Object.isFrozen(adapter.state.get(2)?.buttons)).toBe(true);
  });

  it("emits only changed button and axis values on later polls", () => {
    const pad = gamepad(0);
    const environment = create_environment([pad]);
    const router = create_input_router();
    const events: InputEvent[] = [];
    router.on_global((event) => {
      events.push(event);
      return "pass";
    });
    const adapter = create_browser_gamepad_adapter({ router, window: environment });
    adapter.poll();
    events.length = 0;

    pad.timestamp = 2;
    pad.buttons[0] = { pressed: true, touched: true, value: 1 };
    pad.axes[0] = 0.5;
    adapter.poll();
    adapter.poll();

    expect(events).toEqual([
      { type: "gamepad", phase: "button", gamepad_id: 0, index: 0, button: 0, value: 1, pressed: true, label: "Test Pad" },
      { type: "gamepad", phase: "axis", gamepad_id: 0, index: 0, axis: 0, value: 0.5, label: "Test Pad" },
    ]);
  });

  it("handles controls appearing and disappearing between snapshots", () => {
    const pad = gamepad(0);
    pad.buttons.push({ pressed: true, touched: true, value: 1 });
    pad.axes.push(0.75);
    const environment = create_environment([pad]);
    const router = create_input_router();
    const events: InputEvent[] = [];
    router.on_global((event) => {
      events.push(event);
      return "pass";
    });
    const adapter = create_browser_gamepad_adapter({ router, window: environment });
    adapter.poll();
    events.length = 0;

    pad.buttons = [];
    pad.axes = [];
    adapter.poll();

    expect(events).toEqual([
      { type: "gamepad", phase: "button", gamepad_id: 0, index: 0, button: 1, value: 0, pressed: false, label: "Test Pad" },
      { type: "gamepad", phase: "axis", gamepad_id: 0, index: 0, axis: 1, value: 0, label: "Test Pad" },
    ]);

    events.length = 0;
    pad.buttons = [
      { pressed: true, touched: true, value: 1 },
      { pressed: true, touched: true, value: 1 },
    ];
    pad.axes = [0.5, 0.75];
    adapter.poll();
    expect(events).toEqual([
      { type: "gamepad", phase: "button", gamepad_id: 0, index: 0, button: 0, value: 1, pressed: true, label: "Test Pad" },
      { type: "gamepad", phase: "button", gamepad_id: 0, index: 0, button: 1, value: 1, pressed: true, label: "Test Pad" },
      { type: "gamepad", phase: "axis", gamepad_id: 0, index: 0, axis: 0, value: 0.5, label: "Test Pad" },
      { type: "gamepad", phase: "axis", gamepad_id: 0, index: 0, axis: 1, value: 0.75, label: "Test Pad" },
    ]);
  });

  it("emits disconnection and responds to browser connection events", () => {
    const pad = gamepad(1);
    const pads: (MutableGamepad | null)[] = [null, pad];
    const environment = create_environment(pads);
    const router = create_input_router();
    const events: InputEvent[] = [];
    router.on_global((event) => {
      events.push(event);
      return "pass";
    });
    const adapter = create_browser_gamepad_adapter({ router, window: environment });
    adapter.poll();
    events.length = 0;

    pads[1] = null;
    environment.dispatchEvent(new Event("gamepaddisconnected"));
    expect(events).toEqual([{ type: "gamepad", phase: "disconnected", gamepad_id: 1, index: 1, label: "Test Pad" }]);
    expect(adapter.state.all()).toEqual([]);
  });

  it("removes connection listeners, clears state, and rejects unavailable APIs", () => {
    const environment = create_environment([]);
    const router = create_input_router();
    const adapter = create_browser_gamepad_adapter({ router, window: environment });
    const listener = vi.fn();
    router.on_global((event) => {
      listener(event);
      return "pass";
    });
    adapter.dispose();
    adapter.dispose();
    environment.dispatchEvent(new Event("gamepadconnected"));
    adapter.poll();

    expect(listener).not.toHaveBeenCalled();
    expect(adapter.state.all()).toEqual([]);
    expect(() =>
      create_browser_gamepad_adapter({
        router,
        window: { navigator: {} } as Window,
      }),
    ).toThrow("navigator.getGamepads");
  });

  it("uses the ambient browser window when no window is supplied", () => {
    const router = create_input_router();
    expect(() => create_browser_gamepad_adapter({ router })).toThrow("navigator.getGamepads");
  });
});
