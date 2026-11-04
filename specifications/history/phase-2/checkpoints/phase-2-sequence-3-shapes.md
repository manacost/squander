# Phase 2 Sequence 3 shapes checkpoint

Status: **CPU validation plus filled-rectangle GPU ordering slice complete; shape capability remains Draft**.

## Implemented slice

- Added signed rectangle normalization with zero-area detection.
- Added finite circle and line validation with value snapshots.
- Added finite nonnegative stroke-width validation.
- Added finite opacity validation in the agreed `[0, 1]` range.
- Added a frame-local filled-rectangle command path using one renderer-owned
  solid texture and shared source-over blending.
- Added a real GPU mixed sprite/rectangle ordering fixture.
- Added a real GPU filled-circle fixture using center/radius placement.
- Added a real GPU flat-ended line fixture using explicit endpoints and centered
  stroke width.
- Added a real GPU rectangle-outline fixture checking edge coverage and a
  transparent interior.
- Added a real GPU circle-outline fixture checking radial edge coverage and a
  transparent center.

## Not implemented

- Curves, antialiasing, caps, joins, and the public
  package draw API.
- Complete shape promotion and all primitive geometry acceptance criteria.

## Trace

The current paths are direct validator tests → normalized/snapshotted CPU value,
and Playwright → trusted Vite origin → renderer command list → normalized
rectangle → renderer-owned solid texture → shared source-over render pass →
exact readback → mixed-order pixel assertion.

## Evidence

- `[shape-drawing] primitive validation` covers signed dimensions, zero-area
  behavior, finite validation, snapshots, stroke widths, and opacity.
- `[shape-drawing] preserves source-over order between a sprite and a rectangle`
  verifies one filled rectangle in the shared GPU command path.
- `[shape-drawing] renders a filled circle from center and radius` verifies
  center/radius placement and circular coverage on a real device.
- `[shape-drawing] renders a centered flat-ended line from explicit endpoints`
  verifies line placement and centered width on a real device.
- `[shape-drawing] keeps the interior transparent for a centered rectangle outline`
  verifies centered outline coverage on a real device.
- `[shape-drawing] keeps the interior transparent for a centered circle outline`
  verifies radial outline coverage on a real device.

## Gate

The next shape step requires broader stroke behavior and additional
independent GPU fixtures. Do not claim complete primitive rendering from this
partial checkpoint.
