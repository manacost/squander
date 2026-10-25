# camera-2d

## Goal

View the 2D world through a basic position, zoom, and rotation transform.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Interpret camera `(x, y)` as the world point shown at the logical viewport center; zoom preserves that centered focus point (AD-040).
- Default to position `(0, 0)`, zoom 1, and rotation 0, centering the world origin independently of viewport dimensions (AD-041). At zoom 1, one world unit maps to one logical viewport unit before viewport/display scaling.
- Apply the basic camera consistently to world sprites, shapes, paths, polygons, and labels.
- Keep camera transforms separate from viewport fitting and physical resolution.
- Permit camera changes to be visible while gameplay is explicitly paused.
- Swappable projections and advanced camera behaviors are deferred.

## Scenarios

### Initial view

Without camera overrides, world (0, 0) appears at the logical viewport center.
A point ten world units to its right appears ten logical viewport units to its
right before viewport fitting and physical display scaling.

### Follow with labels

A sprite and its world label remain aligned while the camera translates and zooms.
Setting the camera position to the sprite’s world position centers it without
application-side viewport or zoom offsets.

### Inspect while paused

A Svelte control rotates the camera while updates are paused; rendering reflects the change.

## Acceptance criteria

- Verify the camera’s world position maps to the logical viewport center across viewport sizes and zoom levels, including a letterboxed viewport; keep physical display scaling separate.
- Verify default camera values and landmark offsets at multiple viewport sizes: world (0, 0) maps to the center and world (10, 0) maps ten logical units to its right.
- Compare transformed world landmarks across primitive types after translation, zoom, and rotation.
- Verify camera changes do not mutate world coordinates or viewport policy.
- Verify camera updates remain visible during explicit pause.

## Usage description

Configure the camera position to the world point you want centered, then apply it to world drawing. The exact camera-binding API is still to be designed.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Independent transform/round-trip tests where conversion is exposed; real mixed-primitive camera fixture.

Use `[camera-2d]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-006, AD-014, AD-040, and AD-041. Open: transform application API, angle convention, and zoom limits.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
