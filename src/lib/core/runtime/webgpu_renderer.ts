/// <reference types="@webgpu/types" />

import { resolve_texture_filtering, type TextureFilteringOptions } from "./texture_filtering.js";
import { decode_image_source } from "./image_loading.js";
import { create_resource_owner, type ResourceHandle, type ResourceLease, type ResourceOwner } from "./resource_ownership.js";
import type { Color } from "./colors.js";
import { get_active_camera } from "./camera.js";
import { calculate_responsive_viewport, type ViewportSize } from "./viewport_sizing.js";
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
import { create_polygon, type PolygonPoint } from "./polygons.js";
import { triangulate_polygon } from "./triangulation.js";
import type { FlattenedSubpath } from "./path_flattening.js";
import { create_stroke_geometry } from "./stroke_geometry.js";
import type { GeometryHandle, GeometryOwner, PreparedGeometry } from "./geometry_ownership.js";
import { create_webgpu_font, type FontOptions, type TextDrawOptions, type WebGpuFont } from "./font_loading.js";
import type { BlendMode } from "./render_types.js";

export type { BlendMode } from "./render_types.js";

export type ClearColor = Readonly<{ red: number; green: number; blue: number; alpha: number }>;

export type WebGpuRendererOptions = Readonly<{
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  viewport?: ViewportSize;
}>;

export type WebGpuTexture = Readonly<{
  resource: ResourceHandle<GPUTexture>;
  width: number;
  height: number;
  filtering: ReturnType<typeof resolve_texture_filtering>;
  release: () => void;
}>;

export type RenderTargetOptions = Readonly<{
  width: number;
  height: number;
  filtering?: TextureFilteringOptions;
}>;

export type WebGpuRenderTarget = Readonly<{
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
  blend_mode?: BlendMode;
}>;

export type TextureDraw = Readonly<{ texture: WebGpuTexture | WebGpuRenderTarget; options?: TextureDrawOptions }>;

type DrawBlendOptions = Readonly<{ blend_mode?: BlendMode }>;

export type RectangleDraw = Readonly<{ rectangle: Rectangle; color: Color; opacity?: number }> & DrawBlendOptions;
export type CircleDraw = Readonly<{ circle: Circle; color: Color; opacity?: number }> & DrawBlendOptions;
export type LineDraw = Readonly<{ line: Line; color: Color; stroke_width: number; opacity?: number }> & DrawBlendOptions;
export type RectangleOutlineDraw = Readonly<{ rectangle: Rectangle; color: Color; stroke_width: number; opacity?: number }> &
  DrawBlendOptions;
export type CircleOutlineDraw = Readonly<{ circle: Circle; color: Color; stroke_width: number; opacity?: number }> & DrawBlendOptions;
export type TriangleDraw = Readonly<{ vertices: readonly PolygonPoint[]; indices: readonly number[]; color: Color; opacity?: number }> &
  DrawBlendOptions;
export type StrokeDraw = Readonly<{ subpaths: readonly FlattenedSubpath[]; width: number; color: Color; opacity?: number }> &
  DrawBlendOptions;
export type PolygonDraw = Readonly<{ points: readonly PolygonPoint[]; color: Color; opacity?: number }> & DrawBlendOptions;
export type PolygonOutlineDraw = Readonly<{ points: readonly PolygonPoint[]; color: Color; stroke_width: number; opacity?: number }> &
  DrawBlendOptions;
export type OwnedGeometryDraw = Readonly<{ geometry: GeometryHandle; owner: GeometryOwner; color: Color; opacity?: number }> &
  DrawBlendOptions;
export type TextDraw = Readonly<{ font: WebGpuFont; text: string; options?: TextDrawOptions }>;

export type RenderCommand = Readonly<
  | { kind: "texture"; draw: TextureDraw }
  | { kind: "rectangle"; draw: RectangleDraw }
  | { kind: "circle"; draw: CircleDraw }
  | { kind: "line"; draw: LineDraw }
  | { kind: "rectangle_outline"; draw: RectangleOutlineDraw }
  | { kind: "circle_outline"; draw: CircleOutlineDraw }
  | { kind: "triangles"; draw: TriangleDraw }
  | { kind: "stroke"; draw: StrokeDraw }
  | { kind: "polygon"; draw: PolygonDraw }
  | { kind: "polygon_outline"; draw: PolygonOutlineDraw }
  | { kind: "geometry"; draw: OwnedGeometryDraw }
  | { kind: "text"; draw: TextDraw }
>;

export type RenderFrame = Readonly<{
  draw_commands: (commands: readonly RenderCommand[]) => void;
  set_target: (target?: WebGpuRenderTarget) => void;
  submit: () => Promise<void>;
  capture: () => Promise<Uint8Array>;
}>;

