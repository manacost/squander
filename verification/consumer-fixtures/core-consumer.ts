import { create_game, create_random, define_component, define_components, type GameOptions, type RandomSource } from "squander";
import { create_path, line_to, move_to } from "squander/core";
import { create_input_router } from "squander/core/runtime";
import { create_world } from "squander/ecs";
import { create_event_dispatcher, create_signal } from "squander/signals";

const scheduler = {
  request_frame: () => 0,
  cancel_frame: () => undefined,
  now_seconds: () => 0,
};

const position = define_component<{ x: number; y: number }>({ name: "position" });
const schema = define_components({ position });
const world = create_world(schema);
const entity = world.create();
world.add(entity, position, { x: 0, y: 0 });
world.write(entity, position).x += 1;
const position_x: number = world.read(entity, position).x;
void position_x;

const source: RandomSource = create_random({ seed: "consumer" });
const random_value: number = source.next_float();
void random_value;

const path = create_path([move_to(0, 0), line_to(1, 1)]);
void path;

const input = create_input_router();
input.on_global(() => "pass");

const signal = create_signal<number>();
signal.subscribe((value) => {
  const typed_value: number = value;
  void typed_value;
});

type Events = { score: { points: number }; reset: undefined };
const events = create_event_dispatcher<Events>();
events.emit("score", { points: 1 });
events.emit("reset");

const options: GameOptions = {
  renderer: { canvas: {} as HTMLCanvasElement, width: 1, height: 1 },
  scheduler,
  update: ({ delta_seconds }) => {
    const delta: number = delta_seconds;
    void delta;
  },
  draw: () => undefined,
};
const game = create_game(options);
void game;

// @ts-expect-error Event payloads must match the declared event map.
events.emit("score", { points: "one" });
// @ts-expect-error Unknown event names must not be exposed.
events.emit("missing", undefined);
// @ts-expect-error Random sources reject invalid seed values.
create_random({ seed: true });
