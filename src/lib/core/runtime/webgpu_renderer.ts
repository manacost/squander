import { resolve_texture_filtering, type TextureFilteringOptions } from "./texture_filtering.js";
import { create_resource_owner, type ResourceHandle, type ResourceOwner } from "./resource_ownership.js";

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
  tint?: Readonly<{ red: number; green: number; blue: number; alpha: number }>;
  opacity?: number;
}>;

export type WebGpuRenderer = Readonly<{
  clear: (color: ClearColor) => Promise<Uint8Array>;
  create_texture: (pixels: Uint8Array, width: number, height: number, options?: TextureFilteringOptions) => WebGpuTexture;
  draw_texture: (texture: WebGpuTexture, options?: TextureDrawOptions) => Promise<Uint8Array>;
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
};
@group(0) @binding(2) var<uniform> draw_uniforms: DrawUniforms;

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
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
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });
  let disposed = false;

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
    if (disposed) {
      throw new Error("WebGPU renderer is disposed");
    }
    const region = draw_options.region ?? { x: 0, y: 0, width: texture.width, height: texture.height };
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
    const tint = draw_options.tint ?? { red: 1, green: 1, blue: 1, alpha: 1 };
    assert_color(tint);
    const opacity = draw_options.opacity ?? 1;
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
      throw new RangeError("opacity must be finite and between zero and one");
    }
    const lease = texture.resource.acquire_lease();
    const vertex_data = new Float32Array([-1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, -1, 1, 0, 0, 1, -1, 1, 1, 1, 1, 1, 0]);
    const vertex_buffer = device.createBuffer({ size: vertex_data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(vertex_buffer, 0, vertex_data);
    /* eslint-disable @typescript-eslint/naming-convention -- WebGPU sampler descriptors use external camelCase names. */
    const sampler = device.createSampler({ magFilter: texture.filtering.magnification, minFilter: texture.filtering.minification });
    /* eslint-enable @typescript-eslint/naming-convention -- End of the WebGPU external descriptor boundary. */
    const uniforms = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(
      uniforms,
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
      ]),
    );
    const bind_group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: lease.resource.createView() },
        { binding: 2, resource: { buffer: uniforms } },
      ],
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
    pass.setBindGroup(0, bind_group);
    pass.setVertexBuffer(0, vertex_buffer);
    pass.draw(6);
    pass.end();
    /* eslint-enable @typescript-eslint/naming-convention -- End of the WebGPU external descriptor boundary. */
    try {
      return await submit_and_readback(encoder, target);
    } finally {
      lease.release();
      vertex_buffer.destroy();
      uniforms.destroy();
    }
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    resources.dispose();
    context.unconfigure();
    device.destroy();
  };

  return Object.freeze({ clear, create_texture, draw_texture, dispose });
};
