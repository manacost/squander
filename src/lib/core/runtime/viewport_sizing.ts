export type ViewportSize = Readonly<{
  logical_width: number;
  logical_height: number;
  css_width: number;
  css_height: number;
  physical_width: number;
  physical_height: number;
  content_width: number;
  content_height: number;
  offset_x: number;
  offset_y: number;
}>;

export type FixedViewportOptions = Readonly<{
  logical_width: number;
  logical_height: number;
  css_width: number;
  css_height: number;
  device_pixel_ratio: number;
}>;

export type ResponsiveViewportOptions = Readonly<{
  css_width: number;
  css_height: number;
  device_pixel_ratio: number;
}>;

const assert_finite_nonnegative = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be finite and nonnegative`);
  }
};

const assert_positive = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be finite and greater than zero`);
  }
};

export const calculate_fixed_viewport = (options: FixedViewportOptions): ViewportSize => {
  assert_positive(options.logical_width, "logical_width");
  assert_positive(options.logical_height, "logical_height");
  assert_finite_nonnegative(options.css_width, "css_width");
  assert_finite_nonnegative(options.css_height, "css_height");
  assert_positive(options.device_pixel_ratio, "device_pixel_ratio");

  const scale = Math.min(options.css_width / options.logical_width, options.css_height / options.logical_height);
  const content_width = options.logical_width * scale;
  const content_height = options.logical_height * scale;
  return Object.freeze({
    logical_width: options.logical_width,
    logical_height: options.logical_height,
    css_width: options.css_width,
    css_height: options.css_height,
    physical_width: Math.round(options.css_width * options.device_pixel_ratio),
    physical_height: Math.round(options.css_height * options.device_pixel_ratio),
    content_width,
    content_height,
    offset_x: (options.css_width - content_width) / 2,
    offset_y: (options.css_height - content_height) / 2,
  });
};

export const calculate_responsive_viewport = (options: ResponsiveViewportOptions): ViewportSize => {
  assert_finite_nonnegative(options.css_width, "css_width");
  assert_finite_nonnegative(options.css_height, "css_height");
  assert_positive(options.device_pixel_ratio, "device_pixel_ratio");
  return Object.freeze({
    logical_width: options.css_width,
    logical_height: options.css_height,
    css_width: options.css_width,
    css_height: options.css_height,
    physical_width: Math.round(options.css_width * options.device_pixel_ratio),
    physical_height: Math.round(options.css_height * options.device_pixel_ratio),
    content_width: options.css_width,
    content_height: options.css_height,
    offset_x: 0,
    offset_y: 0,
  });
};
