import { afterEach, describe, expect, it, vi } from "vitest";
import { create_geometry_owner } from "./geometry_ownership.js";
import { create_webgpu_renderer, WebGpuUnavailableError } from "./webgpu_renderer.js";
import type { WebGpuFont } from "./font_loading.js";
import { rgba } from "./colors.js";

class FakeTexture {
  public label = "";
  public readonly destroy = vi.fn();
  public readonly createView = vi.fn(() => ({}));
}

class FakeBuffer {
  public readonly destroy = vi.fn();
  public readonly mapAsync = vi.fn(async () => undefined);
  public readonly unmap = vi.fn();

  public constructor(private readonly size: number) {}

  // eslint-disable-next-line @typescript-eslint/naming-convention -- WebGPU uses this external method name.
  public getMappedRange(): ArrayBuffer {
    return new ArrayBuffer(this.size);
  }
}

const create_fake_device = (): {
  device: Record<string, unknown>;
  context: Record<string, unknown>;
  textures: FakeTexture[];
  buffers: FakeBuffer[];
} => {
  const textures: FakeTexture[] = [];
  const buffers: FakeBuffer[] = [];
  const context_texture = (): FakeTexture => {
    const texture = new FakeTexture();
    textures.push(texture);
    return texture;
  };
  const context = {
    configure: vi.fn(),
    unconfigure: vi.fn(),
    getCurrentTexture: vi.fn(context_texture),
  };
  const queue = {
    writeTexture: vi.fn(),
    writeBuffer: vi.fn(),
    submit: vi.fn(),
    onSubmittedWorkDone: vi.fn(async () => undefined),
  };
  const device = {
    lost: Promise.resolve({ reason: "destroyed", message: "test teardown" }),
    queue,
    destroy: vi.fn(),
    createShaderModule: vi.fn(() => ({})),
    createRenderPipeline: vi.fn(() => ({ getBindGroupLayout: vi.fn(() => ({})) })),
    createTexture: vi.fn(() => {
      const texture = new FakeTexture();
      textures.push(texture);
      return texture;
    }),
    createBuffer: vi.fn(({ size }: { size: number }) => {
      const buffer = new FakeBuffer(size);
      buffers.push(buffer);
      return buffer;
    }),
    createSampler: vi.fn(() => ({})),
    createBindGroup: vi.fn(() => ({})),
    createCommandEncoder: vi.fn(() => {
      const pass = {
        setPipeline: vi.fn(),
        setBindGroup: vi.fn(),
        setVertexBuffer: vi.fn(),
        draw: vi.fn(),
        end: vi.fn(),
      };
      return {
        beginRenderPass: vi.fn(() => pass),
        copyTextureToBuffer: vi.fn(),
        finish: vi.fn(() => ({})),
      };
    }),
  };
  return { device, context, textures, buffers };
};

const install_webgpu = (
  setup: { adapter?: Record<string, unknown> | null; context?: Record<string, unknown> | null; format?: string } = {},
): ReturnType<typeof create_fake_device> & { context: Record<string, unknown> | null } => {
  const fake = create_fake_device();
  const adapter = "adapter" in setup ? setup.adapter : { requestDevice: vi.fn(async () => fake.device) };
  const context = setup.context === null ? null : (setup.context ?? fake.context);
  vi.stubGlobal("window", { isSecureContext: true });
  vi.stubGlobal("navigator", {
    gpu: {
      requestAdapter: vi.fn(async () => adapter),
      getPreferredCanvasFormat: vi.fn(() => setup.format ?? "rgba8unorm"),
    },
  });
  vi.stubGlobal("GPUTextureUsage", { TEXTURE_BINDING: 1, COPY_DST: 2, RENDER_ATTACHMENT: 4, COPY_SRC: 8 });
  vi.stubGlobal("GPUBufferUsage", { COPY_DST: 1, MAP_READ: 2, VERTEX: 4, UNIFORM: 8 });
  vi.stubGlobal("GPUMapMode", { READ: 1 });
  class TestFontFace {
    public load = async (): Promise<void> => undefined;
  }
  vi.stubGlobal("FontFace", TestFontFace);
  vi.stubGlobal("document", {
    createElement: vi.fn(() => ({
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        font: "",
        textBaseline: "",
        fillStyle: "",
        measureText: vi.fn(() => ({ width: 8 })),
        clearRect: vi.fn(),
        fillText: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([255, 255, 255, 255]) })),
      })),
    })),
    fonts: { add: vi.fn(), delete: vi.fn() },
  });
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 1, height: 1, close: vi.fn() })),
  );
  return { ...fake, context } as ReturnType<typeof create_fake_device> & { context: Record<string, unknown> | null };
};

