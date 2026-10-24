# game-timing

## Goal

Advance gameplay using elapsed time while supporting pause and browser visibility changes.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Pass a read-only per-game `UpdateTime` object to variable updates, with excessive-delta protection.
- `delta_seconds` is the simulation step after clamping.
- `elapsed_seconds` sums supplied simulation steps including this update, excluding loading, pauses, hidden time, and discarded excess time.
- `update_index` is the zero-based update invocation count, not the rendered frame count.
- `measured_delta_seconds` is the measured interval before clamping, using a fresh baseline after suspension.
- `delta_was_clamped` indicates whether that measured interval was shortened.
- Cap simulation deltas at 0.1 seconds by default, configurable; discard excess while exposing the measured interval.
- Update and draw are synchronous. Run one update followed by one draw in each active animation callback; skip draw if update fails.
- First update after startup/resume has zero measured/simulation deltas, false clamping flag, unchanged accumulated time, and an advancing update index.
- Provide a new read-only timing snapshot per update; never mutate retained snapshots.
- Orchestrate fetching and explicit asset loading in setup/lifecycle hooks or commands/events, not update/draw. Automatic unseen-glyph preparation is a documented internal exception.
- Explicit pause stops updating but continues drawing. Draw callbacks must not advance simulation state.
- Hidden-document suspension stops updates and drawing. Reset the timing baseline on return and preserve explicit pause.
- Fixed-step scheduling is a Phase 4 candidate; automatic draw skipping is not promised.

## Scenarios

### Paused resize

The developer pauses a game and resizes the host. Rendering can reflect the new viewport while the simulation remains unchanged.

### Returning to a tab

A running game is hidden for a long interval. Showing it again does not feed that interval to update. A manually paused game remains paused.

## Acceptance criteria

- Advance an injected clock through unequal intervals and verify the documented timing values; visible stalls obey the selected cap.
- Verify elapsed time equals the sum of supplied deltas, update indices begin at zero, and measured versus clamped deltas agree with the flag.
- While explicitly paused, observe draw callbacks without update callbacks.
- While hidden, observe neither callback; on return, verify baseline reset and preservation of prior manual pause.

## Usage description

Use `update(time)` for simulation, for example `position.x += speed * time.delta_seconds`, and draw for presentation. Pause from a host control without removing the canvas.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Controlled-clock and scheduler unit tests; browser visibility and resize integration.

Use `[game-timing]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-007, AD-012, and AD-019. Open before implementation: exact configuration names and invalid-cap validation; snapshot fields and scheduling are agreed.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
