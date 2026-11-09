import { describe, expect, it, vi } from "vitest";
import { create_signal } from "./signal.js";

describe("create_signal", () => {
  it("notifies subscribers until they unsubscribe", () => {
    const signal = create_signal<number>();
    const listener = vi.fn();
    const unsubscribe = signal.subscribe(listener);

    signal.emit(1);
    unsubscribe();
    signal.emit(2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);
  });

  it("supports one-time listeners and clearing", () => {
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

  it("uses a stable listener snapshot when subscriptions mutate", () => {
    const signal = create_signal<number>();
    const events: string[] = [];
    let unsubscribe_second = (): void => undefined;
    signal.subscribe(() => {
      events.push("first");
      unsubscribe_second();
      signal.subscribe(() => events.push("late"));
    });
    unsubscribe_second = signal.subscribe(() => events.push("second"));

    signal.emit(1);
    signal.emit(2);

    expect(events).toEqual(["first", "first", "late"]);
  });

  it("removes a once listener before invoking it", () => {
    const signal = create_signal();
    const listener = vi.fn(() => {
      signal.emit();
    });
    signal.once(listener);

    signal.emit();

    expect(listener).toHaveBeenCalledOnce();
  });
});
