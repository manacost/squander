# viewport-sizing

## Goal

Keep logical drawing coordinates usable across responsive containers and display densities.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Support fixed logical dimensions uniformly fitted and centered with letterboxing.
- Support responsive logical dimensions following available CSS size.
- Control letterboxing through viewport sizing, independently of cameras. Unscoped screen coordinates start at the logical content viewport’s top-left and exclude the bars (AD-047).
- Scale centrally in rendering and keep physical device pixel ratio separate from logical units.
- Expose logical dimensions and viewport bounds needed by application layout and aligned Svelte UI.
- Fixed-fill cropping and integer-only scaling are deferred.

## Scenarios

### Letterboxed resize

A 1280 by 720 logical view fits a 1000 by 1000 CSS container: the content is 1000 by 562.5, centered with 218.75 CSS units above and below.

### Responsive density

Changing display density increases physical resolution without changing responsive logical dimensions at the same CSS size.

## Acceptance criteria

- Verify fixed-fit geometry against explicit numerical expectations at wide, tall, and matching aspect ratios.
- Verify responsive logical size follows CSS size and DPR changes do not multiply logical coordinates.
- In a browser resize fixture, verify content stays within its computed viewport and bars do not contain game content.
- Verify published bounds let a DOM overlay align to known rendered landmarks.

## Usage description

Choose fixed dimensions or responsive sizing when creating the game. Use exposed viewport information when UI must align to game content.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Pure sizing tests with numerical expectations; browser resizing, DPR, letterbox, and overlay fixtures.

Use `[viewport-sizing]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-009. Open: physical-pixel rounding, DPR limits, zero-size containers, letterbox color, and runtime policy changes.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
