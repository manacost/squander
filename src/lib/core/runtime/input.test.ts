import { describe, expect, it, vi } from "vitest";
import { create_input_router, type InputDisposition, type InputEvent, type InputSceneHandle } from "./input.js";

const key_down = (key: string): InputEvent => ({
  type: "key",
  phase: "down",
  key,
  code: key === " " ? "Space" : `Key${key.toUpperCase()}`,
  repeat: false,
  modifiers: { alt: false, ctrl: false, meta: false, shift: false },
});

describe("[input-routing] create_input_router", () => {
  it("dispatches to the newest scene first and falls back to globals", () => {
    const router = create_input_router();
    const calls: string[] = [];
    router.on_global(() => {
      calls.push("global");
      return "pass";
    });
    router.push_scene(() => {
      calls.push("base");
      return "pass";
    });
    router.push_scene(() => {
      calls.push("overlay");
      return "consume";
    });

    expect(router.dispatch(key_down("Escape"))).toBe("consume");
    expect(calls).toEqual(["overlay"]);
  });

  it("lets passing scenes reach lower scenes and then global fallback handlers", () => {
    const router = create_input_router();
    const calls: string[] = [];
    router.push_scene(() => {
      calls.push("base");
      return "pass";
    });
    router.on_global(() => {
      calls.push("global");
      return "consume_and_prevent_default";
    });

    expect(router.dispatch(key_down(" "))).toBe("consume_and_prevent_default");
    expect(calls).toEqual(["base", "global"]);
  });

  it("supports explicit global capture without making fallback handlers capture", () => {
    const router = create_input_router();
    const calls: string[] = [];
    router.on_global(
      () => {
        calls.push("capture");
        return "consume";
      },
      { capture: true },
    );
    router.push_scene(() => {
      calls.push("scene");
      return "consume";
    });

    expect(router.dispatch(key_down("Escape"))).toBe("consume");
    expect(calls).toEqual(["capture"]);
  });

  it("uses a stable dispatch snapshot when handlers mutate subscriptions", () => {
    const router = create_input_router();
    const calls: string[] = [];
    let second_scene: InputSceneHandle = Object.freeze({});
    router.push_scene(() => {
      calls.push("first");
      router.remove_scene(second_scene);
      return "pass";
    });
    second_scene = router.push_scene(() => {
      calls.push("second");
      return "pass";
    });

    router.dispatch(key_down("A"));
    router.dispatch(key_down("B"));

    expect(calls).toEqual(["second", "first", "first"]);
  });

  it("removes handlers and makes dispatch a no-op after disposal", () => {
    const router = create_input_router();
    const handler = vi.fn<InputHandler>(() => "consume");
    const scene = router.push_scene(handler);
    router.remove_scene(scene);
    expect(router.dispatch(key_down("A"))).toBe("pass");

    router.push_scene(handler);
    router.dispose();
    expect(router.dispatch(key_down("B"))).toBe("pass");
    expect(handler).not.toHaveBeenCalled();
  });

  it("reports handler failures and treats them as passing events", () => {
    const on_error = vi.fn();
    const router = create_input_router({ on_error });
    router.push_scene(() => {
      throw new Error("input failed");
    });

    expect(router.dispatch(key_down("A"))).toBe("pass");
    expect(on_error).toHaveBeenCalledOnce();
  });

  it("makes a global unsubscriber idempotent and safe after disposal", () => {
    const router = create_input_router();
    const unsubscribe = router.on_global(() => "pass");
    unsubscribe();
    unsubscribe();
    router.dispose();
    router.on_global(() => "consume")();

    expect(router.dispatch(key_down("A"))).toBe("pass");
  });

  it("continues through passing capture and fallback handlers", () => {
    const router = create_input_router();
    const missing_scene: InputSceneHandle = Object.freeze({});
    router.remove_scene(missing_scene);
    router.on_global(() => "pass", { capture: true });
    router.push_scene(() => "pass");
    router.on_global(() => "pass");

    expect(router.dispatch(key_down("A"))).toBe("pass");
    router.dispose();
    expect(router.push_scene(() => "consume")).not.toBe(missing_scene);
  });
});

type InputHandler = (event: InputEvent) => InputDisposition;
