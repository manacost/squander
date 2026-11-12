import { create_ecs_system_pipeline, create_world, define_component, define_components } from "../src/lib/ecs/index.js";
import type { UpdateTime } from "../src/lib/core/runtime/timing.js";

type Position = { x: number; y: number };
type Velocity = { x: number; y: number };
type Damage = { value: number };

const position = define_component<Position>({ name: "position" });
const velocity = define_component<Velocity>({ name: "velocity" });
const damage = define_component<Damage>({ name: "damage" });
const schema = define_components({ position, velocity });
const world = create_world(schema);
const entity = world.create();
const generational_world = create_world(schema, { entity_policy: "generational" });
const generational_entity = generational_world.create();
generational_world.add(generational_entity, position, { x: 0, y: 0 });

const policy: "monotonic" | "generational" = generational_world.entity_policy;
void policy;

const pipeline = create_ecs_system_pipeline<typeof schema>([
  {
    update: ({ world, time }) => {
      const typed_time: UpdateTime = time;
      world.read(entity, position);
      void typed_time;
    },
  },
]);
pipeline.run(world, {
  delta_seconds: 0.1,
  elapsed_seconds: 0.1,
  update_index: 0,
  measured_delta_seconds: 0.1,
  delta_was_clamped: false,
  discarded_seconds: 0,
});

world.add(entity, position, { x: 0, y: 0 });
world.add(entity, velocity, { x: 1, y: 0 });

world
  .query()
  .with(position, velocity)
  .each(({ read, write }) => {
    const position_value: Position = read(position);
    const velocity_value: Velocity = read(velocity);
    write(position).x = position_value.x + velocity_value.x;

    // @ts-expect-error Damage is not registered in this world's local schema.
    read(damage);
  });

// @ts-expect-error Damage is not registered in this world's local schema.
world.add(entity, damage, { value: 1 });

const foreign = define_component<{ label: string }>({ name: "label" });

// @ts-expect-error Foreign components are not part of this world's schema.
world.query().with(foreign);

// @ts-expect-error Component values are object-shaped by design.
define_component<number>({ name: "number" });

// @ts-expect-error Entity policies are intentionally closed to the supported runtime modes.
create_world(schema, { entity_policy: "recycled" });
