import { rgba, type RenderCommand } from "squander";

export type JumpingRopeStatus = "ready" | "playing" | "game-over";

export type JumpingRopeScoreResult = "none" | "perfect" | "close" | "jump";

export type JumpingRopeState = Readonly<{
  status: JumpingRopeStatus;
  rope_phase: number;
  rope_speed: number;
  target_window_start: number;
  target_window_width: number;
  score: number;
  best_score: number;
  streak: number;
  attempts: number;
  speed_level: number;
  can_jump: boolean;
  last_points: number;
  last_result: JumpingRopeScoreResult;
}>;

export type JumpingRopeGame = Readonly<{
  get_state: () => JumpingRopeState;
  start: () => boolean;
  jump: () => boolean;
  reset: () => void;
  update: (delta_seconds: number) => void;
}>;

export type JumpingRopeOptions = Readonly<{
  rope_speed?: number;
}>;

const canvas_width = 800;
const canvas_height = 450;
const ground_y = 366;
const initial_rope_phase = 0.35;
const target_window_width = 0.02;
const speed_increment = 0.08;
const attempts_per_level = 3;

const target_window_start_for_attempts = (attempts: number): number =>
  0.94 + (Math.floor(attempts / attempts_per_level) % 3) * target_window_width;

const score_for_phase = (
  rope_phase: number,
  target_window_start: number,
): Readonly<{ points: number; result: Exclude<JumpingRopeScoreResult, "none"> }> => {
  const target_center = target_window_start + target_window_width / 2;
  const distance = Math.abs(rope_phase - target_center);
  if (distance <= target_window_width / 4) return { points: 6, result: "perfect" };
  if (distance <= target_window_width / 2) return { points: 3, result: "close" };
  return { points: 1, result: "jump" };
};

const snapshot = (
  status: JumpingRopeStatus,
  rope_phase: number,
  rope_speed: number,
  target_window_start: number,
  score: number,
  best_score: number,
  streak: number,
  attempts: number,
  speed_level: number,
  can_jump: boolean,
  last_points: number,
  last_result: JumpingRopeScoreResult,
): JumpingRopeState =>
  Object.freeze({
    status,
    rope_phase,
    rope_speed,
    target_window_start,
    target_window_width,
    score,
    best_score,
    streak,
    attempts,
    speed_level,
    can_jump,
    last_points,
    last_result,
  });

export const create_jumping_rope_game = (options: JumpingRopeOptions = {}): JumpingRopeGame => {
  const base_rope_speed = options.rope_speed ?? 0.9;
  let status: JumpingRopeStatus = "ready";
  let rope_phase = initial_rope_phase;
  let rope_speed = base_rope_speed;
  let target_window_start = target_window_start_for_attempts(0);
  let score = 0;
  let best_score = 0;
  let streak = 0;
  let attempts = 0;
  let speed_level = 0;
  let can_jump = false;
  let last_points = 0;
  let last_result: JumpingRopeScoreResult = "none";

  const get_state = (): JumpingRopeState =>
    snapshot(
      status,
      rope_phase,
      rope_speed,
      target_window_start,
      score,
      best_score,
      streak,
      attempts,
      speed_level,
      can_jump,
      last_points,
      last_result,
    );

  const start = (): boolean => {
    if (status !== "ready") return false;
    status = "playing";
    can_jump = true;
    return true;
  };

  const jump = (): boolean => {
    if (status !== "playing" || !can_jump) return false;
    const jump_score = score_for_phase(rope_phase, target_window_start);
    can_jump = false;
    attempts += 1;
    score += jump_score.points;
    best_score = Math.max(best_score, score);
    streak = jump_score.points >= 3 ? streak + 1 : 0;
    last_points = jump_score.points;
    last_result = jump_score.result;
    if (attempts % attempts_per_level === 0) {
      speed_level += 1;
      rope_speed = base_rope_speed * (1 + speed_level * speed_increment);
      target_window_start = target_window_start_for_attempts(attempts);
    }
    return true;
  };

  const reset = (): void => {
    status = "ready";
    rope_phase = initial_rope_phase;
    rope_speed = base_rope_speed;
    target_window_start = target_window_start_for_attempts(0);
    score = 0;
    streak = 0;
    attempts = 0;
    speed_level = 0;
    can_jump = false;
    last_points = 0;
    last_result = "none";
  };

  const update = (delta_seconds: number): void => {
    if (status !== "playing") return;
    const delta = Math.max(0, Math.min(delta_seconds, 0.1));
    const next_phase = rope_phase + rope_speed * delta;
    rope_phase = next_phase % 1;
    if (next_phase < 1) return;

    if (can_jump) {
      status = "game-over";
      can_jump = false;
      streak = 0;
      return;
    }
    can_jump = true;
  };

  return Object.freeze({ get_state, start, jump, reset, update });
};

const line = (
  from: Readonly<{ x: number; y: number }>,
  to: Readonly<{ x: number; y: number }>,
  color: ReturnType<typeof rgba>,
  stroke_width: number,
): RenderCommand => ({
  kind: "line",
  draw: { line: { from, to }, color, stroke_width },
});

export const create_draw_commands = (state: JumpingRopeState): RenderCommand[] => {
  const target_active =
    state.status === "playing" &&
    state.can_jump &&
    state.rope_phase >= state.target_window_start &&
    state.rope_phase <= state.target_window_start + state.target_window_width;
  const target_color = target_active ? rgba(0.98, 0.73, 0.35, 1) : rgba(0.34, 0.86, 0.78, 0.85);
  return [
    {
      kind: "rectangle",
      draw: { rectangle: { x: 0, y: 0, width: canvas_width, height: canvas_height }, color: rgba(0.02, 0.03, 0.055, 1) },
    },
    {
      kind: "rectangle",
      draw: {
        rectangle: { x: 0, y: ground_y + 14, width: canvas_width, height: canvas_height - ground_y - 14 },
        color: rgba(0.08, 0.1, 0.16, 1),
      },
    },
    { kind: "rectangle", draw: { rectangle: { x: 0, y: ground_y + 7, width: canvas_width, height: 2 }, color: target_color } },
    { kind: "rectangle", draw: { rectangle: { x: 268, y: ground_y + 3, width: 264, height: 10 }, color: rgba(0.98, 0.73, 0.35, 0.12) } },
    line({ x: 260, y: ground_y + 8 }, { x: 540, y: ground_y + 8 }, target_color, 3),
    line({ x: 300, y: ground_y + 22 }, { x: 500, y: ground_y + 22 }, rgba(0.24, 0.32, 0.46, 0.7), 2),
  ];
};
