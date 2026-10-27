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
  }
  return Object.freeze({ vertices: Object.freeze(vertices.map((point) => Object.freeze(point))), indices: Object.freeze(indices) });
};
