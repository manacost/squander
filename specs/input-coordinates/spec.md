# input-coordinates

## Goal

Map browser host-relative pointer input into an optional logical viewport while
preserving raw CSS coordinates and identifying letterbox input.

## Status

Implemented.

## Requirements

- `BrowserInputAdapterOptions.viewport` is optional.
- Existing `x` and `y` remain host-relative CSS pixels.
- Configured adapters add `logical_x`, `logical_y`, and
  `inside_logical_content` to pointer events.
- Fixed-fit mapping subtracts viewport offsets and scales by logical content
  dimensions. Coordinates outside content remain available and are not clamped.
- Responsive mapping uses a one-to-one logical/content mapping.
- Pointer cancellation is reported as phase `"cancel"`.
- Blur and visibility loss synthesize key-up and pointer-cancel events for
  active adapter state, then release pointer capture when available.
- The adapter does not map to camera or world coordinates.

## Scenarios

### Fixed-fit letterbox

A 800×450 game is hosted in a square element. A pointer in the content maps to
logical coordinates; a pointer in the top or bottom bar is marked outside while
its raw and logical coordinates remain available.

### Lifecycle recovery

A browser tab loses focus while a key and pointer are held. The adapter clears
both active states so gameplay cannot remain stuck after focus returns.

## Acceptance criteria

- Fixed-fit and responsive mapping produce the documented logical values.
- Outside-content coordinates are not clamped.
- Unconfigured adapters preserve the existing event shape.
- Pointer cancel is distinct from pointer move and releases capture.
- Blur and visibility recovery clear active input without adding a new loop.

## Usage description

```ts
const input_adapter = create_browser_input_adapter({
  host: canvas,
  router: game.input,
  viewport: game.get_viewport(),
});
```

## Test references

- [`src/lib/core/runtime/browser_input.test.ts`](../../src/lib/core/runtime/browser_input.test.ts)
  covers fixed-fit and responsive mapping, cancellation, focus recovery,
  pointer capture, and compatibility behavior.
- [`src/lib/core/runtime/viewport_sizing.test.ts`](../../src/lib/core/runtime/viewport_sizing.test.ts)
  covers the viewport values consumed by the mapper.
- [`tests/input-routing.spec.ts`](../../tests/input-routing.spec.ts) covers the
  browser host behavior and the dedicated fixed-fit letterbox fixture. The
  fixture verifies raw CSS coordinates, logical coordinates, and the
  `inside_logical_content` flag for both content and letterbox pointers.
- The dedicated browser case is tagged `[input-coordinates]` for focused runs.

## Notes

Camera/world mapping, hit testing, gestures, and action mapping remain separate
capabilities.
