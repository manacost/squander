export type PathCommand =
  | Readonly<{ kind: "move"; x: number; y: number }>
  | Readonly<{ kind: "line"; x: number; y: number }>
  | Readonly<{ kind: "quadratic"; control_x: number; control_y: number; x: number; y: number }>
  | Readonly<{
      kind: "cubic";
      control_1_x: number;
      control_1_y: number;
      control_2_x: number;
      control_2_y: number;
      x: number;
      y: number;
    }>
  | Readonly<{ kind: "close" }>;

export type PathInput = readonly PathCommand[];

export type Path = Readonly<{
  get_commands: () => readonly PathCommand[];
  update: (commands: PathInput) => void;
}>;

const point = (kind: "move" | "line", x: number, y: number): PathCommand => Object.freeze({ kind, x, y });

export const move_to = (x: number, y: number): PathCommand => point("move", x, y);

export const line_to = (x: number, y: number): PathCommand => point("line", x, y);

export const quadratic_to = (control_x: number, control_y: number, x: number, y: number): PathCommand =>
  Object.freeze({ kind: "quadratic" as const, control_x, control_y, x, y });

export const cubic_to = (
  control_1_x: number,
  control_1_y: number,
  control_2_x: number,
  control_2_y: number,
  x: number,
  y: number,
): PathCommand => Object.freeze({ kind: "cubic" as const, control_1_x, control_1_y, control_2_x, control_2_y, x, y });

export const close = (): PathCommand => Object.freeze({ kind: "close" as const });

const assert_finite = (value: number, name: string): void => {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
};

const snapshot_command = (command: PathCommand, index: number): PathCommand => {
  switch (command.kind) {
    case "move":
    case "line":
      assert_finite(command.x, `path command ${String(index)} x`);
      assert_finite(command.y, `path command ${String(index)} y`);
      return Object.freeze({ kind: command.kind, x: command.x, y: command.y });
    case "quadratic":
      assert_finite(command.control_x, `path command ${String(index)} control_x`);
      assert_finite(command.control_y, `path command ${String(index)} control_y`);
      assert_finite(command.x, `path command ${String(index)} x`);
      assert_finite(command.y, `path command ${String(index)} y`);
      return Object.freeze({
        kind: "quadratic" as const,
        control_x: command.control_x,
        control_y: command.control_y,
        x: command.x,
        y: command.y,
      });
    case "cubic":
      assert_finite(command.control_1_x, `path command ${String(index)} control_1_x`);
      assert_finite(command.control_1_y, `path command ${String(index)} control_1_y`);
      assert_finite(command.control_2_x, `path command ${String(index)} control_2_x`);
      assert_finite(command.control_2_y, `path command ${String(index)} control_2_y`);
      assert_finite(command.x, `path command ${String(index)} x`);
      assert_finite(command.y, `path command ${String(index)} y`);
      return Object.freeze({
        kind: "cubic" as const,
        control_1_x: command.control_1_x,
        control_1_y: command.control_1_y,
        control_2_x: command.control_2_x,
        control_2_y: command.control_2_y,
        x: command.x,
        y: command.y,
      });
    case "close":
      return Object.freeze({ kind: "close" as const });
  }
};

const snapshot_commands = (input: PathInput): readonly PathCommand[] => {
  if (input.length === 0 || input[0].kind !== "move") {
    throw new RangeError("path must begin with move_to");
  }
  let has_open_subpath = false;
  const commands = input.map((command, index) => {
    const snapshot = snapshot_command(command, index);
    if (snapshot.kind === "move") {
      has_open_subpath = true;
    } else if (snapshot.kind === "close") {
      if (!has_open_subpath) throw new RangeError("path close requires an open subpath");
      has_open_subpath = false;
    } else if (!has_open_subpath) {
      throw new RangeError("path segment requires an open subpath");
    }
    return snapshot;
  });
  return Object.freeze(commands);
};

export const create_path = (input: PathInput): Path => {
  let commands = snapshot_commands(input);
  const get_commands = (): readonly PathCommand[] => commands;
  const update = (next_input: PathInput): void => {
    const next_commands = snapshot_commands(next_input);
    commands = next_commands;
  };
  return Object.freeze({ get_commands, update });
};
