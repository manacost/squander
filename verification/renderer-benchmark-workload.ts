import type { RenderCommand, WebGpuTexture } from "../src/lib/core/runtime/webgpu_renderer.js";

export const renderer_benchmark_sizes = [100, 1_000, 10_000] as const;
export type RendererBenchmarkSize = (typeof renderer_benchmark_sizes)[number];

export type RendererBenchmarkSprite = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  region_x: number;
  region_y: number;
  region_width: number;
  region_height: number;
}>;

export type RendererBenchmarkWorkload = Readonly<{
  sprite_count: number;
  sprites: readonly RendererBenchmarkSprite[];
  expected_batch_breaks: number;
  expected_production_readbacks: number;
}>;

export function create_renderer_benchmark_workload(sprite_count: number): RendererBenchmarkWorkload {
  if (!Number.isInteger(sprite_count) || sprite_count <= 0) {
    throw new RangeError("sprite_count must be a positive integer");
  }
  const sprites: RendererBenchmarkSprite[] = [];
  for (let index = 0; index < sprite_count; index += 1) {
    const column = index % 100;
    const row = Math.floor(index / 100);
    sprites.push({
      x: (column * 8) % 800,
      y: (row * 8) % 450,
      width: 8,
      height: 8,
      region_x: index % 2 === 0 ? 0 : 2,
      region_y: 0,
      region_width: 2,
      region_height: 2,
    });
  }
  return Object.freeze({
    sprite_count,
    sprites: Object.freeze(sprites),
    expected_batch_breaks: 0,
    expected_production_readbacks: 0,
  });
}

export function prepare_renderer_benchmark_commands(workload: RendererBenchmarkWorkload, texture: WebGpuTexture): readonly RenderCommand[] {
  return workload.sprites.map((sprite) => ({
    kind: "texture",
    draw: {
      texture,
      options: {
        region: {
          x: sprite.region_x,
          y: sprite.region_y,
          width: sprite.region_width,
          height: sprite.region_height,
        },
        x: sprite.x,
        y: sprite.y,
        width: sprite.width,
        height: sprite.height,
      },
    },
  }));
}
