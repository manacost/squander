import type {
  BlendMode,
  RenderCommand,
  ShaderEffectOptions,
  WebGpuRenderTarget,
  WebGpuRendererOptions,
  WebGpuShaderEffect,
} from "../src/lib/index.js";

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
const target: WebGpuRenderTarget = {
  width: 1,
  height: 1,
  filtering: { magnification: "nearest", minification: "nearest" },
  release: () => undefined,
};
const target_command: RenderCommand = { kind: "texture", draw: { texture: target } };
const effect_options: ShaderEffectOptions = { fragment_code: "return color;", uniforms: [0.5] };
const effect: WebGpuShaderEffect = { release: () => undefined };
const effected_command: RenderCommand = { kind: "texture", draw: { texture: target, options: { effect } } };
const bounded_command: RenderCommand = {
  kind: "rectangle",
  draw: { rectangle: { x: 0, y: 0, width: 1, height: 1 }, color: { red: 1, green: 1, blue: 1, alpha: 1 } },
  bounds: { x: 0, y: 0, width: 1, height: 1 },
};
const culling: WebGpuRendererOptions["cull_offscreen"] = true;
// @ts-expect-error Shader uniforms are finite numeric values, not strings.
const invalid_effect: ShaderEffectOptions = { fragment_code: "return color;", uniforms: ["bright"] };

void modes;
void command;
void invalid_mode;
void target_command;
void effect_options;
void effect;
void effected_command;
void bounded_command;
void culling;
void invalid_effect;
