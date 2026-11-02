import { describe, expect, it, vi } from "vitest";
import { create_signal } from "./signal.js";

describe("create_signal", () => {
  it("notifies subscribers until they unsubscribe", () => {
    const signal = create_signal<number>();
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribe = signal.subscribe(first);
    signal.subscribe(second);

    signal.emit(1);
    unsubscribe();
    signal.emit(2);

    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith(1);
    expect(second.mock.calls).toEqual([[1], [2]]);
  });

  it("supports one-time listeners and clearing all listeners", () => {
    const signal = create_signal<string>();
    const once = vi.fn();
    const persistent = vi.fn();
    signal.once(once);
    signal.subscribe(persistent);

    signal.emit("first");
    signal.emit("second");
    signal.clear();
    signal.emit("third");

    expect(once.mock.calls).toEqual([["first"]]);
    expect(persistent.mock.calls).toEqual([["first"], ["second"]]);
  });

  it("dispatches from a stable snapshot when listeners mutate subscriptions", () => {
    const signal = create_signal<number>();
    const events: string[] = [];
    const second_subscription: { unsubscribe: () => void } = { unsubscribe: () => undefined };
    signal.subscribe(() => {
      events.push("first");
      second_subscription.unsubscribe();
      signal.subscribe(() => events.push("late"));
    });
    second_subscription.unsubscribe = signal.subscribe(() => events.push("second"));

    signal.emit(1);
    signal.emit(2);

    expect(events).toEqual(["first", "second", "first", "late"]);
  });
});
