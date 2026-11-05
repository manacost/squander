export type TextureFilter = "nearest" | "linear";

export type TextureFiltering = Readonly<{
  magnification: TextureFilter;
  minification: TextureFilter;
}>;

export type TextureFilteringOptions = Readonly<{
  filter?: TextureFilter;
  magnification?: TextureFilter;
  minification?: TextureFilter;
}>;

export const resolve_texture_filtering = (options: TextureFilteringOptions = {}): TextureFiltering => {
  const filter = options.filter ?? "linear";
  return Object.freeze({
    magnification: options.magnification ?? filter,
    minification: options.minification ?? filter,
  });
};