export type WebGpuRenderer = Readonly<{
  begin_frame: (clear_color?: ClearColor) => RenderFrame;
  clear: (color: ClearColor) => Promise<Uint8Array>;
  create_texture: (pixels: Uint8Array, width: number, height: number, options?: TextureFilteringOptions) => WebGpuTexture;
  create_render_target: (options: RenderTargetOptions) => WebGpuRenderTarget;
  create_texture_from_image: (image: CanvasImageSource, width: number, height: number, options?: TextureFilteringOptions) => WebGpuTexture;
  create_texture_from_blob: (source: Blob, options?: TextureFilteringOptions, signal?: AbortSignal) => Promise<WebGpuTexture>;
  create_font_from_url: (source: string, options?: FontOptions) => Promise<WebGpuFont>;
  device_lost?: PromiseLike<unknown>;
  draw_texture: (texture: WebGpuTexture | WebGpuRenderTarget, options?: TextureDrawOptions) => Promise<Uint8Array>;
  draw_textures: (draws: readonly TextureDraw[]) => Promise<Uint8Array>;
  draw_text: (font: WebGpuFont, text: string, options?: TextDrawOptions) => Promise<Uint8Array>;
  draw_commands: (commands: readonly RenderCommand[]) => Promise<Uint8Array>;
  resize: (viewport: ViewportSize) => void;
  get_viewport: () => ViewportSize;
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

const resolve_blend_mode = (value: unknown): BlendMode => {
  if (value === undefined || value === "normal" || value === "additive" || value === "multiply") {
    return value ?? "normal";
  }
  const label = typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? value.toString() : "unknown";
  throw new RangeError(`unsupported blend mode: ${label}`);
};

const copy_bytes_per_row_alignment = 256;

const default_clear_color: ClearColor = Object.freeze({ red: 0, green: 0, blue: 0, alpha: 1 });

const get_readback_bytes_per_row = (width: number): number =>
  Math.ceil((width * 4) / copy_bytes_per_row_alignment) * copy_bytes_per_row_alignment;

const textured_shader = /* wgsl */ `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) tint: vec4f,
  @location(2) shape: vec4f,
};

@vertex
fn vertex_main(
  @location(0) position: vec2f,
  @location(1) uv: vec2f,
  @location(2) tint: vec4f,
  @location(3) shape: vec4f,
) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4f(position, 0.0, 1.0);
  output.uv = uv;
  output.tint = tint;
  output.shape = shape;
  return output;
}

@group(0) @binding(0) var texture_sampler: sampler;
@group(0) @binding(1) var texture_data: texture_2d<f32>;

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
  if (input.shape.x > 0.5 && input.shape.x < 1.5) {
    let centered = input.uv - vec2f(0.5, 0.5);
    if (dot(centered, centered) > 0.25) {
      discard;
    }
  }
  if (input.shape.x > 1.5 && input.shape.x < 2.5) {
    let edge_x = min(input.uv.x, 1.0 - input.uv.x);
    let edge_y = min(input.uv.y, 1.0 - input.uv.y);
    if (edge_x > input.shape.y && edge_y > input.shape.z) {
      discard;
    }
  }
  if (input.shape.x > 2.5) {
    let radial_distance = distance(input.uv, vec2f(0.5, 0.5));
    if (radial_distance < 0.5 - input.shape.y || radial_distance > 0.5) {
      discard;
    }
  }
  return textureSample(texture_data, texture_sampler, input.uv) * input.tint;
}
`;

const normalize_readback = (
  pixels: Uint8Array,
  width: number,
  height: number,
  format: GPUTextureFormat,
  readback_bytes_per_row: number,
): Uint8Array => {
  if (format !== "bgra8unorm") {
    return pixels;
  }
  const normalized = new Uint8Array(pixels);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const offset = row * readback_bytes_per_row + column * 4;
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

  let current_viewport =
    options.viewport ?? calculate_responsive_viewport({ css_width: options.width, css_height: options.height, device_pixel_ratio: 1 });
  let surface_width = current_viewport.physical_width;
  let surface_height = current_viewport.physical_height;
  let logical_width = current_viewport.logical_width;
  let logical_height = current_viewport.logical_height;
  let device_scale_x = current_viewport.physical_width / current_viewport.css_width;
  let device_scale_y = current_viewport.physical_height / current_viewport.css_height;
  options.canvas.width = surface_width;
  options.canvas.height = surface_height;
  const format = navigator.gpu.getPreferredCanvasFormat();

  context.configure({ device, format, alphaMode: "opaque", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
  const resources: ResourceOwner = create_resource_owner();
  type RenderTargetState = Readonly<{
    resource: ResourceHandle<GPUTexture>;
    width: number;
    height: number;
    filtering: ReturnType<typeof resolve_texture_filtering>;
  }>;
  const render_target_states = new WeakMap<WebGpuRenderTarget, RenderTargetState>();
  const pipeline_bind_group_layout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float", viewDimension: "2d", multisampled: false } },
    ],
  });
  const pipeline_layout = device.createPipelineLayout({ bindGroupLayouts: [pipeline_bind_group_layout] });
  const blend_state = (blend_mode: BlendMode): GPUBlendState => {
    if (blend_mode === "additive") {
      return {
        color: { srcFactor: "src-alpha", dstFactor: "one", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
      };
    }
    if (blend_mode === "multiply") {
      return {
        color: { srcFactor: "dst", dstFactor: "one-minus-src-alpha", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
      };
    }
    return {
      color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
      alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
    };
  };
  const create_pipeline = (blend_mode: BlendMode): GPURenderPipeline =>
    device.createRenderPipeline({
      layout: pipeline_layout,
      vertex: {
        module: device.createShaderModule({ code: textured_shader }),
        entryPoint: "vertex_main",
        buffers: [
          {
            arrayStride: 48,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x2" },
              { shaderLocation: 1, offset: 8, format: "float32x2" },
              { shaderLocation: 2, offset: 16, format: "float32x4" },
              { shaderLocation: 3, offset: 32, format: "float32x4" },
            ],
          },
        ],
      },
      fragment: {
        module: device.createShaderModule({ code: textured_shader }),
        entryPoint: "fragment_main",
        targets: [{ format, blend: blend_state(blend_mode) }],
      },
      primitive: { topology: "triangle-list" },
    });
  const pipelines = new Map<BlendMode, GPURenderPipeline>([
    ["normal", create_pipeline("normal")],
    ["additive", create_pipeline("additive")],
    ["multiply", create_pipeline("multiply")],
  ]);
  const pipeline = pipelines.get("normal");
  if (pipeline === undefined) throw new Error("normal blend pipeline was not created");
  let disposed = false;
  const device_lost = device.lost.then((info) => info);
  let solid_texture: WebGpuTexture | undefined;
  const cached_geometry_buffers = new WeakMap<
    object,
    { snapshot: PreparedGeometry; buffer: GPUBuffer; vertex_count: number; stop_observing: () => void }
  >();
  const persistent_geometry_buffers = new Set<GPUBuffer>();
  const persistent_geometry_observers = new Set<() => void>();
  const sampler_cache = new Map<string, GPUSampler>();
  type ReusableBuffer = { buffer: GPUBuffer; capacity: number; usage: number; in_use: boolean };
  const reusable_buffers: ReusableBuffer[] = [];
  type BindGroupCache = WeakMap<GPUTexture, WeakMap<GPUSampler, GPUBindGroup>>;
  let bind_group_cache: BindGroupCache = new WeakMap();

  const acquire_reusable_buffer = (required_size: number, usage: number): ReusableBuffer => {
    const candidate = reusable_buffers.find((entry) => !entry.in_use && entry.usage === usage && entry.capacity >= required_size);
    if (candidate !== undefined) {
      candidate.in_use = true;
      return candidate;
    }
    const capacity = Math.max(256, 2 ** Math.ceil(Math.log2(required_size)));
    const entry = { buffer: device.createBuffer({ size: capacity, usage }), capacity, usage, in_use: true };
    reusable_buffers.push(entry);
    return entry;
  };

  const release_reusable_buffer = (entry: ReusableBuffer | undefined): void => {
    if (entry !== undefined) {
      entry.in_use = false;
    }
  };

  const get_bind_group = (texture: GPUTexture, sampler: GPUSampler): GPUBindGroup => {
    let sampler_groups = bind_group_cache.get(texture);
    if (sampler_groups === undefined) {
      sampler_groups = new WeakMap();
      bind_group_cache.set(texture, sampler_groups);
    }
    const cached = sampler_groups.get(sampler);
    if (cached !== undefined) {
      return cached;
    }
    const bind_group = device.createBindGroup({
      layout: pipeline_bind_group_layout,
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture.createView() },
      ],
    });
    sampler_groups.set(sampler, bind_group);
    return bind_group;
  };

  const submit_and_readback = async (encoder: GPUCommandEncoder, texture: GPUTexture): Promise<Uint8Array> => {
    const readback_bytes_per_row = get_readback_bytes_per_row(surface_width);
    const readback = device.createBuffer({
      size: readback_bytes_per_row * surface_height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    encoder.copyTextureToBuffer(
      { texture },
      { buffer: readback, bytesPerRow: readback_bytes_per_row, rowsPerImage: surface_height },
      { width: surface_width, height: surface_height, depthOrArrayLayers: 1 },
    );
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    await readback.mapAsync(GPUMapMode.READ);
    const mapped = new Uint8Array(readback.getMappedRange());
    const pixels = normalize_readback(new Uint8Array(mapped), surface_width, surface_height, format, readback_bytes_per_row);
    readback.unmap();
    readback.destroy();
    return pixels;
  };

  const submit_without_readback = async (encoder: GPUCommandEncoder): Promise<void> => {
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
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

    device.queue.writeTexture(
      { texture },
      pixels,
      { bytesPerRow: width * 4, rowsPerImage: height },
      { width, height, depthOrArrayLayers: 1 },
    );

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

  const create_render_target = (target_options: RenderTargetOptions): WebGpuRenderTarget => {
    const { width, height } = target_options;
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      throw new RangeError("render target dimensions must be positive integers");
    }
    const filtering = resolve_texture_filtering(target_options.filtering);
    const texture = device.createTexture({
      size: { width, height },
      format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    const resource = resources.acquire(texture, (resource_to_destroy) => {
      resource_to_destroy.destroy();
    });
    const target = Object.freeze({ width, height, filtering, release: resource.release });
    render_target_states.set(target, { resource, width, height, filtering });
    return target;
  };

  const create_texture_from_image = (
    image: CanvasImageSource,
    width: number,
    height: number,
    filtering: TextureFilteringOptions = {},
  ): WebGpuTexture => {
    const preparation_canvas = document.createElement("canvas");
    preparation_canvas.width = width;
    preparation_canvas.height = height;
    const preparation_context = preparation_canvas.getContext("2d");
    if (preparation_context === null) {
      throw new Error("Canvas 2D image preparation is unavailable");
    }
    preparation_context.clearRect(0, 0, width, height);
    preparation_context.drawImage(image, 0, 0, width, height);
    const pixels = preparation_context.getImageData(0, 0, width, height).data;
    return create_texture(new Uint8Array(pixels), width, height, filtering);
  };

  const create_texture_from_blob = async (
    source: Blob,
    filtering: TextureFilteringOptions = {},
    signal?: AbortSignal,
  ): Promise<WebGpuTexture> => {
    const bitmap = await decode_image_source(source, signal);
    try {
      return create_texture_from_image(bitmap, bitmap.width, bitmap.height, filtering);
    } finally {
      bitmap.close();
    }
  };

  const draw_texture = async (texture: WebGpuTexture | WebGpuRenderTarget, draw_options: TextureDrawOptions = {}): Promise<Uint8Array> => {
    return draw_textures([{ texture, options: draw_options }]);
  };

  type ResolvedTexture = Readonly<{
    resource: ResourceHandle<GPUTexture>;
    width: number;
    height: number;
    filtering: ReturnType<typeof resolve_texture_filtering>;
    borrowed_lease?: ResourceLease<GPUTexture>;
  }>;
  const resolve_texture = (
    texture: WebGpuTexture | WebGpuRenderTarget,
    target_leases?: ReadonlyMap<WebGpuRenderTarget, ResourceLease<GPUTexture>>,
  ): ResolvedTexture => {
    const target_state = render_target_states.get(texture);
    if ("resource" in texture) return texture;
    if (target_state === undefined) throw new Error("render target does not belong to this renderer");
    const borrowed_lease = target_leases?.get(texture);
    return borrowed_lease === undefined ? target_state : { ...target_state, borrowed_lease };
  };

  const render_commands = async (
    commands: readonly RenderCommand[],
    submission: Readonly<{
      readback: boolean;
      allow_empty: boolean;
      clear_color: ClearColor;
      clear: boolean;
      target?: Readonly<{ lease: ResourceLease<GPUTexture>; width: number; height: number }>;
      target_leases?: ReadonlyMap<WebGpuRenderTarget, ResourceLease<GPUTexture>>;
    }>,
  ): Promise<Uint8Array | undefined> => {
    if (disposed) {
      throw new Error("WebGPU renderer is disposed");
    }
    if (commands.length === 0 && !submission.allow_empty) {
      throw new RangeError("at least one texture draw is required");
    }
    type GeometryDraw = Readonly<{ geometry: TriangleDraw; handle?: GeometryHandle; snapshot?: PreparedGeometry }>;
    const expanded_commands = commands.flatMap((command): readonly RenderCommand[] => {
      if (command.kind !== "text") return [command];
      const { font, text, options = {} } = command.draw;
      font.prepare(text);
      const size = options.size ?? font.size;
      if (!Number.isFinite(size) || size <= 0) throw new RangeError("text size must be finite and positive");
      const color = options.color ?? { red: 1, green: 1, blue: 1, alpha: 1 };
      const scale = size / font.size;
      const characters = Array.from(text);
      const total_width = characters.reduce((width, character) => width + font.get_glyph(character).advance * scale, 0);
      const origin = options.origin ?? { x: 0, y: 0 };
      const start_x = (options.x ?? 0) - total_width * origin.x;
      const start_y = (options.y ?? 0) - size * origin.y;
      let cursor_x = start_x;
      return characters.map((character): RenderCommand => {
        const glyph = font.get_glyph(character);
        const draw: TextureDraw = {
          texture: font.get_glyph_texture(character),
          options: {
            x: cursor_x,
            y: start_y,
            width: glyph.width * scale,
            height: glyph.height * scale,
            tint: color,
            opacity: options.opacity,
            blend_mode: options.blend_mode,
          },
        };
        cursor_x += glyph.advance * scale;
        return { kind: "texture", draw };
      });
    });
    const raw_draws = expanded_commands.map((command): TextureDraw | GeometryDraw => {
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
      if (command.kind === "circle_outline") {
        const circle = validate_circle(command.draw.circle);
        const stroke_width = validate_stroke_width(command.draw.stroke_width);
        if (circle.radius === 0 || stroke_width === 0) {
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
            shape_kind: 3,
            shape_x: stroke_width / (circle.radius * 2),
          },
        };
      }
      if (command.kind === "triangles") {
        if (command.draw.vertices.length === 0 || command.draw.indices.length === 0 || command.draw.indices.length % 3 !== 0) {
          throw new RangeError("triangle geometry must contain indexed triangles");
        }
        command.draw.vertices.forEach((vertex) => {
          if (!Number.isFinite(vertex.x) || !Number.isFinite(vertex.y)) throw new RangeError("triangle vertices must be finite");
        });
        command.draw.indices.forEach((index) => {
          if (!Number.isInteger(index) || index < 0 || index >= command.draw.vertices.length) {
            throw new RangeError("triangle index must reference a vertex");
          }
        });
        assert_color(command.draw.color);
        const opacity = command.draw.opacity ?? 1;
        if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
          throw new RangeError("opacity must be finite and between zero and one");
        return { geometry: command.draw };
      }
      if (command.kind === "geometry") {
        const prepared = command.draw.geometry.read(command.draw.owner);
        assert_color(command.draw.color);
        const opacity = command.draw.opacity ?? 1;
        if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
          throw new RangeError("opacity must be finite and between zero and one");
        return {
          geometry: {
            vertices: prepared.vertices,
            indices: prepared.indices,
            color: command.draw.color,
            opacity,
          },
          handle: command.draw.geometry,
          snapshot: prepared,
        };
      }
      if (command.kind === "polygon") {
        const geometry = triangulate_polygon(command.draw.points);
        assert_color(command.draw.color);
        const opacity = command.draw.opacity ?? 1;
        if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
          throw new RangeError("opacity must be finite and between zero and one");
        return {
          geometry: {
            vertices: geometry.vertices,
            indices: geometry.indices,
            color: command.draw.color,
            opacity,
          },
        };
      }
      if (command.kind === "polygon_outline") {
        const polygon = create_polygon(command.draw.points).get_points();
        const geometry = create_stroke_geometry([{ points: [...polygon, polygon[0]], closed: true }], command.draw.stroke_width);
        assert_color(command.draw.color);
        const opacity = command.draw.opacity ?? 1;
        if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
          throw new RangeError("opacity must be finite and between zero and one");
        return {
          geometry: {
            vertices: geometry.vertices,
            indices: geometry.indices,
            color: command.draw.color,
            opacity,
          },
        };
      }
      if (command.kind === "stroke") {
        const geometry = create_stroke_geometry(command.draw.subpaths, command.draw.width);
        assert_color(command.draw.color);
        const opacity = command.draw.opacity ?? 1;
        if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
          throw new RangeError("opacity must be finite and between zero and one");
        return {
          geometry: {
            vertices: geometry.vertices,
            indices: geometry.indices,
            color: command.draw.color,
            opacity,
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
      if (command.kind !== "rectangle") {
        throw new Error("unsupported render command");
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
    const draws = raw_draws.map((draw, index) => {
      const command = expanded_commands[index];
      const blend_mode =
        command.kind === "texture"
          ? command.draw.options?.blend_mode
          : command.kind === "text"
            ? command.draw.options?.blend_mode
            : command.draw.blend_mode;
      return { ...draw, blend_mode: resolve_blend_mode(blend_mode) };
    });
    const canvas_width = logical_width;
    const canvas_height = logical_height;
    const active_camera = get_active_camera();
    const viewport = current_viewport;
    const output_width = submission.target?.width ?? surface_width;
    const output_height = submission.target?.height ?? surface_height;
    const output_content_width = submission.target === undefined ? viewport.content_width * device_scale_x : output_width;
    const output_content_height = submission.target === undefined ? viewport.content_height * device_scale_y : output_height;
    const output_offset_x = submission.target === undefined ? viewport.offset_x * device_scale_x : 0;
    const output_offset_y = submission.target === undefined ? viewport.offset_y * device_scale_y : 0;
    const encoded_draws = draws.map((draw) => {
      if ("geometry" in draw) {
        const tint = draw.geometry.color;
        const opacity = draw.geometry.opacity ?? 1;
        const to_clip_point = (point: PolygonPoint): [number, number] => {
          const screen_point = active_camera?.world_to_screen(point) ?? point;
          const physical_x = (screen_point.x * output_content_width) / canvas_width;
          const physical_y = (screen_point.y * output_content_height) / canvas_height;
          return [((physical_x + output_offset_x) / output_width) * 2 - 1, 1 - ((physical_y + output_offset_y) / output_height) * 2];
        };
        const vertex_data = new Float32Array(
          draw.geometry.indices.flatMap((index) => {
            const [x, y] = to_clip_point(draw.geometry.vertices[index]);
            return [x, y, 0, 0, tint.red, tint.green, tint.blue, tint.alpha * opacity, 0, 0, 0, 0];
          }),
        );
        return {
          texture: resolve_texture(ensure_solid_texture(), submission.target_leases),
          tint,
          opacity,
          vertex_data,
          vertex_count: draw.geometry.indices.length,
          geometry_key: draw.handle,
          geometry_snapshot: draw.snapshot,
          region: { x: 0, y: 0, width: 1, height: 1 },
          shape_kind: 0,
          shape_x: 0,
          shape_y: 0,
          blend_mode: draw.blend_mode,
        };
      }
      const source_texture = resolve_texture(draw.texture, submission.target_leases);
      const { options = {} } = draw;
      const texture = source_texture;
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
      const to_clip = ([point_x, point_y]: [number, number]): [number, number] => {
        const screen_point = active_camera?.world_to_screen({ x: point_x, y: point_y }) ?? { x: point_x, y: point_y };
        const physical_x = (screen_point.x * output_content_width) / canvas_width;
        const physical_y = (screen_point.y * output_content_height) / canvas_height;
        return [((physical_x + output_offset_x) / output_width) * 2 - 1, 1 - ((physical_y + output_offset_y) / output_height) * 2];
      };
      const positions = corners.map(to_clip);
      const u0 = region.x / texture.width;
      const v0 = region.y / texture.height;
      const u1 = (region.x + region.width) / texture.width;
      const v1 = (region.y + region.height) / texture.height;
      const uvs = options.flip_x ? [u1, v0, u0, v0, u0, v1, u1, v1] : [u0, v0, u1, v0, u1, v1, u0, v1];
      const flipped_uvs = options.flip_y ? [uvs[0], v1, uvs[2], v1, uvs[4], v0, uvs[6], v0] : uvs;
      const shape_kind = options.shape_kind ?? 0;
      const shape_x = options.shape_x ?? 0;
      const shape_y = options.shape_y ?? 0;
      const vertex_tint = [tint.red, tint.green, tint.blue, tint.alpha * opacity];
      const vertex_shape = [shape_kind, shape_x, shape_y, 0];
      const vertex_data = new Float32Array([
        ...positions[0],
        flipped_uvs[0],
        flipped_uvs[1],
        ...vertex_tint,
        ...vertex_shape,
        ...positions[1],
        flipped_uvs[2],
        flipped_uvs[3],
        ...vertex_tint,
        ...vertex_shape,
        ...positions[2],
        flipped_uvs[4],
        flipped_uvs[5],
        ...vertex_tint,
        ...vertex_shape,
        ...positions[0],
        flipped_uvs[0],
        flipped_uvs[1],
        ...vertex_tint,
        ...vertex_shape,
        ...positions[2],
        flipped_uvs[4],
        flipped_uvs[5],
        ...vertex_tint,
        ...vertex_shape,
        ...positions[3],
        flipped_uvs[6],
        flipped_uvs[7],
        ...vertex_tint,
        ...vertex_shape,
      ]);
      return {
        texture,
        tint,
        opacity,
        vertex_data,
        vertex_count: 6,
        region,
        shape_kind,
        shape_x,
        shape_y,
        blend_mode: draw.blend_mode,
      };
    });
    const leases = encoded_draws.map(({ texture }) => texture.borrowed_lease ?? texture.resource.acquire_lease());
    const owned_leases = encoded_draws
      .map(({ texture }, index) => (texture.borrowed_lease === undefined ? leases[index] : undefined))
      .filter((lease): lease is ResourceLease<GPUTexture> => lease !== undefined);
    const samplers = encoded_draws.map(({ texture }) => {
      const key = `${texture.filtering.magnification}:${texture.filtering.minification}`;
      const cached = sampler_cache.get(key);
      if (cached !== undefined) {
        return cached;
      }
      const sampler = device.createSampler({ magFilter: texture.filtering.magnification, minFilter: texture.filtering.minification });
      sampler_cache.set(key, sampler);
      return sampler;
    });
    type DrawBatch =
      | { kind: "geometry"; draw_index: number; vertex_data: Float32Array; vertex_count: number; blend_mode: BlendMode }
      | { kind: "texture"; draw_indices: number[]; vertex_parts: Float32Array[]; vertex_count: number; blend_mode: BlendMode };
    const batches: DrawBatch[] = [];
    encoded_draws.forEach((draw, index) => {
      if (draw.geometry_key !== undefined && draw.geometry_snapshot !== undefined) {
        batches.push({
          kind: "geometry",
          draw_index: index,
          vertex_data: draw.vertex_data,
          vertex_count: draw.vertex_count,
          blend_mode: draw.blend_mode,
        });
        return;
      }
      const previous = batches.at(-1);
      if (
        previous?.kind === "texture" &&
        previous.blend_mode === draw.blend_mode &&
        leases[previous.draw_indices[0] ?? index].resource === leases[index].resource &&
        samplers[previous.draw_indices[0] ?? index] === samplers[index]
      ) {
        previous.draw_indices.push(index);
        previous.vertex_parts.push(draw.vertex_data);
        previous.vertex_count += draw.vertex_count;
        return;
      }
      batches.push({
        kind: "texture",
        draw_indices: [index],
        vertex_parts: [draw.vertex_data],
        vertex_count: draw.vertex_count,
        blend_mode: draw.blend_mode,
      });
    });
    const dynamic_vertex_size = batches.reduce(
      (size, batch) => (batch.kind === "texture" ? size + batch.vertex_parts.reduce((total, part) => total + part.byteLength, 0) : size),
      0,
    );
    const dynamic_vertex_storage =
      dynamic_vertex_size === 0 ? undefined : acquire_reusable_buffer(dynamic_vertex_size, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
    let dynamic_vertex_offset = 0;
    const buffer_entries = batches.map((batch) => {
      if (batch.kind === "geometry") {
        const draw = encoded_draws[batch.draw_index];
        if (draw.geometry_key === undefined || draw.geometry_snapshot === undefined) {
          throw new Error("geometry batch is missing owned geometry");
        }
        const geometry_key = draw.geometry_key;
        const geometry_snapshot = draw.geometry_snapshot;
        const cached = cached_geometry_buffers.get(geometry_key);
        if (cached?.snapshot === geometry_snapshot && cached.vertex_count === batch.vertex_count) {
          return { buffer: cached.buffer, offset: 0, vertex_count: batch.vertex_count };
        }
        if (cached !== undefined) {
          cached.stop_observing();
          cached.buffer.destroy();
          persistent_geometry_buffers.delete(cached.buffer);
        }
        const buffer = device.createBuffer({ size: batch.vertex_data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        device.queue.writeBuffer(buffer, 0, batch.vertex_data);
        const entry: { snapshot: PreparedGeometry; buffer: GPUBuffer; vertex_count: number; stop_observing: () => void } = {
          snapshot: geometry_snapshot,
          buffer,
          vertex_count: batch.vertex_count,
          stop_observing: () => undefined,
        };
        const release_observer = (): void => {
          if (cached_geometry_buffers.get(geometry_key) !== entry) return;
          cached_geometry_buffers.delete(geometry_key);
          persistent_geometry_buffers.delete(buffer);
          persistent_geometry_observers.delete(entry.stop_observing);
          buffer.destroy();
        };
        entry.stop_observing = geometry_key.on_release(release_observer);
        persistent_geometry_observers.add(entry.stop_observing);
        cached_geometry_buffers.set(geometry_key, entry);
        persistent_geometry_buffers.add(buffer);
        return { buffer, offset: 0, vertex_count: batch.vertex_count };
      }
      if (dynamic_vertex_storage === undefined) {
        throw new Error("dynamic vertex storage was not allocated");
      }
      const offset = dynamic_vertex_offset;
      for (const part of batch.vertex_parts) {
        device.queue.writeBuffer(dynamic_vertex_storage.buffer, dynamic_vertex_offset, part);
        dynamic_vertex_offset += part.byteLength;
      }
      return { buffer: dynamic_vertex_storage.buffer, offset, vertex_count: batch.vertex_count };
    });
    const bind_groups = batches.map((batch) => {
      const draw_index = batch.kind === "geometry" ? batch.draw_index : batch.draw_indices[0];
      return get_bind_group(leases[draw_index].resource, samplers[draw_index]);
    });

    const target = submission.target?.lease.resource ?? context.getCurrentTexture();
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: target.createView(),
          clearValue: {
            r: submission.clear_color.red,
            g: submission.clear_color.green,
            b: submission.clear_color.blue,
            a: submission.clear_color.alpha,
          },
          loadOp: submission.clear ? "clear" : "load",
          storeOp: "store",
        },
      ],
    });
    batches.forEach((batch, index) => {
      const batch_pipeline = pipelines.get(batch.blend_mode);
      if (batch_pipeline === undefined) throw new Error(`blend pipeline is missing: ${batch.blend_mode}`);
      pass.setPipeline(batch_pipeline);
      pass.setBindGroup(0, bind_groups[index]);
      pass.setVertexBuffer(0, buffer_entries[index].buffer, buffer_entries[index].offset);
      pass.draw(buffer_entries[index].vertex_count);
    });
    pass.end();

    try {
      if (submission.readback) {
        return await submit_and_readback(encoder, target);
      }
      await submit_without_readback(encoder);
      return undefined;
    } finally {
      owned_leases.forEach((lease) => {
        lease.release();
      });
      release_reusable_buffer(dynamic_vertex_storage);
    }
  };

  const draw_commands = async (commands: readonly RenderCommand[]): Promise<Uint8Array> => {
    const pixels = await render_commands(commands, { readback: true, allow_empty: false, clear: true, clear_color: default_clear_color });
    if (pixels === undefined) {
      throw new Error("diagnostic render did not produce a capture");
    }
    return pixels;
  };

  const begin_frame = (clear_color: ClearColor = default_clear_color): RenderFrame => {
    if (disposed) {
      throw new Error("WebGPU renderer is disposed");
    }
    assert_color(clear_color);
    type FrameGroup = Readonly<{
      commands: RenderCommand[];
      target?: Readonly<{ state: RenderTargetState; lease: ResourceLease<GPUTexture> }>;
    }>;
    const groups: FrameGroup[] = [{ commands: [] }];
    const target_leases = new Map<WebGpuRenderTarget, ResourceLease<GPUTexture>>();
    let current_group = groups[0];
    let completed = false;
    let capture_requested = false;
    let capture_promise: Promise<Uint8Array> | undefined;
    let resolve_capture: ((pixels: Uint8Array) => void) | undefined;
    let reject_capture: ((cause: unknown) => void) | undefined;
    const assert_open = (): void => {
      if (completed) {
        throw new Error("render frame is already completed");
      }
    };
    const draw_frame_commands = (next_commands: readonly RenderCommand[]): void => {
      assert_open();
      current_group.commands.push(...next_commands);
    };
    const set_target = (target?: WebGpuRenderTarget): void => {
      assert_open();
      if (target === undefined) {
        current_group = { commands: [] };
        groups.push(current_group);
        return;
      }
      const state = render_target_states.get(target);
      if (state === undefined) {
        throw new Error("render target does not belong to this renderer");
      }
      const existing_lease = target_leases.get(target);
      const lease = existing_lease ?? state.resource.acquire_lease();
      if (existing_lease === undefined) target_leases.set(target, lease);
      current_group = { commands: [], target: { state, lease } };
      groups.push(current_group);
    };
    const submit = async (): Promise<void> => {
      assert_open();
      completed = true;
      try {
        const last_canvas_group = groups.findLastIndex((group) => group.target === undefined);
        const seen_targets = new Set<object>();
        const canvas_key = {};
        let captured_pixels: Uint8Array | undefined;
        for (const [index, group] of groups.entries()) {
          const target_key = group.target?.state ?? canvas_key;
          const clear = !seen_targets.has(target_key);
          seen_targets.add(target_key);
          const pixels = await render_commands(group.commands, {
            readback: capture_requested && index === last_canvas_group,
            allow_empty: true,
            clear,
            clear_color,
            target:
              group.target === undefined
                ? undefined
                : { lease: group.target.lease, width: group.target.state.width, height: group.target.state.height },
            target_leases,
          });
          if (pixels !== undefined) captured_pixels = pixels;
        }
        if (capture_requested && captured_pixels !== undefined) {
          resolve_capture?.(captured_pixels);
        }
      } catch (cause) {
        reject_capture?.(cause);
        throw cause;
      } finally {
        target_leases.forEach((lease) => {
          lease.release();
        });
        target_leases.clear();
      }
    };
    const capture = (): Promise<Uint8Array> => {
      assert_open();
      if (capture_promise === undefined) {
        capture_requested = true;
        capture_promise = new Promise<Uint8Array>((resolve, reject) => {
          resolve_capture = resolve;
          reject_capture = reject;
        });
      }
      return capture_promise;
    };
    return Object.freeze({ draw_commands: draw_frame_commands, set_target, submit, capture });
  };

  const draw_textures = async (draws: readonly TextureDraw[]): Promise<Uint8Array> =>
    draw_commands(draws.map((draw) => ({ kind: "texture", draw })));

  const draw_text = async (font: WebGpuFont, text: string, options?: TextDrawOptions): Promise<Uint8Array> =>
    draw_commands([{ kind: "text", draw: { font, text, options } }]);

  function ensure_solid_texture(): WebGpuTexture {
    solid_texture ??= create_texture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    return solid_texture;
  }

  const resize = (viewport: ViewportSize): void => {
    if (disposed) {
      throw new Error("WebGPU renderer is disposed");
    }
    current_viewport = viewport;
    surface_width = viewport.physical_width;
    surface_height = viewport.physical_height;
    logical_width = viewport.logical_width;
    logical_height = viewport.logical_height;
    device_scale_x = viewport.physical_width / viewport.css_width;
    device_scale_y = viewport.physical_height / viewport.css_height;
    options.canvas.width = surface_width;
    options.canvas.height = surface_height;

    context.configure({ device, format, alphaMode: "opaque", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
  };

  const get_viewport = (): ViewportSize => current_viewport;

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    resources.dispose();
    persistent_geometry_observers.forEach((stop_observing) => {
      stop_observing();
    });
    persistent_geometry_observers.clear();
    persistent_geometry_buffers.forEach((buffer) => {
      buffer.destroy();
    });
    persistent_geometry_buffers.clear();
    sampler_cache.clear();
    reusable_buffers.forEach(({ buffer }) => {
      buffer.destroy();
    });
    reusable_buffers.length = 0;
    bind_group_cache = new WeakMap();
    context.unconfigure();
    device.destroy();
  };

  const renderer_api: WebGpuRenderer = Object.freeze({
    begin_frame,
    clear,
    create_texture,
    create_render_target,
    create_texture_from_image,
    create_texture_from_blob,
    create_font_from_url: (source: string, options?: FontOptions) => create_webgpu_font(renderer_api, source, options),
    device_lost,
    draw_texture,
    draw_textures,
    draw_text,
    draw_commands,
    resize,
    get_viewport,
    dispose,
  });
  return renderer_api;
};
