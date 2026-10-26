export type Rectangle = Readonly<{ x: number; y: number; width: number; height: number }>;
export type Circle = Readonly<{ x: number; y: number; radius: number }>;
export type Line = Readonly<{ from: Readonly<{ x: number; y: number }>; to: Readonly<{ x: number; y: number }> }>;
export type NormalizedRectangle = Readonly<{ left: number; top: number; right: number; bottom: number; width: number; height: number }>;

const assert_finite = (value: number, name: string): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
};

export const normalize_rectangle = (rectangle: Rectangle): NormalizedRectangle => {
  assert_finite(rectangle.x, "rectangle.x");
  assert_finite(rectangle.y, "rectangle.y");
  assert_finite(rectangle.width, "rectangle.width");
  assert_finite(rectangle.height, "rectangle.height");
  const right = rectangle.x + rectangle.width;
  const bottom = rectangle.y + rectangle.height;
  const left = Math.min(rectangle.x, right);
  const top = Math.min(rectangle.y, bottom);
  const normalized_right = Math.max(rectangle.x, right);
  const normalized_bottom = Math.max(rectangle.y, bottom);
  return Object.freeze({
    left,
    top,
    right: normalized_right,
    bottom: normalized_bottom,
    width: normalized_right - left,
    height: normalized_bottom - top,
  });
};

export const validate_circle = (circle: Circle): Circle => {
  assert_finite(circle.x, "circle.x");
  assert_finite(circle.y, "circle.y");
  if (!Number.isFinite(circle.radius) || circle.radius < 0) {
    throw new RangeError("circle.radius must be finite and nonnegative");
  }
  return Object.freeze({ ...circle });
};

export const validate_line = (line: Line): Line => {
  assert_finite(line.from.x, "line.from.x");
  assert_finite(line.from.y, "line.from.y");
  assert_finite(line.to.x, "line.to.x");
  assert_finite(line.to.y, "line.to.y");
  return Object.freeze({ from: Object.freeze({ ...line.from }), to: Object.freeze({ ...line.to }) });
};

export const validate_stroke_width = (stroke_width: number): number => {
  if (!Number.isFinite(stroke_width) || stroke_width < 0) {
    throw new RangeError("stroke_width must be finite and nonnegative");
  }
  return stroke_width;
};

export const validate_opacity = (opacity: number): number => {
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new RangeError("opacity must be finite and between zero and one");
  }
  return opacity;
};

export const has_drawable_area = (rectangle: NormalizedRectangle): boolean => rectangle.width > 0 && rectangle.height > 0;
