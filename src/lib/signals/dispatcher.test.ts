import { describe, expect, it, vi } from "vitest";
import { create_event_dispatcher } from "./dispatcher.js";

type Events = {
  score: { points: number };
  reset: undefined;
};

describe("create_event_dispatcher", () => {
  it("dispatches typed payloads and returns an unsubscriber", () => {
    const dispatcher = create_event_dispatcher<Events>();
    const listener = vi.fn();
    const unsubscribe = dispatcher.on("score", listener);

    dispatcher.emit("score", { points: 10 });
    unsubscribe();
    dispatcher.emit("score", { points: 20 });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ points: 10 });
  });

  it("supports once, event-specific removal, and clearing", () => {
    const dispatcher = create_event_dispatcher<Events>();
    const once = vi.fn();
    const score = vi.fn();
    const reset = vi.fn();
    dispatcher.off("reset", vi.fn());
    dispatcher.once("score", once);
    dispatcher.on("score", score);
    dispatcher.on("reset", reset);

    dispatcher.emit("score", { points: 1 });
    dispatcher.emit("score", { points: 2 });
    dispatcher.off("score");
    dispatcher.emit("score", { points: 3 });
    dispatcher.clear();
    dispatcher.emit("reset");

    expect(once).toHaveBeenCalledOnce();
    expect(score).toHaveBeenCalledTimes(2);
    expect(reset).not.toHaveBeenCalled();
  });

  it("uses a stable listener snapshot when subscriptions mutate", () => {
    const dispatcher = create_event_dispatcher<Events>();
    const events: string[] = [];
    let unsubscribe_second = (): void => undefined;
    dispatcher.on("score", () => {
      events.push("first");
      unsubscribe_second();
      dispatcher.on("score", () => events.push("late"));
    });
    unsubscribe_second = dispatcher.on("score", () => events.push("second"));

    dispatcher.emit("score", { points: 1 });
    dispatcher.emit("score", { points: 2 });

    expect(events).toEqual(["first", "first", "late"]);
  });

  it("allows payload-free events", () => {
    const dispatcher = create_event_dispatcher<Events>();
    const reset = vi.fn();
    dispatcher.on("reset", reset);

    dispatcher.emit("reset");

    expect(reset).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledWith(undefined);
  });
});
