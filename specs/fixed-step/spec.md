# fixed-step

## Goal

Provide opt-in bounded fixed-step simulation for games that need stable update
increments while preserving the default variable-step browser loop.

## Status

Implemented.

## Requirements

- Set `GameOptions.fixed_step.step_seconds` to enable fixed updates.
- Use `max_steps_per_frame` to bound catch-up work; the default is five.
- Run zero or more fixed updates from each active browser callback, then draw
  exactly once.
- Do not advance the fixed accumulator while paused or hidden.
- Discard excess accumulated time when the per-frame update bound is reached.
  The final update reports `discarded_seconds` and `delta_was_clamped`.
- Keep variable-step behavior, including `max_delta_seconds`, unchanged when
  `fixed_step` is absent.
- Do not interpolate rendering between simulation steps in this version.

## Scenarios

### Stable collision increments

A caller enables a 60 Hz step so collision and movement systems receive the
same `delta_seconds` despite uneven browser callback intervals.

### Overloaded frame

A long callback interval would require more than the configured catch-up
budget. The runtime performs only the allowed number of updates, discards the
remaining whole-step time, preserves the sub-step remainder, and exposes the
discarded amount to the final update.

## Acceptance criteria

- Variable-step games remain behaviorally unchanged by default.
- Identical timestamp sequences produce identical fixed-step updates.
- Catch-up work never exceeds `max_steps_per_frame`.
- Discarded time is observable and does not silently increase elapsed simulation
  time.
- Pause, visibility reset, and disposal retain existing lifecycle guarantees.
- Invalid step sizes and maximums fail synchronously with `RangeError`.

## Usage description

```ts
const game = create_game({
  renderer,
  scheduler,
  fixed_step: { step_seconds: 1 / 60, max_steps_per_frame: 5 },
  update: (time) => {
    position.x += velocity.x * time.delta_seconds;
    if (time.discarded_seconds > 0) report_overload(time.discarded_seconds);
  },
  draw: (frame) => draw_game(frame),
});
```

## Test references

- [`src/lib/core/runtime/frame_loop.test.ts`](../../src/lib/core/runtime/frame_loop.test.ts)
  covers fixed-step ordering, bounded catch-up, discarded time, validation,
  pause, visibility, and disposal.
- [`src/lib/core/runtime/timing.test.ts`](../../src/lib/core/runtime/timing.test.ts)
  covers the stable `UpdateTime` shape and variable-step compatibility.
- [`src/lib/core/runtime/game.test.ts`](../../src/lib/core/runtime/game.test.ts)
  covers game-owned lifecycle setup and disposal with the shared timing API.

Planned verification is covered by the focused runtime tests above; browser
throttling evidence remains a follow-up fixture for the broader timing suite.

## Notes

AD-065. Interpolation, rollback, networking, and a mandatory simulation system
registry remain separate capabilities.
