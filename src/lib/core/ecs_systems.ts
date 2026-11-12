import type { ComponentSchema, World } from "./ecs.js";
import type { UpdateTime } from "./runtime/timing.js";

export type EcsSystemContext<Schema extends ComponentSchema> = Readonly<{
  world: World<Schema>;
  time: UpdateTime;
}>;

export type EcsSystem<Schema extends ComponentSchema> = Readonly<{
  update: (context: EcsSystemContext<Schema>) => void;
  enabled?: boolean | ((context: EcsSystemContext<Schema>) => boolean);
}>;

export type EcsSystemPipeline<Schema extends ComponentSchema> = Readonly<{
  run: (world: World<Schema>, time: UpdateTime) => void;
  size: number;
}>;

export const create_ecs_system_pipeline = <Schema extends ComponentSchema>(
  systems: readonly EcsSystem<Schema>[],
): EcsSystemPipeline<Schema> => {
  const ordered_systems = [...systems];
  const run = (world: World<Schema>, time: UpdateTime): void => {
    const context = Object.freeze({ world, time });
    for (const system of ordered_systems) {
      const enabled = system.enabled;
      if (enabled === false || (typeof enabled === "function" && !enabled(context))) continue;
      system.update(context);
    }
  };
  return Object.freeze({ run, size: ordered_systems.length });
};
