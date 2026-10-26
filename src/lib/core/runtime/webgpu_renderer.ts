import { resolve_texture_filtering, type TextureFilteringOptions } from "./texture_filtering.js";
import { create_resource_owner, type ResourceHandle, type ResourceOwner } from "./resource_ownership.js";
import type { Color } from "./colors.js";
import {
  has_drawable_area,
  normalize_rectangle,
  validate_circle,
  validate_line,
  validate_stroke_width,
  type Circle,
  type Line,
  type Rectangle,
} from "./shapes.js";

export type ClearColor = Readonly<{ red: number; green: number; blue: number; alpha: number }>;

export type WebGpuRendererOptions = Readonly<{
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}>;

export type WebGpuTexture = Readonly<{
  resource: ResourceHandle<GPUTexture>;
  width: number;
  height: number;
  filtering: ReturnType<typeof resolve_texture_filtering>;
  release: () => void;
}>;

export type TextureDrawOptions = Readonly<{
  region?: Readonly<{ x: number; y: number; width: number; height: number }>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  origin?: Readonly<{ x: number; y: number }>;
  rotation?: number;
  flip_x?: boolean;
  flip_y?: boolean;
  tint?: Color;
  opacity?: number;
  shape_kind?: number;
  shape_x?: number;
  shape_y?: number;
}>;

export type TextureDraw = Readonly<{ texture: WebGpuTexture; options?: TextureDrawOptions }>;

export type RectangleDraw = Readonly<{ rectangle: Rectangle; color: Color; opacity?: number }>;
export type CircleDraw = Readonly<{ circle: Circle; color: Color; opacity?: number }>;
export type LineDraw = Readonly<{ line: Line; color: Color; stroke_width: number; opacity?: number }>;
export type RectangleOutlineDraw = Readonly<{ rectangle: Rectangle; color: Color; stroke_width: number; opacity?: number }>;

export type RenderCommand = Readonly<
  | { kind: "texture"; draw: TextureDraw }
  | { kind: "rectangle"; draw: RectangleDraw }
  | { kind: "circle"; draw: CircleDraw }
  | { kind: "line"; draw: LineDraw }
  | { kind: "rectangle_outline"; draw: RectangleOutlineDraw }
>;

export type WebGpuRenderer = Readonly<{
  clear: (color: ClearColor) => Promise<Uint8Array>;
  create_texture: (pixels: Uint8Array, width: number, height: number, options?: TextureFilteringOptions) => WebGpuTexture;
  draw_texture: (texture: WebGpuTexture, options?: TextureDrawOptions) => Promise<Uint8Array>;
  draw_textures: (draws: readonly TextureDraw[]) => Promise<Uint8Array>;
  draw_commands: (commands: readonly RenderCommand[]) => Promise<Uint8Array>;
  dispose: () => void;
}>;

export class WebGpuUnavailableError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "WebGpuUnavailableError";
  }
}

const assert_color = (color: ClearColor): void => {
  for (const [name, value] of Object.entries(color)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(`${name} must be finite and between zero and one`);
    }
  }
};

const bytes_per_row = 256;

const textured_shader = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex
fn vertex_main(@location(0) position: vec2f, @location(1) uv: vec2f) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4f(position, 0.0, 1.0);
  output.uv = uv;
  return output;
}

