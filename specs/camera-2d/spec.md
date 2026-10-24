# camera-2d

## Goal

View the 2D world through a basic position, zoom, and rotation transform.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Apply the basic camera consistently to world sprites, shapes, paths, polygons, and labels.
- Keep camera transforms separate from viewport fitting and physical resolution.
- Permit camera changes to be visible while gameplay is explicitly paused.
- Swappable projections and advanced camera behaviors are deferred.

## Scenarios

### Follow with labels

A sprite and its world label remain aligned while the camera translates and zooms.

### Inspect while paused

A Svelte control rotates the camera while updates are paused; rendering reflects the change.

## Acceptance criteria

- Compare transformed world landmarks across primitive types after translation, zoom, and rotation.
- Verify camera changes do not mutate world coordinates or viewport policy.
- Verify camera updates remain visible during explicit pause.

## Usage description

Configure a basic camera and apply it to world drawing. The exact camera-binding API is still to be designed.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Independent transform/round-trip tests where conversion is exposed; real mixed-primitive camera fixture.

Use `[camera-2d]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-006 and AD-014. Open: camera position meaning, default origin/view, transform application API, angle convention, and zoom limits.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