const canvas = (): HTMLCanvasElement => ({ width: 0, height: 0, getContext: vi.fn(() => null) }) as unknown as HTMLCanvasElement;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("[webgpu-runtime] renderer CPU orchestration", () => {
  it("reports initialization failures and destroys a device without a context", async () => {
    vi.stubGlobal("window", { isSecureContext: false });
    await expect(create_webgpu_renderer({ canvas: canvas(), width: 2, height: 2 })).rejects.toBeInstanceOf(WebGpuUnavailableError);

    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {});
    await expect(create_webgpu_renderer({ canvas: canvas(), width: 2, height: 2 })).rejects.toThrow("unavailable");

    const no_adapter = install_webgpu({ adapter: null });
    const no_adapter_canvas = canvas();
    (no_adapter_canvas.getContext as ReturnType<typeof vi.fn>).mockReturnValue(no_adapter.context);
    await expect(create_webgpu_renderer({ canvas: no_adapter_canvas, width: 2, height: 2 })).rejects.toThrow("adapter");

    const no_context = install_webgpu({ context: null });
    await expect(create_webgpu_renderer({ canvas: canvas(), width: 2, height: 2 })).rejects.toThrow("context");
    expect(no_context.device.destroy as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();
  });

  it("covers texture uploads, commands, viewport changes, and idempotent disposal", async () => {
    const fake = install_webgpu();
    const target = canvas();
    (target.getContext as ReturnType<typeof vi.fn>).mockReturnValue(fake.context);
    const renderer = await create_webgpu_renderer({ canvas: target, width: 2, height: 2 });
    const texture = renderer.create_texture(new Uint8Array([255, 0, 0, 255]), 1, 1, { filter: "nearest" });
    expect(texture.filtering).toEqual({ magnification: "nearest", minification: "nearest" });
    expect(() => renderer.create_texture(new Uint8Array(4), 0, 1)).toThrow(/dimensions/);
    expect(() => renderer.create_texture(new Uint8Array(4), 2, 1)).toThrow(/shorter/);
    expect((await renderer.clear({ red: 0, green: 0, blue: 0, alpha: 1 })).slice(0, 16)).toHaveLength(16);
    await expect(renderer.clear({ red: 2, green: 0, blue: 0, alpha: 1 })).rejects.toThrow(/between/);
    expect(renderer.create_texture_from_image({} as CanvasImageSource, 1, 1)).toBeDefined();
    expect(await renderer.create_texture_from_blob(new Blob(["image"]))).toBeDefined();
    await renderer.create_font_from_url("local(Arial)", { characters: "A" });

    const geometry_owner = create_geometry_owner();
    const geometry = geometry_owner.create({
      vertices: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ],
      indices: [0, 1, 2],
    });
    const glyph_texture = renderer.create_texture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    const font: WebGpuFont = {
      family: "test",
      size: 16,
      atlas: glyph_texture,
      atlas_width: 1,
      atlas_height: 1,
      prepare: vi.fn(),
      get_glyph: vi.fn(() => ({ character: "A", x: 0, y: 0, width: 1, height: 1, advance: 1, baseline: 0 })),
      get_glyph_texture: vi.fn(() => glyph_texture),
      release: vi.fn(),
    };
    const color = rgba(1, 0, 0, 1);
    const pixels = await renderer.draw_commands([
      { kind: "texture", draw: { texture, options: { x: 0, y: 0, width: 1, height: 1, flip_x: true, flip_y: true, rotation: 0.2 } } },
      { kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 1, height: 1 }, color } },
      { kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 0, height: 0 }, color } },
      { kind: "circle", draw: { circle: { x: 1, y: 1, radius: 1 }, color } },
      { kind: "circle", draw: { circle: { x: 1, y: 1, radius: 0 }, color } },
      { kind: "line", draw: { line: { from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }, color, stroke_width: 1 } },
      { kind: "line", draw: { line: { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }, color, stroke_width: 0 } },
      { kind: "rectangle_outline", draw: { rectangle: { x: 0, y: 0, width: 1, height: 1 }, color, stroke_width: 1 } },
      { kind: "circle_outline", draw: { circle: { x: 1, y: 1, radius: 1 }, color, stroke_width: 1 } },
      { kind: "circle_outline", draw: { circle: { x: 1, y: 1, radius: 0 }, color, stroke_width: 1 } },
      {
        kind: "triangles",
        draw: {
          vertices: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
          ],
          indices: [0, 1, 2],
          color,
        },
      },
      {
        kind: "polygon",
        draw: {
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
          ],
          color,
        },
      },
      {
        kind: "polygon_outline",
        draw: {
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
          ],
          color,
          stroke_width: 1,
        },
      },
      {
        kind: "stroke",
        draw: {
          subpaths: [
            {
              points: [
                { x: 0, y: 0 },
                { x: 1, y: 1 },
              ],
              closed: false,
            },
          ],
          width: 1,
          color,
        },
      },
      { kind: "geometry", draw: { geometry, owner: geometry_owner, color } },
      { kind: "text", draw: { font, text: "A", options: { x: 0, y: 0, color } } },
    ]);
    expect(pixels.slice(0, 16)).toHaveLength(16);
    await expect(renderer.draw_commands([{ kind: "triangles", draw: { vertices: [], indices: [], color } }])).rejects.toThrow(
      /indexed triangles/,
    );
    await expect(
      renderer.draw_commands([{ kind: "triangles", draw: { vertices: [{ x: Number.NaN, y: 0 }], indices: [0, 0, 0], color } }]),
    ).rejects.toThrow(/vertices/);
    await expect(
      renderer.draw_commands([{ kind: "triangles", draw: { vertices: [{ x: 0, y: 0 }], indices: [1, 1, 1], color } }]),
    ).rejects.toThrow(/index/);
    await expect(
      renderer.draw_commands([
        {
          kind: "triangles",
          draw: {
            vertices: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 0, y: 1 },
            ],
            indices: [0, 1, 2],
            color,
            opacity: 2,
          },
        },
      ]),
    ).rejects.toThrow(/opacity/);
    await expect(
      renderer.draw_commands([{ kind: "geometry", draw: { geometry, owner: geometry_owner, color, opacity: 2 } }]),
    ).rejects.toThrow(/opacity/);
    await expect(
      renderer.draw_commands([
        {
          kind: "polygon",
          draw: {
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 0, y: 1 },
            ],
            color,
            opacity: 2,
          },
        },
      ]),
    ).rejects.toThrow(/opacity/);
    await expect(
      renderer.draw_commands([
        {
          kind: "polygon_outline",
          draw: {
            points: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 0, y: 1 },
            ],
            color,
            stroke_width: 1,
            opacity: 2,
          },
        },
      ]),
    ).rejects.toThrow(/opacity/);
    await expect(
      renderer.draw_commands([
        {
          kind: "stroke",
          draw: {
            subpaths: [
              {
                points: [
                  { x: 0, y: 0 },
                  { x: 1, y: 1 },
                ],
                closed: false,
              },
            ],
            width: 1,
            color,
            opacity: 2,
          },
        },
      ]),
    ).rejects.toThrow(/opacity/);
    await expect(renderer.draw_texture(texture, { region: { x: -1, y: 0, width: 1, height: 1 } })).rejects.toThrow(/fit/);
    await expect(renderer.draw_texture(texture, { width: 0 })).rejects.toThrow(/dimensions/);
    await expect(renderer.draw_texture(texture, { opacity: 2 })).rejects.toThrow(/opacity/);
    await expect(renderer.draw_texture(texture, { tint: { red: 2, green: 0, blue: 0, alpha: 1 } })).rejects.toThrow(/between/);
    await renderer.draw_commands([{ kind: "geometry", draw: { geometry, owner: geometry_owner, color } }]);
    await renderer.draw_commands([{ kind: "geometry", draw: { geometry, owner: geometry_owner, color } }]);
    geometry.update(geometry_owner, {
      vertices: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 2 },
      ],
      indices: [0, 1, 2],
    });
    await renderer.draw_commands([{ kind: "geometry", draw: { geometry, owner: geometry_owner, color } }]);
    await expect(renderer.draw_commands([])).rejects.toThrow(/at least one/);
    await renderer.draw_texture(texture);
    await renderer.draw_textures([{ texture }]);
    await renderer.draw_text(font, "A");
    renderer.resize({
      logical_width: 4,
      logical_height: 4,
      css_width: 4,
      css_height: 4,
      physical_width: 4,
      physical_height: 4,
      content_width: 4,
      content_height: 4,
      offset_x: 0,
      offset_y: 0,
    });
    expect(renderer.get_viewport().logical_width).toBe(4);
    texture.release();
    glyph_texture.release();
    renderer.dispose();
    geometry.release();
    geometry_owner.dispose();
    renderer.dispose();
    expect(fake.device.destroy).toHaveBeenCalledOnce();
    await expect(renderer.clear({ red: 0, green: 0, blue: 0, alpha: 1 })).rejects.toThrow("disposed");
    await expect(
      renderer.draw_commands([{ kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 1, height: 1 }, color } }]),
    ).rejects.toThrow("disposed");
  });
});
