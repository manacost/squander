import type { FlattenedSubpath } from "./path_flattening.js";
import type { PolygonPoint } from "./polygons.js";

export type StrokeGeometry = Readonly<{
  vertices: readonly PolygonPoint[];
  indices: readonly number[];
}>;

export type StrokeCap = "butt" | "square" | "round";
export type StrokeJoin = "miter" | "bevel" | "round";
export type StrokeGeometryOptions = Readonly<{ cap?: StrokeCap; join?: StrokeJoin; miter_limit?: number }>;

const assert_width = (width: number): number => {
  if (!Number.isFinite(width) || width <= 0) throw new RangeError("stroke width must be finite and positive");
  return width;
};

const same_point = (left: PolygonPoint, right: PolygonPoint): boolean => left.x === right.x && left.y === right.y;
const default_miter_limit = 4;

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
  join: StrokeJoin,
  miter_limit: number,
): void => {
  const first_normal = normal(previous, current, half_width);
  const second_normal = normal(current, next, half_width);
  if (!first_normal || !second_normal) return;
  const turn = (current.x - previous.x) * (next.y - current.y) - (current.y - previous.y) * (next.x - current.x);
  if (turn === 0) return;
  // Positive cross products are clockwise turns in the positive-Y-down world;
  // the outer side is the opposite of the mathematical left normal.
  const side = turn > 0 ? -1 : 1;
  const outer_first = { x: side * first_normal.x, y: side * first_normal.y };
  const outer_second = { x: side * second_normal.x, y: side * second_normal.y };
  const miter_sum = { x: outer_first.x + outer_second.x, y: outer_first.y + outer_second.y };
  const miter_length = Math.hypot(miter_sum.x, miter_sum.y);
  const miter_unit = miter_length === 0 ? undefined : { x: miter_sum.x / miter_length, y: miter_sum.y / miter_length };
  const first_unit_length = Math.hypot(outer_first.x, outer_first.y);
  const miter_ratio =
    miter_unit && first_unit_length > 0
      ? Math.abs(1 / ((miter_unit.x * outer_first.x + miter_unit.y * outer_first.y) / first_unit_length))
      : Infinity;
  const base = vertices.length;
  const first_outer = { x: current.x + outer_first.x, y: current.y + outer_first.y };
  const second_outer = { x: current.x + outer_second.x, y: current.y + outer_second.y };
  if (join === "round") {
    const first_angle = Math.atan2(outer_first.y, outer_first.x);
    const second_angle = Math.atan2(outer_second.y, outer_second.x);
    let sweep = second_angle - first_angle;
    if (side < 0 && sweep < 0) sweep += Math.PI * 2;
    if (side > 0 && sweep > 0) sweep -= Math.PI * 2;
    const segments = Math.max(1, Math.ceil(Math.abs(sweep) / (Math.PI / 8)));
    const base = vertices.length;
    vertices.push(current, first_outer);
    for (let index = 1; index <= segments; index += 1) {
      const angle = first_angle + (sweep * index) / segments;
      vertices.push({
        x: current.x + Math.cos(angle) * half_width,
        y: current.y + Math.sin(angle) * half_width,
      });
      indices.push(base, base + index, base + index + 1);
    }
    return;
  }
  const join_point =
    join === "miter" && miter_unit && miter_ratio <= miter_limit
      ? { x: current.x + miter_unit.x * half_width * miter_ratio, y: current.y + miter_unit.y * half_width * miter_ratio }
      : { x: current.x, y: current.y };
  vertices.push(first_outer, second_outer, join_point);
  indices.push(base, base + 1, base + 2);
};

const assert_option = <Value extends string>(value: Value | undefined, supported: readonly Value[], name: string): Value | undefined => {
  if (value !== undefined && !supported.includes(value)) throw new RangeError(`unsupported stroke ${name}: ${value}`);
  return value;
};

const add_round_cap = (
  vertices: PolygonPoint[],
  indices: number[],
  point: PolygonPoint,
  normal_vector: PolygonPoint,
  start: boolean,
): void => {
  const base = vertices.length;
  const segments = 8;
  vertices.push(point);
  const start_angle = Math.atan2(start ? normal_vector.y : -normal_vector.y, start ? normal_vector.x : -normal_vector.x);
  const sweep = start ? Math.PI : -Math.PI;
  for (let index = 0; index <= segments; index += 1) {
    const angle = start_angle + (sweep * index) / segments;
    vertices.push({
      x: point.x + Math.cos(angle) * Math.hypot(normal_vector.x, normal_vector.y),
      y: point.y + Math.sin(angle) * Math.hypot(normal_vector.x, normal_vector.y),
    });
    if (index > 0) indices.push(base, base + index, base + index + 1);
  }
};

export const create_stroke_geometry = (
  subpaths: readonly FlattenedSubpath[],
  width: number,
  options: StrokeGeometryOptions = {},
): StrokeGeometry => {
  const half_width = assert_width(width) / 2;
  const cap = assert_option(options.cap, ["butt", "square", "round"], "cap") ?? "butt";
  const join = assert_option(options.join, ["miter", "bevel", "round"], "join") ?? "miter";
  const miter_limit = options.miter_limit ?? default_miter_limit;
  if (!Number.isFinite(miter_limit) || miter_limit < 1) throw new RangeError("miter_limit must be finite and at least one");
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
      const extension_start = !subpath.closed && index === 0 && cap === "square" ? half_width : 0;
      const extension_end = !subpath.closed && index === segment_count - 1 && cap === "square" ? half_width : 0;
      const unit_x = dx / length;
      const unit_y = dy / length;
      const base = vertices.length;
      vertices.push(
        { x: start.x - unit_x * extension_start + normal_x, y: start.y - unit_y * extension_start + normal_y },
        { x: end.x + unit_x * extension_end + normal_x, y: end.y + unit_y * extension_end + normal_y },
        { x: end.x + unit_x * extension_end - normal_x, y: end.y + unit_y * extension_end - normal_y },
        { x: start.x - unit_x * extension_start - normal_x, y: start.y - unit_y * extension_start - normal_y },
      );
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      if (!subpath.closed && cap === "round" && index === 0) add_round_cap(vertices, indices, start, { x: normal_x, y: normal_y }, true);
      if (!subpath.closed && cap === "round" && index === segment_count - 1)
        add_round_cap(vertices, indices, end, { x: normal_x, y: normal_y }, false);
    }
    const unique_point_count = subpath.closed ? points.length - 1 : points.length;
    const join_end = subpath.closed ? unique_point_count - 1 : unique_point_count - 2;
    const join_start = subpath.closed ? 0 : 1;
    for (let index = join_start; index <= join_end; index += 1) {
      const previous = points[(index + unique_point_count - 1) % unique_point_count];
      const current = points[index];
      const next = points[(index + 1) % unique_point_count];
      add_join(vertices, indices, previous, current, next, half_width, join, miter_limit);
    }
  }
  return Object.freeze({ vertices: Object.freeze(vertices.map((point) => Object.freeze(point))), indices: Object.freeze(indices) });
};
