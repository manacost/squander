import { resolve_texture_filtering, type TextureFilteringOptions } from "./texture_filtering.js";
import { decode_image_source } from "./image_loading.js";
import { create_resource_owner, type ResourceHandle, type ResourceOwner } from "./resource_ownership.js";
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
export type CircleOutlineDraw = Readonly<{ circle: Circle; color: Color; stroke_width: number; opacity?: number }>;
export type TriangleDraw = Readonly<{ vertices: readonly PolygonPoint[]; indices: readonly number[]; color: Color; opacity?: number }>;
export type StrokeDraw = Readonly<{ subpaths: readonly FlattenedSubpath[]; width: number; color: Color; opacity?: number }>;
export type PolygonDraw = Readonly<{ points: readonly PolygonPoint[]; color: Color; opacity?: number }>;
export type PolygonOutlineDraw = Readonly<{ points: readonly PolygonPoint[]; color: Color; stroke_width: number; opacity?: number }>;
export type OwnedGeometryDraw = Readonly<{ geometry: GeometryHandle; owner: GeometryOwner; color: Color; opacity?: number }>;
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

export type WebGpuRenderer = Readonly<{
  clear: (color: ClearColor) => Promise<Uint8Array>;
  create_texture: (pixels: Uint8Array, width: number, height: number, options?: TextureFilteringOptions) => WebGpuTexture;
  create_texture_from_image: (image: CanvasImageSource, width: number, height: number, options?: TextureFilteringOptions) => WebGpuTexture;
  create_texture_from_blob: (source: Blob, options?: TextureFilteringOptions, signal?: AbortSignal) => Promise<WebGpuTexture>;
  create_font_from_url: (source: string, options?: FontOptions) => Promise<WebGpuFont>;
  draw_texture: (texture: WebGpuTexture, options?: TextureDrawOptions) => Promise<Uint8Array>;
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
  if (draw_uniforms.shape.x > 0.5 && draw_uniforms.shape.x < 1.5) {
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
  if (draw_uniforms.shape.x > 2.5) {
    let radial_distance = distance(input.uv, vec2f(0.5, 0.5));
    if (radial_distance < 0.5 - draw_uniforms.shape.y || radial_distance > 0.5) {
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
  const cached_geometry_buffers = new WeakMap<
    object,
    { snapshot: PreparedGeometry; buffer: GPUBuffer; vertex_count: number; stop_observing: () => void }
  >();
  const persistent_geometry_buffers = new Set<GPUBuffer>();
  const persistent_geometry_observers = new Set<() => void>();

  const submit_and_readback = async (encoder: GPUCommandEncoder, texture: GPUTexture): Promise<Uint8Array> => {
    const readback = device.createBuffer({
      size: bytes_per_row * surface_height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    encoder.copyTextureToBuffer(
      { texture },
      { buffer: readback, bytesPerRow: bytes_per_row, rowsPerImage: surface_height },
      { width: surface_width, height: surface_height, depthOrArrayLayers: 1 },
    );
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    await readback.mapAsync(GPUMapMode.READ);
    const mapped = new Uint8Array(readback.getMappedRange());
    const pixels = normalize_readback(new Uint8Array(mapped), surface_width, surface_height, format);
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
    type GeometryDraw = Readonly<{ geometry: TriangleDraw; handle?: GeometryHandle; snapshot?: PreparedGeometry }>;
    const expanded_commands = commands.flatMap((command): readonly RenderCommand[] => {
      if (command.kind !== "text") return [command];
      const { font, text, options = {} } = command.draw;
      font.prepare(text);
      const size = options.size ?? font.size;
      if (!Number.isFinite(size) || size <= 0) throw new RangeError("text size must be finite and positive");
      const color = options.color ?? { red: 1, green: 1, blue: 1, alpha: 1 };
      const scale = size / font.size;
      const total_width = [...text].reduce((width, character) => width + font.get_glyph(character).advance * scale, 0);
      const origin = options.origin ?? { x: 0, y: 0 };
      const start_x = (options.x ?? 0) - total_width * origin.x;
      const start_y = (options.y ?? 0) - size * origin.y;
      let cursor_x = start_x;
      return [...text].map((character): RenderCommand => {
        const glyph = font.get_glyph(character);
        const draw: TextureDraw = {
          texture: font.atlas,
          options: {
            region: { x: glyph.x, y: glyph.y, width: glyph.width, height: glyph.height },
            x: cursor_x,
            y: start_y,
            width: glyph.width * scale,
            height: glyph.height * scale,
            tint: color,
            opacity: options.opacity,
          },
        };
        cursor_x += glyph.advance * scale;
        return { kind: "texture", draw };
      });
    });
    const draws = expanded_commands.map((command): TextureDraw | GeometryDraw => {
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
    const canvas_width = logical_width;
    const canvas_height = logical_height;
    const active_camera = get_active_camera();
    const viewport = current_viewport;
    const encoded_draws = draws.map((draw) => {
      if ("geometry" in draw) {
        const tint = draw.geometry.color;
        const opacity = draw.geometry.opacity ?? 1;
        const to_clip_point = (point: PolygonPoint): [number, number] => {
          const screen_point = active_camera?.world_to_screen(point) ?? point;
          const physical_x = ((screen_point.x * (viewport?.content_width ?? canvas_width)) / canvas_width) * device_scale_x;
          const physical_y = ((screen_point.y * (viewport?.content_height ?? canvas_height)) / canvas_height) * device_scale_y;
          const offset_x = (viewport?.offset_x ?? 0) * device_scale_x;
          const offset_y = (viewport?.offset_y ?? 0) * device_scale_y;
          return [((physical_x + offset_x) / surface_width) * 2 - 1, 1 - ((physical_y + offset_y) / surface_height) * 2];
        };
        const vertex_data = new Float32Array(
          draw.geometry.indices.flatMap((index) => {
            const [x, y] = to_clip_point(draw.geometry.vertices[index]);
            return [x, y, 0, 0];
          }),
        );
        return {
          texture: ensure_solid_texture(),
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
        };
      }
      const { texture, options = {} } = draw;
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
        const physical_x = ((screen_point.x * (viewport?.content_width ?? canvas_width)) / canvas_width) * device_scale_x;
        const physical_y = ((screen_point.y * (viewport?.content_height ?? canvas_height)) / canvas_height) * device_scale_y;
        const offset_x = (viewport?.offset_x ?? 0) * device_scale_x;
        const offset_y = (viewport?.offset_y ?? 0) * device_scale_y;
        return [((physical_x + offset_x) / surface_width) * 2 - 1, 1 - ((physical_y + offset_y) / surface_height) * 2];
      };
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
        vertex_count: 6,
        region,
        shape_kind: options.shape_kind ?? 0,
        shape_x: options.shape_x ?? 0,
        shape_y: options.shape_y ?? 0,
      };
    });
    const leases = encoded_draws.map(({ texture }) => texture.resource.acquire_lease());
    const buffer_entries = encoded_draws.map(({ vertex_data, geometry_key, geometry_snapshot, vertex_count }) => {
      if (geometry_key !== undefined && geometry_snapshot !== undefined) {
        const cached = cached_geometry_buffers.get(geometry_key);
        if (cached?.snapshot === geometry_snapshot && cached.vertex_count === vertex_count) {
          return { buffer: cached.buffer, persistent: true };
        }
        if (cached !== undefined) {
          cached.stop_observing();
          cached.buffer.destroy();
          persistent_geometry_buffers.delete(cached.buffer);
        }
        const buffer = device.createBuffer({ size: vertex_data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
        device.queue.writeBuffer(buffer, 0, vertex_data);
        const entry: { snapshot: PreparedGeometry; buffer: GPUBuffer; vertex_count: number; stop_observing: () => void } = {
          snapshot: geometry_snapshot,
          buffer,
          vertex_count,
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
        return { buffer, persistent: true };
      }
      const buffer = device.createBuffer({ size: vertex_data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      device.queue.writeBuffer(buffer, 0, vertex_data);
      return { buffer, persistent: false };
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
    encoded_draws.forEach(({ vertex_count }, index) => {
      pass.setBindGroup(0, bind_groups[index]);
      pass.setVertexBuffer(0, buffer_entries[index].buffer);
      pass.draw(vertex_count);
    });
    pass.end();
    /* eslint-enable @typescript-eslint/naming-convention -- End of the WebGPU external descriptor boundary. */
    try {
      return await submit_and_readback(encoder, target);
    } finally {
      leases.forEach((lease) => {
        lease.release();
      });
      buffer_entries.forEach(({ buffer, persistent }) => {
        if (!persistent) buffer.destroy();
      });
      uniforms.forEach((uniform) => {
        uniform.destroy();
      });
    }
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
    /* eslint-disable @typescript-eslint/naming-convention -- WebGPU configuration uses external camelCase names. */
    context.configure({ device, format, alphaMode: "opaque", usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC });
    /* eslint-enable @typescript-eslint/naming-convention -- End of the WebGPU external descriptor boundary. */
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
    context.unconfigure();
    device.destroy();
  };

  let renderer_api!: WebGpuRenderer;
  renderer_api = Object.freeze({
    clear,
    create_texture,
    create_texture_from_image,
    create_texture_from_blob,
    create_font_from_url: (source: string, options?: FontOptions) => create_webgpu_font(renderer_api, source, options),
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
