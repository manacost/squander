import type { BlendMode, RenderCommand } from "../src/lib/index.js";

const modes: readonly BlendMode[] = ["normal", "additive", "multiply"];
const command: RenderCommand = {
  kind: "rectangle",
  draw: {
    rectangle: { x: 0, y: 0, width: 1, height: 1 },
    color: { red: 1, green: 1, blue: 1, alpha: 1 },
    blend_mode: "additive",
  },
};
// @ts-expect-error Blend modes are a closed public union.
const invalid_mode: BlendMode = "screen";

void modes;
void command;
void invalid_mode;
