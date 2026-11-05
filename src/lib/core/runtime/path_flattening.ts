import { close, create_path, cubic_to, line_to, move_to, quadratic_to, type PathCommand, type PathInput } from "./paths.js";
import type { PolygonPoint } from "./polygons.js";

export { close, cubic_to, line_to, move_to, quadratic_to };

export type FlattenedSubpath = Readonly<{
  points: readonly PolygonPoint[];
  closed: boolean;
}>;

const distance = (left: PolygonPoint, right: PolygonPoint): number => Math.hypot(left.x - right.x, left.y - right.y);

const line_distance = (point: PolygonPoint, start: PolygonPoint, end: PolygonPoint): number => {
  const length = distance(start, end);
  if (length === 0) return distance(point, start);
  return Math.abs((end.x - start.x) * (start.y - point.y) - (start.x - point.x) * (end.y - start.y)) / length;
};

const midpoint = (left: PolygonPoint, right: PolygonPoint): PolygonPoint => ({
  x: (left.x + right.x) / 2,
  y: (left.y + right.y) / 2,
});

const flatten_quadratic = (
  start: PolygonPoint,
  control: PolygonPoint,
  end: PolygonPoint,
  tolerance: number,
  points: PolygonPoint[],
  depth: number,
): void => {
  if (line_distance(control, start, end) <= tolerance || depth >= 12) {
    points.push(end);
    return;
  }
  const start_control = midpoint(start, control);
  const control_end = midpoint(control, end);
  const center = midpoint(start_control, control_end);
  flatten_quadratic(start, start_control, center, tolerance, points, depth + 1);
  flatten_quadratic(center, control_end, end, tolerance, points, depth + 1);
};

const flatten_cubic = (
  start: PolygonPoint,
  control_1: PolygonPoint,
  control_2: PolygonPoint,
  end: PolygonPoint,
  tolerance: number,
  points: PolygonPoint[],
  depth: number,
): void => {
  if (Math.max(line_distance(control_1, start, end), line_distance(control_2, start, end)) <= tolerance || depth >= 12) {
    points.push(end);
    return;
  }
  const start_control_1 = midpoint(start, control_1);
  const controls = midpoint(control_1, control_2);
  const control_2_end = midpoint(control_2, end);
  const left_control = midpoint(start_control_1, controls);
  const right_control = midpoint(controls, control_2_end);
  const center = midpoint(left_control, right_control);
  flatten_cubic(start, start_control_1, left_control, center, tolerance, points, depth + 1);
  flatten_cubic(center, right_control, control_2_end, end, tolerance, points, depth + 1);
};

const finite_positive = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError("path flattening tolerance must be finite and positive");
  return value;
};

const snapshot_point = (point: PolygonPoint): PolygonPoint => Object.freeze({ x: point.x, y: point.y });

export const flatten_path = (input: PathInput, tolerance: number): readonly FlattenedSubpath[] => {
  const commands = create_path(input).get_commands();
  const flatness = finite_positive(tolerance);
  const subpaths: { points: PolygonPoint[]; closed: boolean }[] = [];
  let current: PolygonPoint | undefined;
  let start: PolygonPoint | undefined;

  for (const command of commands) {
    if (command.kind === "move") {
      const point = snapshot_point(command);
      const subpath = { points: [point], closed: false };
      subpaths.push(subpath);
      current = point;
      start = point;
      continue;
    }
    const active = subpaths.at(-1);
    if (active === undefined || current === undefined) throw new Error("path command must begin with move");
    if (command.kind === "line") {
      current = snapshot_point(command);
      active.points.push(current);
    } else if (command.kind === "quadratic") {
      const end = snapshot_point(command);
      flatten_quadratic(current, { x: command.control_x, y: command.control_y }, end, flatness, active.points, 0);
      current = end;
    } else if (command.kind === "cubic") {
      const end = snapshot_point(command);
      flatten_cubic(
        current,
        { x: command.control_1_x, y: command.control_1_y },
        { x: command.control_2_x, y: command.control_2_y },
        end,
        flatness,
        active.points,
        0,
      );
      current = end;
    } else {
      if (start !== undefined && distance(current, start) > 0) active.points.push(start);
      active.closed = true;
      current = undefined;
      start = undefined;
    }
  }
  return Object.freeze(subpaths.map((subpath) => Object.freeze({ points: Object.freeze(subpath.points), closed: subpath.closed })));
};

export type { PathCommand, PathInput };
