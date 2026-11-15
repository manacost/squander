import { create_polygon, type PolygonPoint, type PolygonInput } from "./polygons.js";
import type { FlattenedSubpath } from "./path_flattening.js";

export type TriangulatedPolygon = Readonly<{
  vertices: readonly PolygonPoint[];
  indices: readonly number[];
}>;

export type FillRule = "even_odd";

type Ring = { points: PolygonPoint[]; area: number; depth: number };

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
  const has_negative = [first, second, third].some((value) => value < 0);
  const has_positive = [first, second, third].some((value) => value > 0);
  return (
    !(has_negative && has_positive) &&
    is_between(point.x, Math.min(a.x, b.x, c.x), Math.max(a.x, b.x, c.x)) &&
    is_between(point.y, Math.min(a.y, b.y, c.y), Math.max(a.y, b.y, c.y))
  );
};

const same_point = (left: PolygonPoint, right: PolygonPoint): boolean => left.x === right.x && left.y === right.y;

const point_in_ring = (point: PolygonPoint, ring: readonly PolygonPoint[]): boolean => {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const current = ring[index];
    const prior = ring[previous];
    if (current.y > point.y !== prior.y > point.y) {
      const intersection_x = ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y) + current.x;
      if (point.x < intersection_x) inside = !inside;
    }
  }
  return inside;
};

const segments_intersect = (a: PolygonPoint, b: PolygonPoint, c: PolygonPoint, d: PolygonPoint): boolean => {
  const first = cross(a, b, c);
  const second = cross(a, b, d);
  const third = cross(c, d, a);
  const fourth = cross(c, d, b);
  return first * second < 0 && third * fourth < 0;
};

const bridge_is_clear = (start: PolygonPoint, end: PolygonPoint, outer: readonly PolygonPoint[], holes: readonly Ring[]): boolean => {
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  if (!point_in_ring(midpoint, outer) || holes.some((hole) => point_in_ring(midpoint, hole.points))) return false;
  const rings = [{ points: [...outer] }, ...holes];
  return rings.every((ring) =>
    ring.points.every((point, index) => {
      const next = ring.points[(index + 1) % ring.points.length];
      if (point === start || point === end || next === start || next === end) return true;
      return !segments_intersect(start, end, point, next);
    }),
  );
};

const merge_hole = (outer: PolygonPoint[], hole: Ring, holes: readonly Ring[]): PolygonPoint[] => {
  const hole_index = hole.points.reduce((best, point, index, points) => {
    const candidate = points[best];
    return point.x > candidate.x || (point.x === candidate.x && point.y < candidate.y) ? index : best;
  }, 0);
  const candidates = outer
    .map((point, index) => ({
      point,
      index,
      distance: Math.hypot(point.x - hole.points[hole_index].x, point.y - hole.points[hole_index].y),
    }))
    .sort((left, right) => left.distance - right.distance);
  const bridge = candidates.find(({ point }) => bridge_is_clear(hole.points[hole_index], point, outer, holes));
  if (bridge === undefined) throw new RangeError("filled path hole cannot be connected to its enclosing boundary");
  const hole_cycle = [...hole.points.slice(hole_index), ...hole.points.slice(0, hole_index), hole.points[hole_index]];
  return [...outer.slice(0, bridge.index + 1), ...hole_cycle, outer[bridge.index], ...outer.slice(bridge.index + 1)];
};

const triangulate_simple = (points: readonly PolygonPoint[]): TriangulatedPolygon => {
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
            !same_point(points[candidate], points[previous]) &&
            !same_point(points[candidate], points[current]) &&
            !same_point(points[candidate], points[next]) &&
            point_in_triangle(points[candidate], points[previous], points[current], points[next]),
        )
      )
        continue;
      indices.push(previous, current, next);
      remaining.splice(index, 1);
      ear_found = true;
      break;
    }
    if (!ear_found) throw new RangeError("filled path could not be triangulated");
  }
  indices.push(remaining[0], remaining[1], remaining[2]);
  return Object.freeze({ vertices: Object.freeze(points), indices: Object.freeze(indices) });
};

const normalize_ring = (subpath: FlattenedSubpath): Ring => {
  if (!subpath.closed) throw new RangeError("filled path subpaths must be closed");
  const points = subpath.points.filter((point, index, values) => {
    if (index === 0) return true;
    const previous = values[index - 1];
    return previous.x !== point.x || previous.y !== point.y;
  });
  if (points.length > 1 && points[0].x === points.at(-1)?.x && points[0].y === points.at(-1)?.y) points.pop();
  const polygon = create_polygon(points);
  const normalized = [...polygon.get_points()];
  return { points: normalized, area: signed_area(normalized), depth: 0 };
};

export function triangulate_subpaths(subpaths: readonly FlattenedSubpath[], fill_rule?: FillRule): TriangulatedPolygon;
export function triangulate_subpaths(subpaths: readonly FlattenedSubpath[], fill_rule = "even_odd"): TriangulatedPolygon {
  if (fill_rule !== "even_odd") throw new RangeError(`unsupported fill rule: ${fill_rule}`);
  const rings = subpaths.map(normalize_ring);
  if (rings.length === 0) throw new RangeError("filled path requires at least one subpath");
  rings.forEach((ring) => {
    ring.depth = rings.filter((candidate) => candidate !== ring && point_in_ring(ring.points[0], candidate.points)).length;
  });
  const vertices: PolygonPoint[] = [];
  const indices: number[] = [];
  rings
    .filter((ring) => ring.depth % 2 === 0)
    .forEach((outer_ring) => {
      const outer = outer_ring.area >= 0 ? [...outer_ring.points] : [...outer_ring.points].reverse();
      const holes = rings
        .filter((ring) => ring.depth === outer_ring.depth + 1 && point_in_ring(ring.points[0], outer))
        .map((ring) => ({ ...ring, points: ring.area <= 0 ? [...ring.points] : [...ring.points].reverse() }));
      const merged = holes.reduce((current, hole, index) => merge_hole(current, hole, holes.slice(index + 1)), outer);
      const triangulated = triangulate_simple(merged);
      const offset = vertices.length;
      vertices.push(...triangulated.vertices);
      indices.push(...triangulated.indices.map((index) => index + offset));
    });
  if (indices.length === 0) throw new RangeError("filled path produced no fill");
  return Object.freeze({ vertices: Object.freeze(vertices), indices: Object.freeze(indices) });
}

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
