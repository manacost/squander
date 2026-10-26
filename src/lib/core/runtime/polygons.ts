export type PolygonPoint = Readonly<{ x: number; y: number }>;
export type PolygonInput = readonly PolygonPoint[];

export type Polygon = Readonly<{
  get_points: () => readonly PolygonPoint[];
  update: (points: PolygonInput) => void;
}>;

const assert_point = (point: PolygonPoint, index: number): void => {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError(`polygon point ${String(index)} must be finite`);
  }
};

const same_point = (left: PolygonPoint, right: PolygonPoint): boolean => left.x === right.x && left.y === right.y;

const snapshot_points = (input: PolygonInput): readonly PolygonPoint[] => {
  const points = input.map((point, index) => {
    assert_point(point, index);
    return Object.freeze({ x: point.x, y: point.y });
  });
  const compacted = points.filter((point, index) => index === 0 || !same_point(point, points[index - 1]));
  if (compacted.length > 1 && same_point(compacted[0], compacted[compacted.length - 1])) {
    compacted.pop();
  }
  if (compacted.length < 3 || new Set(compacted.map((point) => `${String(point.x)}:${String(point.y)}`)).size < 3) {
    throw new RangeError("polygon needs at least three distinct points");
  }
  return Object.freeze(compacted);
};

const cross = (a: PolygonPoint, b: PolygonPoint, c: PolygonPoint): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const orientation_intersects = (a: PolygonPoint, b: PolygonPoint, c: PolygonPoint, d: PolygonPoint): boolean => {
  const ab_c = cross(a, b, c);
  const ab_d = cross(a, b, d);
  const cd_a = cross(c, d, a);
  const cd_b = cross(c, d, b);
  return ab_c * ab_d < 0 && cd_a * cd_b < 0;
};

const validate_geometry = (points: readonly PolygonPoint[]): void => {
  for (let first = 0; first < points.length; first += 1) {
    const first_next = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const second_next = (second + 1) % points.length;
      if (first === second || first_next === second || second_next === first) continue;
      if (orientation_intersects(points[first], points[first_next], points[second], points[second_next])) {
        throw new RangeError("polygon edges must not self-intersect");
      }
    }
  }
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    area += points[index].x * next.y - next.x * points[index].y;
  }
  if (area === 0) {
    throw new RangeError("polygon area must be nonzero");
  }
};

export const create_polygon = (input: PolygonInput): Polygon => {
  let points = snapshot_points(input);
  validate_geometry(points);
  const get_points = (): readonly PolygonPoint[] => points;
  const update = (next_input: PolygonInput): void => {
    const next_points = snapshot_points(next_input);
    validate_geometry(next_points);
    points = next_points;
  };
  return Object.freeze({ get_points, update });
};
