# Phase 2 Sequence 3 shapes checkpoint

Status: **CPU validation complete; GPU rendering remains gated**.

## Implemented slice

- Added signed rectangle normalization with zero-area detection.
- Added finite circle and line validation with value snapshots.
- Added finite nonnegative stroke-width validation.
- Added finite opacity validation in the agreed `[0, 1]` range.

## Not implemented

- GPU geometry buffers, fills, outlines, curves, antialiasing, caps, joins,
  source-over blending, or pixel readback.
- Public draw API and mixed primitive submission ordering.

## Trace

The current path is direct test import → primitive validator → normalized or
snapshotted CPU value. No GPU command encoder or public package export imports
these helpers.

## Evidence

- `[shape-drawing] primitive validation` covers signed dimensions, zero-area
  behavior, finite validation, snapshots, stroke widths, and opacity.
- The full unit suite and targeted runtime lint/format checks must be refreshed
  before this checkpoint is committed.

## Gate

The next shape step requires a real draw-command representation and WebGPU
fixture. Do not claim primitive rendering from this CPU validation checkpoint.
