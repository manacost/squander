export type ClearColor = Readonly<{ red: number; green: number; blue: number; alpha: number }>;

export type WebGpuRendererOptions = Readonly<{
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}>;

export type WebGpuRenderer = Readonly<{
  clear: (color: ClearColor) => Promise<Uint8Array>;
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
  let disposed = false;

  const clear = async (color: ClearColor): Promise<Uint8Array> => {
    if (disposed) {
      throw new Error("WebGPU renderer is disposed");
    }
    assert_color(color);
    const texture = context.getCurrentTexture();
    const readback = device.createBuffer({
      size: bytes_per_row * options.height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
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
    encoder.copyTextureToBuffer(
      { texture },
      { buffer: readback, bytesPerRow: bytes_per_row, rowsPerImage: options.height },
      { width: options.width, height: options.height, depthOrArrayLayers: 1 },
    );
    device.queue.submit([encoder.finish()]);
    /* eslint-enable @typescript-eslint/naming-convention -- End of the WebGPU external descriptor boundary. */
    await device.queue.onSubmittedWorkDone();
    await readback.mapAsync(GPUMapMode.READ);
    const mapped = new Uint8Array(readback.getMappedRange());
    const pixels = normalize_readback(new Uint8Array(mapped), options.width, options.height, format);
    readback.unmap();
    readback.destroy();
    return pixels;
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    context.unconfigure();
    device.destroy();
  };

  return Object.freeze({ clear, dispose });
};
