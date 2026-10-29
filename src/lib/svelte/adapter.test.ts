import { describe, expect, it, vi } from "vitest";
import { create_game_adapter } from "./adapter.js";
import type { Game } from "../core/runtime/game.js";

const create_game = (): Game =>
  ({
    ready: Promise.resolve(),
    renderer: {},
    resources: {},
    geometry: {},
    assets: {},
    resize: vi.fn(),
    get_viewport: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    set_visibility: vi.fn(),
    dispose: vi.fn(async () => undefined),
    get_state: vi.fn(() => "running"),
  }) as unknown as Game;

describe("[svelte-bridge] game adapter", () => {
  it("publishes readonly snapshots and keeps commands typed at runtime", async () => {
    const game = create_game();
    let publish!: (state: { score: number }) => void;
    const adapter = create_game_adapter({
      initial_state: { score: 0 },
      commands: { increment: (amount: number) => amount + 1 },
      create: ({ publish: publish_state }) => {
        publish = publish_state;
        return game;
      },
    });
    const snapshots: unknown[] = [];
    const unsubscribe = adapter.subscribe((view) => snapshots.push(view));
    expect(adapter.view.status).toBe("loading");
    await adapter.mount({} as HTMLCanvasElement);
    expect(adapter.view.status).toBe("ready");
    publish({ score: 3 });
    await Promise.resolve();
    expect(adapter.view.state).toEqual({ score: 3 });
    expect(Object.isFrozen(adapter.view.state)).toBe(true);
    expect(adapter.view.commands.increment(4)).toBe(5);
    expect(snapshots).toHaveLength(4);
    unsubscribe();
    await adapter.dispose();
    expect(adapter.view.status).toBe("disposed");
    expect(game.dispose).toHaveBeenCalledOnce();
  });

  it("batches publications through the injected notification scheduler", async () => {
    const scheduled: Array<() => void> = [];
    let publish!: (state: { score: number }) => void;
    const adapter = create_game_adapter({
      initial_state: { score: 0 },
      commands: {},
      notification_scheduler: (notify) => scheduled.push(notify),
      create: ({ publish: publish_state }) => {
        publish = publish_state;
        return create_game();
      },
    });
    const snapshots: number[] = [];
    adapter.subscribe((view) => snapshots.push(view.state.score));
    await adapter.mount({} as HTMLCanvasElement);
    snapshots.length = 0;
    publish({ score: 1 });
    publish({ score: 2 });
    expect(snapshots).toEqual([]);
    expect(scheduled).toHaveLength(1);
    scheduled[0]();
    expect(snapshots).toEqual([2]);
  });

  it("reports setup failure and disposes the failed game", async () => {
    const game = create_game();
    const failure = new Error("setup failed");
    Object.assign(game, { ready: Promise.reject(failure) });
    const adapter = create_game_adapter({
      initial_state: { loading: true },
      commands: {},
      create: () => game,
    });

    await expect(adapter.mount({} as HTMLCanvasElement)).rejects.toBe(failure);
    expect(adapter.view.status).toBe("error");
    expect(adapter.view.error).toBe(failure);
    await adapter.dispose();
    expect(game.dispose).toHaveBeenCalledOnce();
  });

  it("does not become ready after disposal races setup", async () => {
    let resolve_ready!: () => void;
    const game = create_game();
    Object.assign(game, { ready: new Promise<void>((resolve) => (resolve_ready = resolve)) });
    const adapter = create_game_adapter({
      initial_state: { loading: true },
      commands: {},
      create: () => game,
    });
    const mounting = adapter.mount({} as HTMLCanvasElement);
    await adapter.dispose();
    resolve_ready();
    await mounting;
    expect(adapter.view.status).toBe("disposed");
  });

  it("keeps multiple adapter instances isolated", async () => {
    const first_game = create_game();
    const second_game = create_game();
    let first_publish!: (state: { score: number }) => void;
    let second_publish!: (state: { score: number }) => void;
    let first_score = 1;
    let second_score = 10;
    const first = create_game_adapter({
      initial_state: { score: first_score },
      commands: {
        increment: (amount: number) => {
          first_score += amount;
          first_publish({ score: first_score });
          return first_score;
        },
      },
      create: ({ publish }) => {
        first_publish = publish;
        return first_game;
      },
    });
    const second = create_game_adapter({
      initial_state: { score: second_score },
      commands: {
        increment: (amount: number) => {
          second_score += amount;
          second_publish({ score: second_score });
          return second_score;
        },
      },
      create: ({ publish }) => {
        second_publish = publish;
        return second_game;
      },
    });

    await Promise.all([first.mount({} as HTMLCanvasElement), second.mount({} as HTMLCanvasElement)]);
    expect(first.view.state.score).toBe(1);
    expect(second.view.state.score).toBe(10);
    expect(first.view.commands.increment(2)).toBe(3);
    await Promise.resolve();
    expect(first.view.state.score).toBe(3);
    expect(second.view.state.score).toBe(10);
    expect(second.view.commands.increment(5)).toBe(15);
    await Promise.resolve();
    expect(first.view.state.score).toBe(3);
    expect(second.view.state.score).toBe(15);

    await Promise.all([first.dispose(), second.dispose()]);
    expect(first_game.dispose).toHaveBeenCalledOnce();
    expect(second_game.dispose).toHaveBeenCalledOnce();
  });
});
