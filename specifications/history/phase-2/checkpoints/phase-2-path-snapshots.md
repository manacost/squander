# Phase 2 path snapshot checkpoint

Status: **CPU path command snapshots and sequencing validation verified; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- Typed declarative commands are `move`, `line`, `quadratic`, `cubic`, and
  `close`, with helpers for constructing each command.
- Creation and explicit `update(commands)` snapshot command values and preserve
  caller-owned arrays and command objects.
- A path starts with `move`, segments require an open subpath, and `close`
  ends the current subpath; a later `move` starts a disconnected subpath.
- Nonfinite coordinates and invalid command sequencing are rejected before the
  active snapshot changes.
- This slice intentionally does not claim tessellation, stroke behavior,
  geometry ownership, release, or GPU rendering.

## Implemented slice

- Added typed path command constructors and an opaque path handle.
- Added immutable command snapshots for straight and quadratic/cubic commands.
- Added update validation with stable handle behavior and prior-state
  preservation.

## Evidence

- `npm run test:unit`: passed, 20 files and 58 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- `npm run validate:specs`: passed, 16 capability directories.
- Focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`paths.test.ts` → command helper or caller command array → `create_path()` or
`path.update()` → finite-value and sequencing validation → frozen command
snapshot → `get_commands()`. Failed updates throw before replacing the active
snapshot.

## Known gaps and gate

- Path tessellation, curves rendered to GPU, stroke caps/joins, geometry
  ownership/release, and public package exports remain unimplemented.
- Empty-subpath semantics are intentionally limited to the validated sequencing
  implemented here and require a final contract before broader path behavior.
- Go/no-go: **continue with geometry preparation/tessellation; do not promote
  `paths-and-polygons`.**