@group(0) @binding(0) var texture_sampler: sampler;
@group(0) @binding(1) var texture_data: texture_2d<f32>;
struct DrawUniforms {
  uv_origin: vec2f,
  uv_size: vec2f,
  tint: vec4f,
  shape: vec4f,
};
@group(0) @binding(2) var<uniform> draw_uniforms: DrawUniforms;

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  if (draw_uniforms.shape.x > 0.5) {
    let centered = input.uv - vec2f(0.5, 0.5);
    if (dot(centered, centered) > 0.25) {
      discard;
    }
  }
  if (draw_uniforms.shape.x > 1.5 && draw_uniforms.shape.x < 2.5) {
    let edge_x = min(input.uv.x, 1.0 - input.uv.x);
    let edge_y = min(input.uv.y, 1.0 - input.uv.y);
    if (edge_x > draw_uniforms.shape.y && edge_y > draw_uniforms.shape.z) {
      discard;
    }
  }
  return textureSample(texture_data, texture_sampler, draw_uniforms.uv_origin + input.uv * draw_uniforms.uv_size) * draw_uniforms.tint;
}
`;

const normalize_readback = (pixels: Uint8Array, width: number, height: number, format: GPUTextureFormat): Uint8Array => {
  if (format !== "bgra8unorm") {
    return pixels;
  }
  const normalized = new Uint8Array(pixels);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const offset = row * bytes_per_row + column * 4;
      const red = normalized[offset];
      normalized[offset] = normalized[offset + 2];
      normalized[offset + 2] = red;
    }
  }
  return normalized;
};

export const create_webgpu_renderer = async (options: WebGpuRendererOptions): Promise<WebGpuRenderer> => {
  if (!window.isSecureContext) {
    throw new WebGpuUnavailableError("WebGPU requires a secure context");
  }
  if (!("gpu" in navigator)) {
    throw new WebGpuUnavailableError("WebGPU is unavailable");
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (adapter === null) {
    throw new WebGpuUnavailableError("no WebGPU adapter is available");
  }
  const device = await adapter.requestDevice();
  const context = options.canvas.getContext("webgpu");
  if (context === null) {
    device.destroy();
    throw new WebGpuUnavailableError("canvas does not provide a WebGPU context");
  }

  options.canvas.width = options.width;
  options.canvas.height = options.height;
  const format = navigator.gpu.getPreferredCanvasFormat();
  /* eslint-disable @typescript-eslint/naming-convention -- WebGPU descriptor keys use the external API's camelCase names. */
  context.configure({ device, format, alphaMode: "opaque", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
  const resources: ResourceOwner = create_resource_owner();
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({ code: textured_shader }),
      entryPoint: "vertex_main",
      buffers: [
        {
          arrayStride: 16,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" },
            { shaderLocation: 1, offset: 8, format: "float32x2" },
          ],
        },
      ],
    },
    fragment: {
      module: device.createShaderModule({ code: textured_shader }),
      entryPoint: "fragment_main",
      targets: [
        {
          format,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          },
        },
      ],
    },
    primitive: { topology: "triangle-list" },
  });
  let disposed = false;
  let solid_texture: WebGpuTexture | undefined;

  const submit_and_readback = async (encoder: GPUCommandEncoder, texture: GPUTexture): Promise<Uint8Array> => {
    const readback = device.createBuffer({
      size: bytes_per_row * options.height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    encoder.copyTextureToBuffer(
      { texture },
      { buffer: readback, bytesPerRow: bytes_per_row, rowsPerImage: options.height },
      { width: options.width, height: options.height, depthOrArrayLayers: 1 },
    );
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    await readback.mapAsync(GPUMapMode.READ);
    const mapped = new Uint8Array(readback.getMappedRange());
    const pixels = normalize_readback(new Uint8Array(mapped), options.width, options.height, format);
    readback.unmap();
    readback.destroy();
    return pixels;
  };

  const clear = async (color: ClearColor): Promise<Uint8Array> => {
    if (disposed) {
      throw new Error("WebGPU renderer is disposed");
    }
    assert_color(color);
    const texture = context.getCurrentTexture();
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: texture.createView(),
          clearValue: { r: color.red, g: color.green, b: color.blue, a: color.alpha },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.end();
    /* eslint-enable @typescript-eslint/naming-convention -- End of the WebGPU external descriptor boundary. */
    return submit_and_readback(encoder, texture);
  };

  const create_texture = (pixels: Uint8Array, width: number, height: number, filtering: TextureFilteringOptions = {}): WebGpuTexture => {
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      throw new RangeError("texture dimensions must be positive integers");
    }
    if (pixels.byteLength < width * height * 4) {
      throw new RangeError("texture pixels are shorter than the declared dimensions");
    }
    const texture = device.createTexture({
      size: { width, height },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    /* eslint-disable @typescript-eslint/naming-convention -- WebGPU write descriptors use external camelCase names. */
    device.queue.writeTexture(
      { texture },
      pixels,
      { bytesPerRow: width * 4, rowsPerImage: height },
      { width, height, depthOrArrayLayers: 1 },
    );
    /* eslint-enable @typescript-eslint/naming-convention -- End of the WebGPU external descriptor boundary. */
    const resolved_filtering = resolve_texture_filtering(filtering);
    const handle = resources.acquire(texture, (resource) => {
      resource.destroy();
    });
    texture.label = `texture:${resolved_filtering.magnification}:${resolved_filtering.minification}`;
    return Object.freeze({
      resource: handle,
      width,
      height,
      filtering: resolved_filtering,
      release: handle.release,
    });
  };

  const draw_texture = async (texture: WebGpuTexture, draw_options: TextureDrawOptions = {}): Promise<Uint8Array> => {
    return draw_textures([{ texture, options: draw_options }]);
  };

  const draw_commands = async (commands: readonly RenderCommand[]): Promise<Uint8Array> => {
    if (disposed) {
      throw new Error("WebGPU renderer is disposed");
    }
    if (commands.length === 0) {
      throw new RangeError("at least one texture draw is required");
    }
    const draws = commands.map((command): TextureDraw => {
      if (command.kind === "texture") {
        return command.draw;
      }
      if (command.kind === "circle") {
        const circle = validate_circle(command.draw.circle);
        if (circle.radius === 0) {
          return {
            texture: ensure_solid_texture(),
            options: { x: 0, y: 0, width: 0.000001, height: 0.000001, opacity: 0 },
          };
        }
        return {
          texture: ensure_solid_texture(),
          options: {
            x: circle.x - circle.radius,
            y: circle.y - circle.radius,
            width: circle.radius * 2,
            height: circle.radius * 2,
            tint: command.draw.color,
            opacity: command.draw.opacity,
            shape_kind: 1,
          },
        };
      }
      if (command.kind === "line") {
        const line = validate_line(command.draw.line);
        const stroke_width = validate_stroke_width(command.draw.stroke_width);
        const delta_x = line.to.x - line.from.x;
        const delta_y = line.to.y - line.from.y;
        const length = Math.hypot(delta_x, delta_y);
        if (length === 0 || stroke_width === 0) {
          return {
            texture: ensure_solid_texture(),
            options: { x: 0, y: 0, width: 0.000001, height: 0.000001, opacity: 0 },
          };
        }
        return {
          texture: ensure_solid_texture(),
          options: {
            x: line.from.x,
            y: line.from.y,
            width: length,
            height: stroke_width,
            origin: { x: 0, y: 0.5 },
            rotation: Math.atan2(delta_y, delta_x),
            tint: command.draw.color,
            opacity: command.draw.opacity,
            shape_kind: 0,
          },
        };
      }
      if (command.kind === "rectangle_outline") {
        const normalized = normalize_rectangle(command.draw.rectangle);
        const stroke_width = validate_stroke_width(command.draw.stroke_width);
        if (!has_drawable_area(normalized) || stroke_width === 0) {
          return {
            texture: ensure_solid_texture(),
            options: { x: 0, y: 0, width: 0.000001, height: 0.000001, opacity: 0 },
          };
        }
        return {
          texture: ensure_solid_texture(),
          options: {
            x: normalized.left,
            y: normalized.top,
            width: normalized.width,
            height: normalized.height,
            tint: command.draw.color,
            opacity: command.draw.opacity,
            shape_kind: 2,
            shape_x: stroke_width / normalized.width,
            shape_y: stroke_width / normalized.height,
          },
        };
      }
      const normalized = normalize_rectangle(command.draw.rectangle);
      if (!has_drawable_area(normalized)) {
        return {
          texture: ensure_solid_texture(),
          options: { x: 0, y: 0, width: 0.000001, height: 0.000001, opacity: 0 },
        };
      }
      return {
        texture: ensure_solid_texture(),
        options: {
          x: normalized.left,
          y: normalized.top,
          width: normalized.width,
          height: normalized.height,
          tint: command.draw.color,
          opacity: command.draw.opacity,
          shape_kind: 0,
        },
      };
    });
    const canvas_width = options.width;
    const canvas_height = options.height;
    const encoded_draws = draws.map(({ texture, options = {} }) => {
      const region = options.region ?? { x: 0, y: 0, width: texture.width, height: texture.height };
      if (!Number.isFinite(region.x) || !Number.isFinite(region.y) || !Number.isFinite(region.width) || !Number.isFinite(region.height)) {
        throw new RangeError("texture region must be finite");
      }
      if (
        region.width <= 0 ||
        region.height <= 0 ||
        region.x < 0 ||
        region.y < 0 ||
        region.x + region.width > texture.width ||
        region.y + region.height > texture.height
      ) {
        throw new RangeError("texture region must fit within the texture");
      }
      const x = options.x ?? 0;
      const y = options.y ?? 0;
      const width = options.width ?? region.width;
      const height = options.height ?? region.height;
      const origin = options.origin ?? { x: 0, y: 0 };
      const rotation = options.rotation ?? 0;
      if (![x, y, width, height, origin.x, origin.y, rotation].every(Number.isFinite)) {
        throw new RangeError("texture placement must be finite");
      }
      if (width <= 0 || height <= 0 || origin.x < 0 || origin.x > 1 || origin.y < 0 || origin.y > 1) {
        throw new RangeError("texture placement dimensions must be positive and origin must be normalized");
      }
      const tint = options.tint ?? { red: 1, green: 1, blue: 1, alpha: 1 };
      assert_color(tint);
      const opacity = options.opacity ?? 1;
      if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
        throw new RangeError("opacity must be finite and between zero and one");
      }
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const corner = (local_x: number, local_y: number): [number, number] => {
        const centered_x = local_x - origin.x * width;
        const centered_y = local_y - origin.y * height;
        return [x + centered_x * cos - centered_y * sin, y + centered_x * sin + centered_y * cos];
      };
      const corners = [corner(0, 0), corner(width, 0), corner(width, height), corner(0, height)];
      const to_clip = ([point_x, point_y]: [number, number]): [number, number] => [
        (point_x / canvas_width) * 2 - 1,
        1 - (point_y / canvas_height) * 2,
      ];
      const positions = corners.map(to_clip);
      const u0 = region.x / texture.width;
      const v0 = region.y / texture.height;
      const u1 = (region.x + region.width) / texture.width;
      const v1 = (region.y + region.height) / texture.height;
      const uvs = options.flip_x ? [u1, v0, u0, v0, u0, v1, u1, v1] : [u0, v0, u1, v0, u1, v1, u0, v1];
      const flipped_uvs = options.flip_y ? [uvs[0], v1, uvs[2], v1, uvs[4], v0, uvs[6], v0] : uvs;
      const vertex_data = new Float32Array([
        ...positions[0],
        flipped_uvs[0],
        flipped_uvs[1],
        ...positions[1],
        flipped_uvs[2],
        flipped_uvs[3],
        ...positions[2],
        flipped_uvs[4],
        flipped_uvs[5],
        ...positions[0],
        flipped_uvs[0],
        flipped_uvs[1],
        ...positions[2],
        flipped_uvs[4],
        flipped_uvs[5],
        ...positions[3],
        flipped_uvs[6],
        flipped_uvs[7],
      ]);
      return {
        texture,
        tint,
        opacity,
        vertex_data,
        region,
        shape_kind: options.shape_kind ?? 0,
        shape_x: options.shape_x ?? 0,
        shape_y: options.shape_y ?? 0,
      };
    });
    const leases = encoded_draws.map(({ texture }) => texture.resource.acquire_lease());
    const buffers = encoded_draws.map(({ vertex_data }) => {
      const buffer = device.createBuffer({ size: vertex_data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      device.queue.writeBuffer(buffer, 0, vertex_data);
      return buffer;
    });
    const samplers = encoded_draws.map(({ texture }) => {
      /* eslint-disable @typescript-eslint/naming-convention -- WebGPU sampler descriptors use external camelCase names. */
      const sampler = device.createSampler({ magFilter: texture.filtering.magnification, minFilter: texture.filtering.minification });
      /* eslint-enable @typescript-eslint/naming-convention -- End of the WebGPU external descriptor boundary. */
      return sampler;
    });
    const uniforms = encoded_draws.map(({ tint, opacity, region, texture, shape_kind, shape_x, shape_y }) => {
      const uniform = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      device.queue.writeBuffer(
        uniform,
        0,
        new Float32Array([
          region.x / texture.width,
          region.y / texture.height,
          region.width / texture.width,
          region.height / texture.height,
          tint.red,
          tint.green,
          tint.blue,
          tint.alpha * opacity,
          shape_kind,
          shape_x,
          shape_y,
          0,
        ]),
      );
      return uniform;
    });
    const bind_groups = encoded_draws.map((_, index) => {
      return device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: samplers[index] },
          { binding: 1, resource: leases[index].resource.createView() },
          { binding: 2, resource: { buffer: uniforms[index] } },
        ],
      });
    });
    /* eslint-disable @typescript-eslint/naming-convention -- WebGPU render descriptors use external camelCase names. */
    const target = context.getCurrentTexture();
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: target.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipeline);
    encoded_draws.forEach((_, index) => {
      pass.setBindGroup(0, bind_groups[index]);
      pass.setVertexBuffer(0, buffers[index]);
      pass.draw(6);
    });
    pass.end();
    /* eslint-enable @typescript-eslint/naming-convention -- End of the WebGPU external descriptor boundary. */
    try {
      return await submit_and_readback(encoder, target);
    } finally {
      leases.forEach((lease) => {
        lease.release();
      });
      buffers.forEach((buffer) => {
        buffer.destroy();
      });
      uniforms.forEach((uniform) => {
        uniform.destroy();
      });
    }
  };

  const draw_textures = async (draws: readonly TextureDraw[]): Promise<Uint8Array> =>
    draw_commands(draws.map((draw) => ({ kind: "texture", draw })));

  function ensure_solid_texture(): WebGpuTexture {
    solid_texture ??= create_texture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    return solid_texture;
  }

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    resources.dispose();
    context.unconfigure();
    device.destroy();
  };

  return Object.freeze({ clear, create_texture, draw_texture, draw_textures, draw_commands, dispose });
};
