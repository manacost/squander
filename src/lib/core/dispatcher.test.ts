import { describe, expect, it, vi } from "vitest";
import { create_event_dispatcher } from "./dispatcher.js";

type Events = {
  score: { points: number };
  reset: undefined;
};

describe("create_event_dispatcher", () => {
  it("emits a typed CustomEvent and returns an unsubscriber", () => {
    const dispatcher = create_event_dispatcher<Events>();
    const listener = vi.fn<(event: CustomEvent<{ points: number }>) => void>();
    const unsubscribe = dispatcher.on("score", listener);

    dispatcher.emit("score", { points: 10 });
    unsubscribe();
    dispatcher.emit("score", { points: 20 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toBeInstanceOf(CustomEvent);
    expect(listener.mock.calls[0][0].detail).toEqual({ points: 10 });
  });

  it("supports once, event-specific removal, and clearing", () => {
    const dispatcher = create_event_dispatcher<Events>();
    const once = vi.fn();
    const score = vi.fn();
    const reset = vi.fn();
    dispatcher.once("score", once);
    dispatcher.on("score", score);
    dispatcher.on("reset", reset);

    dispatcher.emit("score", { points: 1 });
    dispatcher.emit("score", { points: 2 });
    dispatcher.off("score");
    dispatcher.emit("score", { points: 3 });
    dispatcher.clear();
    dispatcher.emit("reset");

    expect(once).toHaveBeenCalledTimes(1);
    expect(score).toHaveBeenCalledTimes(2);
    expect(reset).not.toHaveBeenCalled();
  });
});
