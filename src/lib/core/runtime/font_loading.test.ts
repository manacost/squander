import { afterEach, describe, expect, it, vi } from "vitest";
import { GlyphAtlasCapacityError, FontLoadError, create_webgpu_font } from "./font_loading.js";
import type { WebGpuRenderer, WebGpuTexture } from "./webgpu_renderer.js";

const create_texture = (): WebGpuTexture =>
  ({
    resource: {},
    width: 1,
    height: 1,
    filtering: { magnification: "nearest", minification: "nearest" },
    release: vi.fn(),
  }) as unknown as WebGpuTexture;

let font_face_args: readonly unknown[] = [];

const install_font_environment = (options: { load?: () => Promise<unknown>; context?: CanvasRenderingContext2D | null } = {}): void => {
  class TestFontFace {
    public constructor(...args: readonly unknown[]) {
      font_face_args = args;
    }

    public load = options.load ?? (() => Promise.resolve());
  }
  const context =
    options.context !== undefined
      ? options.context
      : ({
          font: "",
          textBaseline: "",
          fillStyle: "",
          measureText: () => ({ width: 8 }),
          clearRect: vi.fn(),
          fillText: vi.fn(),
          getImageData: (_x: number, _y: number, width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
        } as unknown as CanvasRenderingContext2D);
  vi.stubGlobal("FontFace", TestFontFace);
  vi.stubGlobal("document", {
    createElement: vi.fn(() => ({ getContext: vi.fn(() => context) })),
    fonts: {
      add: vi.fn(),
      delete: vi.fn(),
    },
  });
};

const create_renderer = (): { renderer: WebGpuRenderer; textures: WebGpuTexture[] } => {
  const textures: WebGpuTexture[] = [];
  const renderer = {
    create_texture: vi.fn(() => {
      const texture = create_texture();
      textures.push(texture);
      return texture;
    }),
  } as unknown as WebGpuRenderer;
  return { renderer, textures };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("[text-drawing] font preparation", () => {
  it("loads, prepares, reuses, and releases glyph textures", async () => {
    install_font_environment();
    const { renderer, textures } = create_renderer();
    const font = await create_webgpu_font(renderer, "local(Arial)", { characters: "A", size: 16 });

    expect(font.get_glyph("A").character).toBe("A");
    expect(font.atlas_width).toBeGreaterThan(0);
    expect(font.atlas_height).toBeGreaterThan(0);
    const first_glyph_texture = font.get_glyph_texture("A");
    font.prepare("A");
    expect(font.get_glyph_texture("A")).toBe(first_glyph_texture);
    font.prepare("B");
    expect(font.get_glyph("B").advance).toBe(8);
    expect(() => font.get_glyph("?")).toThrow(/not prepared/);
    expect(() => font.get_glyph_texture("?")).toThrow(/unavailable/);
    expect(textures.length).toBeGreaterThan(2);

    font.release();
    font.release();
    expect(() => font.atlas).toThrow("atlas is unavailable");
    expect(() => font.prepare("C")).toThrow("font is released");
    expect(textures.every((texture) => (texture.release as ReturnType<typeof vi.fn>).mock.calls.length === 1)).toBe(true);
  });

  it("supports custom font variants and rejects loading failures", async () => {
    install_font_environment();
    const { renderer } = create_renderer();
    await create_webgpu_font(renderer, "local(Arial)", { weight: "700", style: "italic", filtering: { filter: "linear" } });
    expect(font_face_args).toEqual([expect.any(String), "local(Arial)", { weight: "700", style: "italic" }]);
    const texture_calls = (renderer.create_texture as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(texture_calls[0]?.[3]).toEqual({ filter: "linear" });

    await expect(create_webgpu_font(renderer, "   ")).rejects.toBeInstanceOf(FontLoadError);
    install_font_environment({ load: () => Promise.reject(new Error("missing font")) });
    await expect(create_webgpu_font(renderer, "url(missing.woff2)")).rejects.toMatchObject({ name: "FontLoadError" });
  });

  it("rejects when Canvas 2D preparation is unavailable or the atlas cannot fit", async () => {
    install_font_environment({ context: null });
    const { renderer } = create_renderer();
    await expect(create_webgpu_font(renderer, "local(Arial)")).rejects.toBeInstanceOf(FontLoadError);

    install_font_environment();
    await expect(create_webgpu_font(renderer, "local(Arial)", { size: 4000, characters: "A" })).rejects.toBeInstanceOf(
      GlyphAtlasCapacityError,
    );
  });
});
