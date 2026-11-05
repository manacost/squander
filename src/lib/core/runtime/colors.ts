export type Color = Readonly<{ red: number; green: number; blue: number; alpha: number }>;

const assert_unit = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be finite and between zero and one`);
  }
};

const create_color = (red: number, green: number, blue: number, alpha: number): Color => {
  assert_unit(red, "red");
  assert_unit(green, "green");
  assert_unit(blue, "blue");
  assert_unit(alpha, "alpha");
  return Object.freeze({ red, green, blue, alpha });
};

export const rgb = (red: number, green: number, blue: number, alpha = 1): Color => create_color(red, green, blue, alpha);

export const rgba = (red: number, green: number, blue: number, alpha: number): Color => create_color(red, green, blue, alpha);

const normalize_hue = (hue: number): number => {
  if (!Number.isFinite(hue)) {
    throw new RangeError("hue must be finite");
  }
  return ((hue % 360) + 360) % 360;
};

const hsl_components = (hue: number, saturation: number, lightness: number): [number, number, number] => {
  const normalized_hue = normalize_hue(hue) / 360;
  assert_unit(saturation, "saturation");
  assert_unit(lightness, "lightness");
  if (saturation === 0) {
    return [lightness, lightness, lightness];
  }
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const sector = normalized_hue * 6;
  const intermediate = chroma * (1 - Math.abs((sector % 2) - 1));
  const match = lightness - chroma / 2;
  const [red, green, blue] =
    sector < 1
      ? [chroma, intermediate, 0]
      : sector < 2
        ? [intermediate, chroma, 0]
        : sector < 3
          ? [0, chroma, intermediate]
          : sector < 4
            ? [0, intermediate, chroma]
            : sector < 5
              ? [intermediate, 0, chroma]
              : [chroma, 0, intermediate];
  return [red + match, green + match, blue + match];
};

export const hsl = (hue: number, saturation: number, lightness: number, alpha = 1): Color => {
  const [red, green, blue] = hsl_components(hue, saturation, lightness);
  return create_color(red, green, blue, alpha);
};

export const hsla = (hue: number, saturation: number, lightness: number, alpha: number): Color => {
  const [red, green, blue] = hsl_components(hue, saturation, lightness);
  return create_color(red, green, blue, alpha);
};

export const hex = (value: string): Color => {
  if (!/^#[\da-f]{3,4}$|^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value)) {
    throw new RangeError("hex must be #RGB, #RGBA, #RRGGBB, or #RRGGBBAA");
  }
  const digits = value.slice(1);
  const expanded =
    digits.length <= 4
      ? digits
          .split("")
          .map((digit) => `${digit}${digit}`)
          .join("")
      : digits;
  const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6), 16) / 255 : 1;
  return create_color(
    Number.parseInt(expanded.slice(0, 2), 16) / 255,
    Number.parseInt(expanded.slice(2, 4), 16) / 255,
    Number.parseInt(expanded.slice(4, 6), 16) / 255,
    alpha,
  );
};
