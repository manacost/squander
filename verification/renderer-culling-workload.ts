import type { RenderCommand, WebGpuTexture } from "../src/lib/core/runtime/webgpu_renderer.js";

export const renderer_culling_benchmark_sizes = [100, 1_000, 10_000] as const;
export type RendererCullingBenchmarkSize = (typeof renderer_culling_benchmark_sizes)[number];

export type RendererCullingBenchmarkWorkload = Readonly<{
  sprite_count: number;
  sprites: readonly RendererCullingBenchmarkSprite[];
  expected_visible_commands: number;
  expected_skipped_commands: number;
}>;

type RendererCullingBenchmarkSprite = Readonly<{
  x: number;
  y: number;
  visible: boolean;
}>;

export const create_renderer_culling_benchmark_workload = (sprite_count: number): RendererCullingBenchmarkWorkload => {
  if (!Number.isInteger(sprite_count) || sprite_count <= 0) {
    throw new RangeError("sprite_count must be a positive integer");
  }
  const sprites: RendererCullingBenchmarkSprite[] = [];
  for (let index = 0; index < sprite_count; index += 1) {
    const visible = index % 2 === 0;
    const x = visible ? (index % 20) * 16 : 2_000 + (index % 20) * 16;
    sprites.push({ x, y: (Math.floor(index / 20) % 28) * 16, visible });
  }
  return Object.freeze({
    sprite_count,
    sprites: Object.freeze(sprites),
    expected_visible_commands: Math.ceil(sprite_count / 2),
    expected_skipped_commands: Math.floor(sprite_count / 2),
  });
};

export const bind_renderer_culling_workload = (
  workload: RendererCullingBenchmarkWorkload,
  texture: WebGpuTexture,
): readonly RenderCommand[] =>
  workload.sprites.map((sprite) => ({
    kind: "texture",
    draw: { texture, options: { x: sprite.x, y: sprite.y, width: 16, height: 16 } },
    bounds: { x: sprite.x, y: sprite.y, width: 16, height: 16 },
  }));
