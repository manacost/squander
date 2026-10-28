import type { Color } from "./colors.js";
import type { TextureFilteringOptions } from "./texture_filtering.js";
import type { WebGpuRenderer, WebGpuTexture } from "./webgpu_renderer.js";

export const basic_latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,!?-_:;'/()";

export class FontLoadError extends Error {
  public constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "FontLoadError";
  }
}

export class GlyphAtlasCapacityError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "GlyphAtlasCapacityError";
  }
}

export type FontOptions = Readonly<{
  characters?: string;
  size?: number;
  weight?: string;
  style?: string;
  filtering?: TextureFilteringOptions;
}>;

export type TextDrawOptions = Readonly<{
  x?: number;
  y?: number;
  size?: number;
  color?: Color;
  opacity?: number;
  origin?: Readonly<{ x: number; y: number }>;
}>;

export type FontGlyph = Readonly<{
  character: string;
  x: number;
  y: number;
  width: number;
  height: number;
  advance: number;
  baseline: number;
}>;

export type WebGpuFont = Readonly<{
  readonly family: string;
  readonly size: number;
  readonly atlas: WebGpuTexture;
  readonly atlas_width: number;
  readonly atlas_height: number;
  prepare: (text: string) => void;
  get_glyph: (character: string) => FontGlyph;
  get_glyph_texture: (character: string) => WebGpuTexture;
  release: () => void;
}>;

const max_atlas_size = 4096;
const padding = 2;
let family_id = 0;

const assert_font_size = (size: number): void => {
  if (!Number.isFinite(size) || size <= 0) throw new RangeError("font size must be finite and positive");
};

const assert_character = (character: string): void => {
  if (character.length !== 1) throw new RangeError("font glyphs must contain exactly one character");
};

const next_power_of_two = (value: number): number => {
  let result = 1;
  while (result < value) result *= 2;
  return result;
};

export const create_webgpu_font = async (renderer: WebGpuRenderer, source: string, options: FontOptions = {}): Promise<WebGpuFont> => {
  const size = options.size ?? 32;
  assert_font_size(size);
  if (source.trim() === "") throw new FontLoadError("font source must not be empty");
  const family = `squander-font-${family_id++}`;
  const face = new FontFace(family, source, { weight: options.weight ?? "400", style: options.style ?? "normal" });
  try {
    await face.load();
    document.fonts.add(face);
  } catch (cause) {
    throw new FontLoadError("font could not be loaded", { cause });
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context === null) throw new FontLoadError("Canvas 2D font preparation is unavailable");
  context.font = `${options.weight ?? "400"} ${size}px ${family}`;
  const glyphs = new Map<string, FontGlyph>();
  const glyph_textures = new Map<string, WebGpuTexture>();
  let atlas: WebGpuTexture | undefined;
  let atlas_width = 0;
  let atlas_height = 0;
  let disposed = false;

  const rebuild = (): void => {
    const entries = [...glyphs.keys()].map((character) => {
      const metrics = context.measureText(character);
      return { character, width: Math.max(1, Math.ceil(metrics.width) + padding * 2), height: Math.ceil(size * 1.25) + padding * 2 };
    });
    const cell_width = Math.max(...entries.map((entry) => entry.width), 1);
    const cell_height = Math.max(...entries.map((entry) => entry.height), 1);
    const columns = Math.max(1, Math.floor(max_atlas_size / cell_width));
    const rows = Math.ceil(entries.length / columns);
    atlas_width = Math.min(
      max_atlas_size,
      next_power_of_two(Math.max(cell_width, Math.min(max_atlas_size, Math.min(entries.length, columns) * cell_width))),
    );
    atlas_height = Math.min(max_atlas_size, next_power_of_two(Math.max(cell_height, rows * cell_height)));
    if (rows * cell_height > max_atlas_size || entries.length * cell_width > max_atlas_size * max_atlas_size) {
      throw new GlyphAtlasCapacityError("font glyph atlas capacity exceeded");
    }
    canvas.width = atlas_width;
    canvas.height = atlas_height;
    context.clearRect(0, 0, atlas_width, atlas_height);
    context.font = `${options.weight ?? "400"} ${size}px ${family}`;
    context.textBaseline = "top";
    context.fillStyle = "white";
    const pixels = new Uint8Array(atlas_width * atlas_height * 4);
    entries.forEach((entry, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = column * cell_width;
      const y = row * cell_height;
      context.fillText(entry.character, x + padding, y + padding);
      const metrics = context.measureText(entry.character);
      glyphs.set(entry.character, {
        character: entry.character,
        x,
        y,
        width: entry.width,
        height: entry.height,
        advance: metrics.width,
        baseline: y + padding,
      });
    });
    const image = context.getImageData(0, 0, atlas_width, atlas_height).data;
    pixels.set(image);
    const next_atlas = renderer.create_texture(pixels, atlas_width, atlas_height, options.filtering ?? { filter: "nearest" });
    const next_glyph_textures = new Map<string, WebGpuTexture>();
    entries.forEach((entry, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = column * cell_width;
      const y = row * cell_height;
      const glyph_pixels = new Uint8Array(entry.width * entry.height * 4);
      for (let row = 0; row < entry.height; row += 1) {
        const source_start = ((y + row) * atlas_width + x) * 4;
        const target_start = row * entry.width * 4;
        glyph_pixels.set(image.slice(source_start, source_start + entry.width * 4), target_start);
      }
      next_glyph_textures.set(
        entry.character,
        renderer.create_texture(glyph_pixels, entry.width, entry.height, options.filtering ?? { filter: "nearest" }),
      );
    });
    atlas?.release();
    glyph_textures.forEach((texture) => texture.release());
    glyph_textures.clear();
    next_glyph_textures.forEach((texture, character) => glyph_textures.set(character, texture));
    atlas = next_atlas;
  };

  const prepare = (text: string): void => {
    if (disposed) throw new Error("font is released");
    const additions = [...text].filter((character) => !glyphs.has(character));
    additions.forEach(assert_character);
    if (additions.length === 0) return;
    additions.forEach((character) => glyphs.set(character, { character, x: 0, y: 0, width: 1, height: 1, advance: size, baseline: 0 }));
    try {
      rebuild();
    } catch (error) {
      additions.forEach((character) => glyphs.delete(character));
      throw error;
    }
  };

  prepare(options.characters ?? basic_latin);
  return Object.freeze({
    family,
    size,
    get atlas(): WebGpuTexture {
      if (atlas === undefined) throw new Error("font atlas is unavailable");
      return atlas;
    },
    get atlas_width(): number {
      return atlas_width;
    },
    get atlas_height(): number {
      return atlas_height;
    },
    prepare,
    get_glyph: (character: string): FontGlyph => {
      const glyph = glyphs.get(character);
      if (glyph === undefined) throw new RangeError(`glyph is not prepared: ${character}`);
      return glyph;
    },
    get_glyph_texture: (character: string): WebGpuTexture => {
      const texture = glyph_textures.get(character);
      if (texture === undefined) throw new RangeError(`glyph texture is unavailable: ${character}`);
      return texture;
    },
    release: () => {
      if (disposed) return;
      disposed = true;
      atlas?.release();
      atlas = undefined;
      glyph_textures.forEach((texture) => texture.release());
      glyph_textures.clear();
      document.fonts.delete(face);
    },
  });
};
