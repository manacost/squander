# camera-2d

## Goal

View the 2D world through a basic position, zoom, and rotation transform.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Use synchronous `camera.draw(callback)` scopes; restore previous drawing state on normal completion or exceptions and propagate callback errors. Accept reusable or inline functions; do not extend scopes across asynchronous work (AD-045).
- If scopes nest, the inner camera replaces the outer transform without composition; restore the outer camera on normal or exceptional exit. Nesting is supported but secondary to single-scope usage (AD-046).
- Create reusable cameras and apply them through explicit scopes inside `draw`. Scoped drawing uses world coordinates; unscoped drawing uses screen coordinates. Cameras are not implicitly applied to all draws (AD-044).

- Interpret camera `(x, y)` as the world point shown at the logical viewport center; zoom preserves that centered focus point (AD-040).
- Default to position `(0, 0)`, zoom 1, and rotation 0, centering the world origin independently of viewport dimensions (AD-041). At zoom 1, one world unit maps to one logical viewport unit before viewport/display scaling.
- Treat zoom as a positive magnification factor: 2 doubles size, 0.5 halves it. Reject zero, negative, and nonfinite values; applications choose gameplay limits (AD-042).
- Interpret rotation as camera orientation in world space, in radians with `degrees()` available. Positive camera rotation is clockwise; world content is transformed by the inverse rotation about the viewport center (AD-043).
- Apply the basic camera consistently to world sprites, shapes, paths, polygons, and labels.
- Keep camera transforms separate from viewport fitting and physical resolution.
- Permit camera changes to be visible while gameplay is explicitly paused.
- Swappable projections and advanced camera behaviors are deferred.

## Scenarios

### Initial view

Inside a camera scope using default values, world (0, 0) appears at the logical viewport center.
A point ten world units to its right appears ten logical viewport units to its
right before viewport fitting and physical display scaling.

### World and screen drawing

An application draws game content inside a camera scope, then draws a marker
outside it. Camera position, zoom, and rotation affect the world content but not
the screen-space marker. The camera can be reused on subsequent frames.

### Follow with labels

A sprite and its world label remain aligned while the camera translates and zooms.
Setting the camera position to the sprite’s world position centers it without
application-side viewport or zoom offsets.

### Quarter-turn camera

With camera rotation `degrees(90)`, a landmark ten world units to the right of
the camera appears above the viewport center. A sprite rotated by the same angle
as the camera retains its unrotated screen orientation.

### Inspect while paused

A Svelte control rotates the camera while updates are paused; rendering reflects the change.

## Acceptance criteria

- Verify normal and throwing callbacks restore prior drawing state, errors propagate, and subsequent draws do not inherit the completed camera scope. Verify both inline and reused callbacks work.
- Verify draws before/inside/after a nested scope use outer/inner/outer transforms, with no multiplied transform; verify exception unwinding restores the prior scope at each level.
- Verify camera transforms affect scoped draws only, across sprites, shapes, and labels; unscoped content is unaffected and the same camera can be reused across frames.
- Verify the camera’s world position maps to the logical viewport center across viewport sizes and zoom levels, including a letterboxed viewport; keep physical display scaling separate.
- Verify default camera values and landmark offsets at multiple viewport sizes: world (0, 0) maps to the center and world (10, 0) maps ten logical units to its right.
- Verify magnification at zoom 0.5, 1, and 2 while the focus remains centered. Verify zero, negative, NaN, and infinite zoom values throw.
- At zoom 1 and camera rotation `degrees(90)`, verify a point ten world units right of the focus maps ten logical units above center; verify the opposite result for `degrees(-90)` and unchanged placement of the focus.
- Verify equal sprite and camera rotations cancel in screen orientation.
- Compare transformed world landmarks across primitive types after translation, zoom, and rotation.
- Verify camera changes do not mutate world coordinates or viewport policy.
- Verify camera updates remain visible during explicit pause.

## Usage description

Configure the camera position to the world point you want centered, then apply it to world drawing. Create a reusable camera and explicitly scope the world draws it affects. Unscoped draws use screen coordinates. Use synchronous `camera.draw(callback)`; a reusable callback can be defined outside the frame loop. Manual `begin()`/`end()` is deferred.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Independent transform/round-trip tests where conversion is exposed; real mixed-primitive camera fixture.

Use `[camera-2d]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-006, AD-014, and AD-040 through AD-046. Open: synchronous-callback enforcement, camera lifetime, snapshot timing, screen-coordinate origin, position/rotation value validation, and numerical precision/representability at extreme values. Cursor-anchored zoom is a [Phase 3 candidate](../../specifications/phase-3-candidates.md).

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
