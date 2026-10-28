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
- Treat cameras as lightweight CPU-side state with no manual release requirement; any renderer-owned caching is internal and reclaimed with renderer/game teardown (AD-052).
- Create reusable cameras and apply them through explicit scopes inside `draw`. Scoped drawing uses world coordinates; unscoped drawing uses screen coordinates. Cameras are not implicitly applied to all draws (AD-044).

- Interpret camera `(x, y)` as the world point shown at the logical viewport center; zoom preserves that centered focus point (AD-040).
- Default to position `(0, 0)`, zoom 1, and rotation 0, centering the world origin independently of viewport dimensions (AD-041). At zoom 1, one world unit maps to one logical viewport unit before viewport/display scaling.
- Treat zoom as a positive magnification factor: 2 doubles size, 0.5 halves it. Reject zero, negative, and nonfinite values; applications choose gameplay limits (AD-042).
- Reject NaN and infinite camera position components and rotation; accept any finite values, including negative positions and rotations beyond one turn. Do not impose arbitrary coordinate or angle limits (AD-053).
- Interpret rotation as camera orientation in world space, in radians with `degrees()` available. Positive camera rotation is clockwise; world content is transformed by the inverse rotation about the viewport center (AD-043).
- Provide `camera.is_in_view(bounds)` for world-space bounds, accounting for camera position, zoom, rotation, and logical viewport size. False means definitely outside; true means partially or potentially visible, not unoccluded (AD-048).
- Accept plain `{ x, y, width, height }` world-axis-aligned rectangles for visibility queries, independent of camera rotation. Do not require game entities or resource handles (AD-049).
- Normalize signed bounds dimensions, count edge touching as potentially visible, and interpret zero-size bounds as point/line queries. Throw for nonfinite bounds coordinates/dimensions (AD-050).
- Require caller-provided bounds to cover rendered content, including stroke extent. The visibility query does not itself skip draws or updates; automatic culling is deferred.
- Apply the basic camera consistently to world sprites, shapes, paths, polygons, and labels.
- Outside camera scopes, use logical screen coordinates with origin at the content viewport’s top-left, excluding letterbox bars, positive X right and positive Y down (AD-047).
- Keep camera transforms separate from viewport fitting and physical resolution.
- Configure camera state in initialization, `update`, or external controls before drawing. Draw callbacks consume that state and should not mutate the camera inside its scope; snapshot mechanics are internal (AD-051).
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

### Optional visibility check

An application queries an enemy’s world bounds before drawing it. Partially
visible bounds return true, including under a rotated camera. A fully obscured
enemy may still return true because the query does not inspect occluding content.
The query does not change whether the enemy’s gameplay update runs.

### Inspect while paused

A Svelte control rotates the camera while updates are paused; rendering reflects the change.

## Acceptance criteria

- Verify normal and throwing callbacks restore prior drawing state, errors propagate, and subsequent draws do not inherit the completed camera scope. Verify both inline and reused callbacks work.
- Verify draws before/inside/after a nested scope use outer/inner/outer transforms, with no multiplied transform; verify exception unwinding restores the prior scope at each level.
- Verify camera transforms affect scoped draws only, across sprites, shapes, and labels; unscoped content is unaffected and the same camera can be reused across frames.
- Verify the camera’s world position maps to the logical viewport center across viewport sizes and zoom levels, including a letterboxed viewport; keep physical display scaling separate.
- Verify default camera values and landmark offsets at multiple viewport sizes: world (0, 0) maps to the center and world (10, 0) maps ten logical units to its right.
- Verify finite extreme/negative camera positions and rotations are accepted, while NaN/infinite values throw; angles beyond one full turn remain valid.
- Verify magnification at zoom 0.5, 1, and 2 while the focus remains centered. Verify zero, negative, NaN, and infinite zoom values throw.
- At zoom 1 and camera rotation `degrees(90)`, verify a point ten world units right of the focus maps ten logical units above center; verify the opposite result for `degrees(-90)` and unchanged placement of the focus.
- Verify equal sprite and camera rotations cancel in screen orientation.
- Compare transformed world landmarks across primitive types after translation, zoom, and rotation.
- Verify an unscoped screen-space marker at (0, 0) maps to the content viewport’s top-left across fitting, letterboxing, and DPR changes, independently of camera transforms.
- Verify clearly outside bounds return false and intersecting/partially visible bounds return true across camera translation, rotation, zoom, and viewport sizes, including bounds containing the entire view.
- Verify world-axis-aligned bounds retain their world meaning under camera rotation; include a circle-enclosing rectangle fixture and type tests accepting plain bounds without entity/resource dependencies.
- Verify signed bounds match normalized equivalents; test edge/corner contact and point/line bounds inside, touching, and clearly outside both rotated and unrotated views. Verify NaN/infinite inputs throw.
- Verify known visible stroke extents are not rejected when included in supplied bounds. Use independent reference fixtures to detect false negatives; conservative false positives are allowed.
- Verify foreground occluders do not affect the bounds-query result and calling the query changes neither draw submission nor simulation scheduling.
- Verify camera changes do not mutate world coordinates or viewport policy.
- Verify camera creation and disposal require no resource-release call, and repeated camera creation does not expose texture/geometry ownership semantics.
- Verify camera changes made before drawing are reflected by the next scope’s rendering and visibility checks, including external controls during explicit pause. Examples must keep camera mutation outside draw scopes.

## Usage description

Configure the camera position to the world point you want centered, then apply it to world drawing. Create a reusable camera and explicitly scope the world draws it affects. Unscoped draws use screen coordinates. Use synchronous `camera.draw(callback)`; a reusable callback can be defined outside the frame loop. Manual `begin()`/`end()` is deferred. Use `camera.is_in_view(world_bounds)` when the application wants to skip work for definitely offscreen bounds; a true result does not prove actual pixel visibility.

## Test references

The public core entrypoint now re-exports `create_camera`, `Camera`,
`CameraOptions`, `CameraViewport`, `Point`, and `Bounds`; the renderer consumes
camera scopes for world-space primitive and sprite draws.

Current verification:

- [`src/lib/core/runtime/camera.test.ts`](../../src/lib/core/runtime/camera.test.ts)
  covers centered focus, zoom, inverse rotation, signed bounds, conservative
  visibility, and finite-value validation in the `[camera-2d] camera transforms`
  suite.
- [`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts)
  verifies synchronous camera scope application to a real GPU landmark in the
  `[camera-2d]` suite.

Nested scope restoration and one renderer integration fixture are implemented;
broader camera transforms across all draw types and viewport integration remain
unimplemented; one real GPU zoom/rotation fixture now covers the shared quad
path.

## Notes

AD-006, AD-014, and AD-040 through AD-053. The current CPU helper uses a
world-axis-aligned rectangle and transformed-corner AABB for conservative
visibility. Scope enforcement and numerical tolerances remain open.
Cursor-anchored zoom is a [Phase 3 candidate](../../specifications/phase-3-candidates.md).

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
