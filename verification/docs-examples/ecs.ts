import { create_world, define_component, define_components } from "squander/ecs";

type Position = { x: number; y: number };
type Velocity = { x: number; y: number };

const position = define_component<Position>({ name: "position" });
const velocity = define_component<Velocity>({ name: "velocity" });
const world = create_world(define_components({ position, velocity }));
const entity = world.create();

world.add(entity, position, { x: 0, y: 0 });
world.add(entity, velocity, { x: 1, y: 0 });
world
  .query()
  .with(position, velocity)
  .each(({ read, write }) => {
    write(position).x = read(position).x + read(velocity).x;
  });
