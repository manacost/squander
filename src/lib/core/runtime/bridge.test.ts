import { describe, expect, it, vi } from "vitest";
import { create_game_bridge } from "./bridge.js";

describe("[svelte-bridge] core bridge", () => {
  it("publishes readonly snapshots and immediately subscribes consumers", () => {
    const controller = create_game_bridge({ health: 10, inventory: ["potion"] }, {});
    const states: number[] = [];
    const stop = controller.bridge.state.subscribe((state) => {
      states.push(state.health);
    });

    controller.publish({ health: 8, inventory: ["potion", "key"] });
    expect(states).toEqual([10, 8]);
    expect(controller.bridge.state.get()).toEqual({ health: 8, inventory: ["potion", "key"] });
    expect(Object.isFrozen(controller.bridge.state.get())).toBe(true);
    expect(Object.isFrozen(controller.bridge.state.get().inventory)).toBe(true);
    stop();
    controller.publish({ health: 5, inventory: [] });
    expect(states).toEqual([10, 8]);
  });

  it("preserves sync and async command results", async () => {
    const use_item = vi.fn((item_id: string) => item_id.length);
    const save = vi.fn(async (slot: number) => `saved:${slot}`);
    const controller = create_game_bridge({ ready: true }, { use_item, save });

    expect(controller.bridge.commands.use_item("potion")).toBe(6);
    await expect(controller.bridge.commands.save(2)).resolves.toBe("saved:2");
    expect(use_item).toHaveBeenCalledWith("potion");
    expect(save).toHaveBeenCalledWith(2);
  });

  it("cleans subscriptions and rejects commands after disposal", () => {
    const controller = create_game_bridge({ ready: true }, { reset: () => undefined });
    const subscriber = vi.fn();
    controller.bridge.state.subscribe(subscriber);
    controller.dispose();
    controller.dispose();
    controller.publish({ ready: false });
    expect(subscriber).toHaveBeenCalledOnce();
    expect(() => controller.bridge.commands.reset()).toThrow("game bridge is disposed");
    expect(controller.bridge.state.subscribe(vi.fn())).toBeTypeOf("function");
  });
});
