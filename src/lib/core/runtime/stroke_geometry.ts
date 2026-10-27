import type { FlattenedSubpath } from "./path_flattening.js";
import type { PolygonPoint } from "./polygons.js";

export type StrokeGeometry = Readonly<{
  vertices: readonly PolygonPoint[];
  indices: readonly number[];
}>;

const assert_width = (width: number): number => {
  if (!Number.isFinite(width) || width <= 0) throw new RangeError("stroke width must be finite and positive");
  return width;
};

const same_point = (left: PolygonPoint, right: PolygonPoint): boolean => left.x === right.x && left.y === right.y;

const normal = (start: PolygonPoint, end: PolygonPoint, half_width: number): PolygonPoint | undefined => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return undefined;
  return { x: (-dy / length) * half_width, y: (dx / length) * half_width };
};

const add_join = (
  vertices: PolygonPoint[],
  indices: number[],
  previous: PolygonPoint,
  current: PolygonPoint,
  next: PolygonPoint,
  half_width: number,
): void => {
  const first_normal = normal(previous, current, half_width);
  const second_normal = normal(current, next, half_width);
  if (!first_normal || !second_normal) return;
  const turn = (current.x - previous.x) * (next.y - current.y) - (current.y - previous.y) * (next.x - current.x);
  if (turn === 0) return;
  const side = turn > 0 ? 1 : -1;
  const base = vertices.length;
  vertices.push(
    { x: current.x + side * first_normal.x, y: current.y + side * first_normal.y },
    { x: current.x + side * second_normal.x, y: current.y + side * second_normal.y },
    { x: current.x, y: current.y },
  );
  indices.push(base, base + 1, base + 2);
};

export const create_stroke_geometry = (subpaths: readonly FlattenedSubpath[], width: number): StrokeGeometry => {
  const half_width = assert_width(width) / 2;
  const vertices: PolygonPoint[] = [];
  const indices: number[] = [];
  for (const subpath of subpaths) {
    const points = subpath.points;
    const segment_count = subpath.closed ? points.length - 1 : points.length - 1;
    for (let index = 0; index < segment_count; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length === 0 || same_point(start, end)) continue;
      const normal_x = (-dy / length) * half_width;
      const normal_y = (dx / length) * half_width;
      const base = vertices.length;
      vertices.push(
        { x: start.x + normal_x, y: start.y + normal_y },
        { x: end.x + normal_x, y: end.y + normal_y },
        { x: end.x - normal_x, y: end.y - normal_y },
        { x: start.x - normal_x, y: start.y - normal_y },
      );
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    const join_end = subpath.closed ? points.length - 1 : points.length - 2;
    const join_start = subpath.closed ? 0 : 1;
    for (let index = join_start; index <= join_end; index += 1) {
      const previous = points[(index + points.length - 1) % points.length];
      const current = points[index];
      const next = points[(index + 1) % points.length];
      add_join(vertices, indices, previous, current, next, half_width);
    }
  }
  return Object.freeze({ vertices: Object.freeze(vertices.map((point) => Object.freeze(point))), indices: Object.freeze(indices) });
};
