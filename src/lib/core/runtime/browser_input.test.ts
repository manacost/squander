// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { create_browser_input_adapter } from "./browser_input.js";
import { create_input_router, type InputEvent } from "./input.js";

const pointer = (type: string, values: Record<string, unknown> = {}): PointerEvent => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    button: { value: values.button ?? 0 },
    buttons: { value: values.buttons ?? 1 },
    clientX: { value: values.clientX ?? 15 },
    clientY: { value: values.clientY ?? 25 },
    movementX: { value: values.movementX ?? 2 },
    movementY: { value: values.movementY ?? 3 },
    pointerId: { value: values.pointerId ?? 7 },
    pointerType: { value: values.pointerType ?? "mouse" },
  });
  return event as PointerEvent;
};

describe("create_browser_input_adapter", () => {
  it("normalizes host keyboard events and prevents only requested defaults", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const received: InputEvent[] = [];
    const router = create_input_router();
    router.on_global((event) => {
      received.push(event);
      return "consume_and_prevent_default";
    });
    const adapter = create_browser_input_adapter({ host, router });

    const event = new KeyboardEvent("keydown", { key: " ", code: "Space", cancelable: true, bubbles: true });
    host.dispatchEvent(event);
    host.dispatchEvent(new KeyboardEvent("keyup", { key: " ", code: "Space", cancelable: true, bubbles: true }));

    expect(received).toEqual([
      expect.objectContaining({ type: "key", phase: "down", key: " ", code: "Space", repeat: false }),
      expect.objectContaining({ type: "key", phase: "up", key: " ", code: "Space" }),
    ]);
    expect(event.defaultPrevented).toBe(true);
    adapter.dispose();
  });

  it("leaves editable controls alone unless explicitly configured to capture them", () => {
    const host = document.createElement("div");
    const input = document.createElement("input");
    host.append(input);
    document.body.append(host);
    const handler = vi.fn(() => "consume_and_prevent_default" as const);
    const router = create_input_router();
    router.on_global(handler);
    const adapter = create_browser_input_adapter({ host, router });
    const event = new KeyboardEvent("keydown", { key: "A", code: "KeyA", cancelable: true, bubbles: true });
    input.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    adapter.dispose();
  });

  it("can explicitly capture editable controls and recognizes contenteditable descendants", () => {
    const host = document.createElement("div");
    const editable = document.createElement("div");
    editable.contentEditable = "true";
    const input = document.createElement("input");
    host.append(editable, input);
    document.body.append(host);
    const handler = vi.fn(() => "consume_and_prevent_default" as const);
    const router = create_input_router();
    router.on_global(handler);
    const adapter = create_browser_input_adapter({ host, router, capture_editable: true });
    const event = new KeyboardEvent("keydown", { key: "A", code: "KeyA", cancelable: true, bubbles: true });
    input.dispatchEvent(event);

    expect(handler).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
    adapter.dispose();
  });

  it("routes game-owned buttons and preserves native defaults for consume", () => {
    const host = document.createElement("div");
    const button = document.createElement("button");
    host.append(button);
    document.body.append(host);
    const router = create_input_router();
    router.on_global(() => "consume");
    const adapter = create_browser_input_adapter({ host, router });
    const event = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", cancelable: true, bubbles: true });
    button.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    adapter.dispose();
  });

  it("normalizes pointer coordinates, captures consumed drags, and releases capture", () => {
    const host = document.createElement("div");
    document.body.append(host);
    vi.spyOn(host, "getBoundingClientRect").mockReturnValue({ left: 5, top: 10 } as DOMRect);
    const set_capture = vi.fn();
    const has_capture = vi.fn(() => true);
    const release_capture = vi.fn();
    Object.defineProperties(host, {
      setPointerCapture: { value: set_capture },
      hasPointerCapture: { value: has_capture },
      releasePointerCapture: { value: release_capture },
    });
    const received: InputEvent[] = [];
    const router = create_input_router();
    router.on_global((event) => {
      received.push(event);
      return event.type === "pointer" && event.phase === "down" ? "consume" : "pass";
    });
    const adapter = create_browser_input_adapter({ host, router });
    host.dispatchEvent(pointer("pointerdown"));
    host.dispatchEvent(pointer("pointermove", { clientX: 20, clientY: 30, pointerType: "pen" }));
    host.dispatchEvent(pointer("pointerup"));

    expect(received[0]).toEqual(expect.objectContaining({ type: "pointer", phase: "down", x: 10, y: 15 }));
    expect(received[1]).toEqual(expect.objectContaining({ type: "pointer", phase: "move", x: 15, y: 20 }));
    expect(set_capture).toHaveBeenCalledWith(7);
    expect(release_capture).toHaveBeenCalledWith(7);
    adapter.dispose();
  });

  it("normalizes wheel input and can focus on pointer down when opted in", () => {
    const host = document.createElement("div");
    document.body.append(host);
    vi.spyOn(host, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0 } as DOMRect);
    const focus = vi.spyOn(host, "focus");
    const received: InputEvent[] = [];
    const router = create_input_router();
    router.on_global((event) => {
      received.push(event);
      return "consume_and_prevent_default";
    });
    const adapter = create_browser_input_adapter({ host, router, focus_on_pointer_down: true });
    const wheel = new Event("wheel", { cancelable: true });
    Object.defineProperties(wheel, {
      clientX: { value: 4 },
      clientY: { value: 6 },
      deltaX: { value: 8 },
      deltaY: { value: 9 },
      buttons: { value: 0 },
    });
    host.dispatchEvent(pointer("pointerdown", { pointerType: "touch" }));
    host.dispatchEvent(wheel);

    expect(focus).toHaveBeenCalledOnce();
    expect(received.at(-1)).toEqual(expect.objectContaining({ phase: "wheel", pointer_type: "mouse", wheel_x: 8, wheel_y: 9 }));
    expect(wheel.defaultPrevented).toBe(true);
    adapter.dispose();
  });

  it("detaches listeners and can focus the host explicitly", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const handler = vi.fn(() => "consume" as const);
    const router = create_input_router();
    router.on_global(handler);
    const adapter = create_browser_input_adapter({ host, router });
    adapter.dispose();
    adapter.dispose();
    host.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape" }));
    adapter.focus();

    expect(handler).not.toHaveBeenCalled();
  });
});
