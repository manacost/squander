import type { AssetManifest } from "../core/runtime/asset_loading.js";
import type { Game } from "../core/runtime/game.js";
import { create_game_bridge, type BridgeCommands, type GameBridge } from "../core/runtime/bridge.js";

export type GameAdapterStatus = "loading" | "ready" | "error" | "disposed";

export type GameAdapterView<State, Commands extends BridgeCommands> = Readonly<{
  state: Readonly<State>;
  status: GameAdapterStatus;
  error: unknown;
  commands: GameBridge<State, Commands>["commands"];
}>;

export type GameAdapterOptions<State, Commands extends BridgeCommands, Manifest extends AssetManifest = AssetManifest> = Readonly<{
  initial_state: State;
  commands: Commands;
  notification_scheduler?: (notify: () => void) => void;
  create: (
    context: Readonly<{
      canvas: HTMLCanvasElement;
      bridge: GameBridge<State, Commands>;
      publish: (state: State) => void;
    }>,
  ) => Game<Manifest>;
}>;

export type GameAdapter<State, Commands extends BridgeCommands> = Readonly<{
  readonly bridge: GameBridge<State, Commands>;
  readonly view: GameAdapterView<State, Commands>;
  subscribe: (subscriber: (view: GameAdapterView<State, Commands>) => void) => () => void;
  mount: (canvas: HTMLCanvasElement) => Promise<void>;
  dispose: () => Promise<void>;
}>;

export const create_game_adapter = <State, Commands extends BridgeCommands, Manifest extends AssetManifest = AssetManifest>(
  options: GameAdapterOptions<State, Commands, Manifest>,
): GameAdapter<State, Commands> => {
  const controller = create_game_bridge(options.initial_state, options.commands);
  let game: Game<Manifest> | undefined;
  let status: GameAdapterStatus = "loading";
  let error: unknown = undefined;
  let disposed = false;
  let view: GameAdapterView<State, Commands> = Object.freeze({
    state: controller.bridge.state.get(),
    status,
    error,
    commands: controller.bridge.commands,
  });
  const subscribers = new Set<(view: GameAdapterView<State, Commands>) => void>();
  let notification_pending = false;
  let disposal_epoch = 0;
  const notify = (): void => {
    view = Object.freeze({ state: controller.bridge.state.get(), status, error, commands: controller.bridge.commands });
    for (const subscriber of subscribers) subscriber(view);
  };
  const schedule_notify = (): void => {
    if (notification_pending) return;
    notification_pending = true;
    (options.notification_scheduler ?? queueMicrotask)(() => {
      notification_pending = false;
      notify();
    });
  };
  controller.bridge.state.subscribe(() => {
    schedule_notify();
  });
  const subscribe = (subscriber: (next_view: GameAdapterView<State, Commands>) => void): (() => void) => {
    subscribers.add(subscriber);
    subscriber(view);
    return () => subscribers.delete(subscriber);
  };
  const mount = async (canvas: HTMLCanvasElement): Promise<void> => {
    if (disposed) throw new Error("game adapter is disposed");
    if (game !== undefined) throw new Error("game adapter is already mounted");
    try {
      game = options.create({ canvas, bridge: controller.bridge, publish: controller.publish });
      const mount_epoch = disposal_epoch;
      await game.ready;
      if (mount_epoch !== disposal_epoch) return;
      status = "ready";
      notify();
    } catch (cause) {
      error = cause;
      status = "error";
      notify();
      throw cause;
    }
  };
  const dispose = async (): Promise<void> => {
    if (disposed) return;
    disposed = true;
    disposal_epoch += 1;
    await game?.dispose();
    game = undefined;
    controller.dispose();
    status = "disposed";
    notify();
    subscribers.clear();
  };
  const adapter = {
    bridge: controller.bridge,
    get view(): GameAdapterView<State, Commands> {
      return view;
    },
    subscribe,
    mount,
    dispose,
  };
  return Object.freeze(adapter);
};
