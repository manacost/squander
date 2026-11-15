// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { noop, wait } from "./utils.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("core utilities", () => {
  it("runs noop without throwing", () => {
    expect(noop).not.toThrow();
  });

  it("resolves wait after its browser timer fires", async () => {
    vi.useFakeTimers();
    let resolved = false;
    const completion = wait(25).then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(24);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await completion;
    expect(resolved).toBe(true);
  });
});
