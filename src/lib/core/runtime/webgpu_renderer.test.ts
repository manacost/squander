import { afterEach, describe, expect, it, vi } from "vitest";
import { create_camera } from "./camera.js";
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
  render_passes: unknown[];
  draw_calls: number[];
} => {
  const textures: FakeTexture[] = [];
  const buffers: FakeBuffer[] = [];
  const render_passes: unknown[] = [];
  const draw_calls: number[] = [];
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
    createBindGroupLayout: vi.fn(() => ({})),
    createPipelineLayout: vi.fn(() => ({})),
    createRenderPipeline: vi.fn(() => ({})),
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
        draw: vi.fn(() => {
          draw_calls.push(1);
        }),
        end: vi.fn(),
      };
      return {
        beginRenderPass: vi.fn((descriptor: unknown) => {
          render_passes.push(descriptor);
          return pass;
        }),
        copyTextureToBuffer: vi.fn(),
        finish: vi.fn(() => ({})),
      };
    }),
  };
  return { device, context, textures, buffers, render_passes, draw_calls };
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
  vi.stubGlobal("GPUShaderStage", { FRAGMENT: 2 });
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

  it("[blend-modes] covers texture uploads, command batch breaks, viewport changes, and idempotent disposal", async () => {
    const fake = install_webgpu();
    const target_canvas = canvas();
    (target_canvas.getContext as ReturnType<typeof vi.fn>).mockReturnValue(fake.context);
    const renderer = await create_webgpu_renderer({ canvas: target_canvas, width: 2, height: 2 });
    const production_frame = renderer.begin_frame({ red: 0.1, green: 0.2, blue: 0.3, alpha: 1 });
    production_frame.draw_commands([
      { kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 1, height: 1 }, color: rgba(1, 0, 0, 1) } },
    ]);
    const copies_before_production_submit = (fake.device.queue as { submit: ReturnType<typeof vi.fn> }).submit.mock.calls.length;
    await production_frame.submit();
    expect((fake.device.queue as { submit: ReturnType<typeof vi.fn> }).submit).toHaveBeenCalled();
    expect(fake.context.getCurrentTexture).toHaveBeenCalled();
    expect(fake.render_passes.at(-1)).toMatchObject({ colorAttachments: [{ loadOp: "clear", storeOp: "store" }] });
    expect((fake.device as { createBuffer: ReturnType<typeof vi.fn> }).createBuffer).not.toHaveBeenCalledWith(
      expect.objectContaining({ usage: 3 }),
    );
    expect((fake.device.queue as { submit: ReturnType<typeof vi.fn> }).submit.mock.calls.length).toBeGreaterThan(
      copies_before_production_submit,
    );
    await expect(production_frame.submit()).rejects.toThrow("already completed");
    const capture_frame = renderer.begin_frame();
    const copies_before_capture = (fake.device as { createBuffer: ReturnType<typeof vi.fn> }).createBuffer.mock.calls.length;
    const capture = capture_frame.capture();
    capture_frame.draw_commands([]);
    await capture_frame.submit();
    await capture;
    expect((fake.device as { createBuffer: ReturnType<typeof vi.fn> }).createBuffer.mock.calls.length).toBeGreaterThan(
      copies_before_capture,
    );
    const texture = renderer.create_texture(new Uint8Array([255, 0, 0, 255]), 1, 1, { filter: "nearest" });
    const sampler_factory = fake.device.createSampler as ReturnType<typeof vi.fn>;
    const buffer_factory = fake.device.createBuffer as ReturnType<typeof vi.fn>;
    const bind_group_factory = fake.device.createBindGroup as ReturnType<typeof vi.fn>;
    const draw_calls_before_batch = fake.draw_calls.length;
    await renderer.draw_commands([
      { kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 1, height: 1 }, color: rgba(1, 0, 0, 1) } },
      { kind: "rectangle", draw: { rectangle: { x: 1, y: 0, width: 1, height: 1 }, color: rgba(0, 0, 1, 1) } },
    ]);
    expect(fake.draw_calls.length - draw_calls_before_batch).toBe(1);
    const draw_calls_before_blend_breaks = fake.draw_calls.length;
    await renderer.draw_commands([
      { kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 1, height: 1 }, color: rgba(1, 0, 0, 1) } },
      { kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 1, height: 1 }, color: rgba(0, 1, 0, 1), blend_mode: "additive" } },
      { kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 1, height: 1 }, color: rgba(0, 0, 1, 1), blend_mode: "additive" } },
      { kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 1, height: 1 }, color: rgba(1, 1, 1, 1), blend_mode: "multiply" } },
    ]);
    expect(fake.draw_calls.length - draw_calls_before_blend_breaks).toBe(3);
    const upload_buffer_count = (): number =>
      buffer_factory.mock.calls.filter((call) => {
        const descriptor: unknown = call[0];
        if (descriptor === null || typeof descriptor !== "object" || !("usage" in descriptor)) return false;
        return descriptor.usage === 5 || descriptor.usage === 9;
      }).length;
    const samplers_before_warm_draws = sampler_factory.mock.calls.length;
    const upload_buffers_before_warm_draws = upload_buffer_count();
    const bind_groups_before_warm_draws = bind_group_factory.mock.calls.length;
    await renderer.draw_texture(texture);
    await renderer.draw_texture(texture);
    expect(sampler_factory.mock.calls.length - samplers_before_warm_draws).toBe(1);
    expect(upload_buffer_count()).toBe(upload_buffers_before_warm_draws);
    expect(bind_group_factory.mock.calls.length - bind_groups_before_warm_draws).toBe(1);
    const linear_texture = renderer.create_texture(new Uint8Array([0, 255, 0, 255]), 1, 1, { filter: "linear" });
    await renderer.draw_texture(linear_texture);
    expect(sampler_factory.mock.calls.length - samplers_before_warm_draws).toBe(1);
    expect(texture.filtering).toEqual({ magnification: "nearest", minification: "nearest" });
    const target = renderer.create_render_target({ width: 2, height: 2, filtering: { filter: "nearest" } });
    const target_frame = renderer.begin_frame();
    target_frame.set_target(target);
    target.release();
    target_frame.draw_commands([{ kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 2, height: 2 }, color: rgba(1, 0, 0, 1) } }]);
    target_frame.set_target();
    target_frame.draw_commands([{ kind: "texture", draw: { texture: target, options: { width: 2, height: 2 } } }]);
    const target_capture = target_frame.capture();
    await target_frame.submit();
    await target_capture;
    expect(fake.render_passes.length).toBeGreaterThan(2);
    target.release();
    expect(() => renderer.create_render_target({ width: 0, height: 1 })).toThrow(/dimensions/);
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
    await expect(renderer.draw_texture(texture, { blend_mode: "unsupported" as "normal" })).rejects.toThrow(/unsupported blend mode/);
    await expect(renderer.draw_texture(texture, { tint: { red: 2, green: 0, blue: 0, alpha: 1 } })).rejects.toThrow(/between/);
    expect(() => renderer.create_shader_effect({ fragment_code: "" })).toThrow(/fragment_code/);
    expect(() => renderer.create_shader_effect({ fragment_code: "@group(0) fn effect() -> vec4f { return color; }" })).toThrow(
      /WGSL items/,
    );
    expect(() => renderer.create_shader_effect({ fragment_code: "return color;", uniforms: [Number.NaN] })).toThrow(/finite/);
    const shader_effect = renderer.create_shader_effect({ fragment_code: "return color;", uniforms: [1] });
    await renderer.draw_texture(texture, { effect: shader_effect });
    shader_effect.release();
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
    linear_texture.release();
    target.release();
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

  it("[render-culling] skips only offscreen bounded commands and keeps unbounded draws", async () => {
    const fake = install_webgpu();
    const target_canvas = canvas();
    (target_canvas.getContext as ReturnType<typeof vi.fn>).mockReturnValue(fake.context);
    const renderer = await create_webgpu_renderer({ canvas: target_canvas, width: 2, height: 2, cull_offscreen: true });
    const camera = create_camera({ viewport: { logical_width: 2, logical_height: 2 } });
    const textures = [
      renderer.create_texture(new Uint8Array([255, 0, 0, 255]), 1, 1),
      renderer.create_texture(new Uint8Array([0, 255, 0, 255]), 1, 1),
      renderer.create_texture(new Uint8Array([0, 0, 255, 255]), 1, 1),
    ];
    const draw_calls_before = fake.draw_calls.length;
    await camera.draw(() => {
      return renderer.draw_commands([
        { kind: "texture", draw: { texture: textures[0] }, bounds: { x: 0, y: 0, width: 1, height: 1 } },
        { kind: "texture", draw: { texture: textures[1] }, bounds: { x: 100, y: 100, width: 1, height: 1 } },
        { kind: "texture", draw: { texture: textures[2] } },
      ]);
    });
    expect(fake.draw_calls.length - draw_calls_before).toBe(2);
    textures.forEach((texture) => {
      texture.release();
    });
    renderer.dispose();
  });
});
