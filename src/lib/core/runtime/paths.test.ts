import { describe, expect, it } from "vitest";
import { close, create_path, cubic_to, line_to, move_to, quadratic_to } from "./paths.js";

describe("[paths-and-polygons] path command snapshots", () => {
  it("snapshots declarative commands and isolates later caller edits", () => {
    const commands = [move_to(0, 0), line_to(10, 0), close()];
    const route = create_path(commands);

    commands[1] = line_to(20, 5);

    expect(route.get_commands()).toEqual([{ kind: "move", x: 0, y: 0 }, { kind: "line", x: 10, y: 0 }, { kind: "close" }]);
  });

  it("supports disconnected subpaths and curve command values", () => {
    const route = create_path([move_to(0, 0), quadratic_to(5, 10, 10, 0), move_to(0, 20), cubic_to(5, 30, 15, 10, 20, 20), close()]);

    expect(route.get_commands()).toEqual([
      { kind: "move", x: 0, y: 0 },
      { kind: "quadratic", control_x: 5, control_y: 10, x: 10, y: 0 },
      { kind: "move", x: 0, y: 20 },
      { kind: "cubic", control_1_x: 5, control_1_y: 30, control_2_x: 15, control_2_y: 10, x: 20, y: 20 },
      { kind: "close" },
    ]);
  });

  it("updates the same handle only after validating the new command sequence", () => {
    const route = create_path([move_to(0, 0), line_to(10, 0)]);
    const before = route.get_commands();

    route.update([move_to(1, 2), line_to(30, 4)]);
    expect(route.get_commands()).toEqual([
      { kind: "move", x: 1, y: 2 },
      { kind: "line", x: 30, y: 4 },
    ]);

    expect(() => {
      route.update([line_to(4, 5)]);
    }).toThrow(RangeError);
    expect(before).toEqual([
      { kind: "move", x: 0, y: 0 },
      { kind: "line", x: 10, y: 0 },
    ]);
    expect(route.get_commands()).toEqual([
      { kind: "move", x: 1, y: 2 },
      { kind: "line", x: 30, y: 4 },
    ]);
  });

  it("rejects nonfinite values and commands after close", () => {
    expect(() => create_path([move_to(0, 0), line_to(Number.NaN, 1)])).toThrow(RangeError);
    expect(() => create_path([move_to(0, 0), close(), line_to(2, 2)])).toThrow(RangeError);
  });
});
