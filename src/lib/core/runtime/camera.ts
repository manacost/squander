export type Point = Readonly<{ x: number; y: number }>;
export type Bounds = Readonly<{ x: number; y: number; width: number; height: number }>;
export type CameraViewport = Readonly<{ logical_width: number; logical_height: number }>;

export type CameraOptions = Readonly<{
  x?: number;
  y?: number;
  zoom?: number;
  rotation?: number;
  viewport: CameraViewport;
}>;

export type Camera = Readonly<{
  get_position: () => Point;
  get_zoom: () => number;
  get_rotation: () => number;
  set_position: (x: number, y: number) => void;
  set_zoom: (zoom: number) => void;
  set_rotation: (rotation: number) => void;
  world_to_screen: (point: Point) => Point;
  is_in_view: (bounds: Bounds) => boolean;
}>;

const assert_finite = (value: number, name: string): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
};

const assert_viewport = (viewport: CameraViewport): void => {
  if (!Number.isFinite(viewport.logical_width) || viewport.logical_width < 0) {
    throw new RangeError("logical_width must be finite and nonnegative");
  }
  if (!Number.isFinite(viewport.logical_height) || viewport.logical_height < 0) {
    throw new RangeError("logical_height must be finite and nonnegative");
  }
};

const normalize_bounds = (bounds: Bounds): Bounds => {
  assert_finite(bounds.x, "bounds.x");
  assert_finite(bounds.y, "bounds.y");
  assert_finite(bounds.width, "bounds.width");
  assert_finite(bounds.height, "bounds.height");
  return {
    x: Math.min(bounds.x, bounds.x + bounds.width),
    y: Math.min(bounds.y, bounds.y + bounds.height),
    width: Math.abs(bounds.width),
    height: Math.abs(bounds.height),
  };
};

export const create_camera = (options: CameraOptions): Camera => {
  assert_viewport(options.viewport);
  let x = options.x ?? 0;
  let y = options.y ?? 0;
  let zoom = options.zoom ?? 1;
  let rotation = options.rotation ?? 0;
  assert_finite(x, "x");
  assert_finite(y, "y");
  assert_finite(rotation, "rotation");
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new RangeError("zoom must be finite and greater than zero");
  }

  const get_position = (): Point => Object.freeze({ x, y });
  const get_zoom = (): number => zoom;
  const get_rotation = (): number => rotation;
  const set_position = (next_x: number, next_y: number): void => {
    assert_finite(next_x, "x");
    assert_finite(next_y, "y");
    x = next_x;
    y = next_y;
  };
  const set_zoom = (next_zoom: number): void => {
    if (!Number.isFinite(next_zoom) || next_zoom <= 0) {
      throw new RangeError("zoom must be finite and greater than zero");
    }
    zoom = next_zoom;
  };
  const set_rotation = (next_rotation: number): void => {
    assert_finite(next_rotation, "rotation");
    rotation = next_rotation;
  };

  const world_to_screen = (point: Point): Point => {
    assert_finite(point.x, "point.x");
    assert_finite(point.y, "point.y");
    const relative_x = (point.x - x) * zoom;
    const relative_y = (point.y - y) * zoom;
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    return Object.freeze({
      x: options.viewport.logical_width / 2 + relative_x * cosine + relative_y * sine,
      y: options.viewport.logical_height / 2 - relative_x * sine + relative_y * cosine,
    });
  };

  const is_in_view = (bounds: Bounds): boolean => {
    const normalized = normalize_bounds(bounds);
    const corners = [
      world_to_screen({ x: normalized.x, y: normalized.y }),
      world_to_screen({ x: normalized.x + normalized.width, y: normalized.y }),
      world_to_screen({ x: normalized.x, y: normalized.y + normalized.height }),
      world_to_screen({ x: normalized.x + normalized.width, y: normalized.y + normalized.height }),
    ];
    const left = Math.min(...corners.map((corner) => corner.x));
    const right = Math.max(...corners.map((corner) => corner.x));
    const top = Math.min(...corners.map((corner) => corner.y));
    const bottom = Math.max(...corners.map((corner) => corner.y));
    return left <= options.viewport.logical_width && right >= 0 && top <= options.viewport.logical_height && bottom >= 0;
  };

  return Object.freeze({
    get_position,
    get_zoom,
    get_rotation,
    set_position,
    set_zoom,
    set_rotation,
    world_to_screen,
    is_in_view,
  });
};
