# Phase 2 angle helper checkpoint

Status: **Degree conversion verified; dependent camera and sprite APIs remain Draft**.

## Pre-slice contract checkpoint

- `degrees(value)` accepts finite degree values and returns radians.
- Positive values use the agreed clockwise convention in the positive-Y-down
  drawing coordinate system; the helper itself performs only conversion.
- No branded angle type or automatic normalization is introduced.

## Implemented slice

- Added the shared `degrees` helper.
- Added direct tests for zero, positive/negative quarter-turns, full turn, and
  nonfinite rejection.

## Evidence

- `npm run test:unit`: expected 18 files and 50 tests after this slice.
- `npm run check`, `npm run test:type`, spec validation, lint, formatting, and
  diff checks are required before commit.

## Code trace

`angles.test.ts` → `degrees` → finite validation → radians conversion. No renderer
or package export is changed by this slice.

## Known gaps and gate

- Camera scopes and public sprite/camera integration remain unimplemented.
- Go/no-go: **allow camera and drawing contracts to consume this helper; do not
  promote those capabilities from this checkpoint.**
