import { create_game_bridge } from "../src/lib/core/runtime/bridge.js";

const controller = create_game_bridge(
  { health: 10 },
  {
    use_item: (item_id: string) => item_id.length,
    save: async (slot: number) => `saved:${slot}`,
  },
);

const length: number = controller.bridge.commands.use_item("potion");
const saved: Promise<string> = controller.bridge.commands.save(1);
void length;
void saved;

// @ts-expect-error Wrong command argument types must be rejected.
void controller.bridge.commands.use_item(1);
// @ts-expect-error Unknown commands must not be exposed.
void controller.bridge.commands.reset();
