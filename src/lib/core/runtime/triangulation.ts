import { create_polygon, type PolygonPoint, type PolygonInput } from "./polygons.js";

export type TriangulatedPolygon = Readonly<{
  vertices: readonly PolygonPoint[];
  indices: readonly number[];
}>;

const cross = (a: PolygonPoint, b: PolygonPoint, c: PolygonPoint): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const signed_area = (points: readonly PolygonPoint[]): number => {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    area += points[index].x * next.y - next.x * points[index].y;
  }
  return area / 2;
};

const is_between = (value: number, left: number, right: number): boolean =>
  value >= Math.min(left, right) && value <= Math.max(left, right);

const point_in_triangle = (point: PolygonPoint, a: PolygonPoint, b: PolygonPoint, c: PolygonPoint): boolean => {
  const first = cross(a, b, point);
  const second = cross(b, c, point);
  const third = cross(c, a, point);
  const has_negative = first < 0 || second < 0 || third < 0;
  const has_positive = first > 0 || second > 0 || third > 0;
  return (
    !(has_negative && has_positive) &&
    is_between(point.x, Math.min(a.x, b.x, c.x), Math.max(a.x, b.x, c.x)) &&
    is_between(point.y, Math.min(a.y, b.y, c.y), Math.max(a.y, b.y, c.y))
  );
};

export const triangulate_polygon = (input: PolygonInput): TriangulatedPolygon => {
  const points = create_polygon(input).get_points();
  const input_winding = signed_area(points) >= 0 ? 1 : -1;
  const remaining = Array.from({ length: points.length }, (_, index) => (input_winding > 0 ? index : points.length - 1 - index));
  const indices: number[] = [];
  while (remaining.length > 3) {
    let ear_found = false;
    for (let index = 0; index < remaining.length; index += 1) {
      const previous = remaining[(index + remaining.length - 1) % remaining.length];
      const current = remaining[index];
      const next = remaining[(index + 1) % remaining.length];
      if (cross(points[previous], points[current], points[next]) <= 0) continue;
      if (
        remaining.some(
          (candidate) =>
            candidate !== previous &&
            candidate !== current &&
            candidate !== next &&
            point_in_triangle(points[candidate], points[previous], points[current], points[next]),
        )
      )
        continue;
      indices.push(previous, current, next);
      remaining.splice(index, 1);
      ear_found = true;
      break;
    }
    if (!ear_found) throw new RangeError("polygon could not be triangulated");
  }
  indices.push(remaining[0], remaining[1], remaining[2]);
  return Object.freeze({ vertices: points, indices: Object.freeze(indices) });
};
