# Phase 2 shared color checkpoint

Status: **Color construction and validation verified; dependent drawing capabilities remain Draft**.

## Pre-slice contract checkpoint

- RGB/RGBA channels are normalized finite numbers in `[0, 1]`.
- HSL/HSLA uses finite hue degrees, wraps hue modulo 360, and uses saturation,
  lightness, and alpha in `[0, 1]`.
- Hex accepts `#RGB`, `#RGBA`, `#RRGGBB`, and `#RRGGBBAA`; hex alpha is the byte
  divided by 255.
- All helpers return one frozen readonly `{ red, green, blue, alpha }` value.
- This slice changes no package exports and does not claim renderer integration.

## Implemented slice

- Added RGB/RGBA, HSL/HSLA, and hex construction helpers.
- Added immediate validation for nonfinite/out-of-range channels and malformed
  hex strings.
- Added equivalence, shorthand, freezing, and invalid-input tests at the helper
  seam.

## Evidence

- Red test first failed because the implementation module did not exist.
- `npm run test:unit`: passed, 17 files and 48 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.

## Code trace

`colors.test.ts` → helper call → range/format validation → RGB conversion →
frozen readonly `Color` value. No renderer, GPU resource, or package export is
involved in this slice.

## Known gaps and gate

- Sprite, shape, and text renderers do not yet consume `Color`.
- GPU color-space behavior and visual tint equivalence remain unverified.
- Go/no-go: **allow dependent renderer work to consume this contract; do not
  promote sprite, shape, or text capabilities from this checkpoint.**
