# Architecture decision log

Last updated: 2026-10-24.

These decisions were accepted during the architecture interview. They describe
the intended replacement framework, not the current implementation. API examples
discussed in the interview remain illustrative. The interview is ongoing.

## AD-001: A standalone TypeScript-first 2D framework

Build a browser-capable, callback-driven framework inspired by LÖVE's ergonomics
and MonoGame's structured resources and math. Do not require inheritance or an
OOP architecture; allow developers to use objects and classes if they choose.
Prefer TypeScript `type` declarations over interfaces, with justified exceptions.

Commit to 2D. Swappable cameras or projections are future candidates, not initial
requirements. A complete break from the existing Squander API is allowed.

The core must work without Svelte. Provide an optional first-class Svelte/SvelteKit
integration for mounting, disposal, and state/command bridging. Svelte remains
the UI layer. The precise bridge contract is unresolved.

## AD-002: WebGPU only

Use WebGPU as the sole planned rendering backend. WebGL2 is neither required nor
promised. Favor a modern foundation over broad device compatibility.

The intended monetized distribution is through a controlled desktop runtime;
browser use primarily serves development, testing, and showcases. A runtime must
actually support WebGPU: using V8 alone does not establish graphics support.

Desktop packaging is outside Phase 2. Initially validate in a specified Chromium
environment; exact browser, OS, and GPU support requirements remain unresolved.
An HTML canvas may serve as the GPU presentation surface; the Canvas 2D drawing
API is not the game renderer.

## AD-003: Update/draw foundation with future scene composition

Use separate update and draw callbacks. Scene lifecycle, ECS integration, event
buses, and stacked or recursive composition belong above that foundation.
Do not require a rendering scene graph to manage game scenes or GPU resources.

The desired future scene ergonomics include factory-local state, composed
systems, activation hooks returning cleanup functions, and separate control of
updating, drawing, and input for stacked scenes. Detailed scene APIs are deferred.

## AD-004: Explicit resource ownership and disposal

Developers control loading and release. Resource ownership is tracked explicitly,
not inferred from JavaScript references or garbage collection. Multiple owners
can share an underlying GPU resource, which remains alive until the last owner
releases it.

The game instance is the default owner for assets that outlive scenes. Future
scene scopes retain assets until explicit release or scene disposal by default;
unmounting does not imply disposal. Declarative scene asset dependencies will
use the same ownership mechanism as manual acquisition.

Core ownership primitives belong in Phase 2. Scene-specific automation belongs
in the future scene layer. Concurrent-load and release policies are clarified in AD-013; exact API signatures remain to be specified.

## AD-005: Explicit typed asset manifests

Start with developer-authored TypeScript manifests that associate keys with asset
definitions. Loading uses checked keys and infers the corresponding resource
type. This avoids requiring a particular build tool or directory layout.

Typed keys do not prove file existence, successful decoding, or successful upload.
Generated manifests and the details of build-time validation remain future work
or unresolved scope, respectively.

## AD-006: Initial rendering capabilities

Phase 2 includes:

- Sprites with atlas regions, tint, opacity, rotation, scaling, and flipping.
- Filled and outlined rectangles/circles, lines, reusable polygons, and stroked paths (AD-015).
- Predictable drawing order and alpha blending.
- A basic 2D camera with position, zoom, and rotation.
- Resizing and high-DPI rendering.
- Basic GPU-rendered world-space text with position, size, color, and camera transforms.

The initial supplied-bitmap-only font plan is superseded by AD-016. Developers
can supply bundled font URLs; browser preparation creates reusable glyph atlases.
Basic world-space placement, size, color, and camera transforms remain in scope.
Wrapping, rich layout, and build-time atlas generation are deferred.

Custom shaders, render targets, and advanced effects are future candidates.

## AD-007: Variable timing and hidden-document pause

Phase 2 uses variable update timing (the `UpdateTime` contract is defined in AD-019). Pause gameplay while the document is
hidden and reset the timing baseline on return so hidden time does not become
one large simulation update. Protect against excessive elapsed time while visible;
the exact cap and configuration remain unresolved.

Optional fixed-step scheduling is a Phase 4 candidate, not Phase 3 scope.
Automatic draw skipping has been discussed but is not an accepted requirement.
The proposed simple schedule is one update followed by one draw per animation
callback; scheduling details still need final specification.

## AD-008: Explicit options per draw

Drawing calls receive their options explicitly, with sensible defaults. Tint and
transforms must not implicitly carry over from a preceding draw call. This lets
independent systems compose without accidentally changing one another's output.

Camera and shared transform grouping APIs remain to be designed. A persistent
rendering scene graph is not required.

## AD-009: Fixed-fit and responsive viewport policies

Support both policies in Phase 2, selected when creating the game:

- **Fixed-fit:** configure a logical width and height. Uniformly scale that area
  to fit the available surface, center it, and letterbox unused space. Use this
  as the documented starting point for predictable framing.
- **Responsive:** logical dimensions follow the canvas's available CSS dimensions.
  Update the projection and expose logical dimensions on resize. Developers
  decide whether to reveal more world, reposition content, or change camera zoom.

Apply viewport scaling centrally in rendering, not in each draw call. For
fixed-fit, the scale is the smaller of available width divided by logical width
and available height divided by logical height. Device pixel ratio independently
determines physical rendering resolution, preserving logical drawing units.

Svelte UI may adapt independently. UI aligned with the game area will need the
viewport bounds. Future pointer input must invert the viewport mapping and
account for letterboxes; input behavior is not implemented by this decision.

Defer fixed-fill cropping. Independent-axis stretching is not a default policy.
Runtime policy switching and pixel-art scaling rules remain unresolved.

## AD-010: Configurable texture filtering

Default to linear filtering, configurable per texture so pixel-art assets can
select nearest-neighbor filtering. This is a framework default; WebGPU implements
sampling through separate sampler objects. It does not require duplicating
texture pixels to support different sampling settings.

Expose separate magnification (upscaling) and minification (downscaling) controls,
plus a shorthand that sets both. Exact option names remain to be designed.
Mipmap support is deferred to Phase 4 as a candidate. Phase 2 samples the original
texture level; substantial downscaling can shimmer or lose detail, even with
linear filtering. Pre-resizing an asset can reduce memory use when its required
resolution is known, but does not cover every camera zoom, viewport size, or
device pixel ratio. Integer-only viewport scaling remains a future possibility.

## AD-011: Complete initialization before starting the loop

Complete asynchronous setup successfully before updates or drawing begin. The
Svelte integration can present loading and initialization errors. Later asset
loading can occur while the game runs.

On initialization failure, stop the attempt, release resources acquired by that
attempt, and expose a typed error to the caller. Do not automatically retry or
start a partially initialized game. A retry creates a fresh game instance.
Runtime failure handling is defined in AD-012.

## AD-012: Failure, pause, and disposal behavior

An update/draw exception stops the loop, exposes a typed error, and retains the
instance for inspection and explicit disposal. No automatic resume. Unexpected
WebGPU device loss uses a distinct device-lost error and the same stopped state;
recovery requires disposal and a fresh game instance. Automatic restoration is deferred.

Explicit pause stops updates but continues drawing. Drawing does not advance
simulation state. Hidden-document suspension stops both; visibility restoration
preserves an explicit pause.

Disposal wins over pending setup/loading, signals cooperative cancellation,
cancels work where possible, and releases late results. Custom setup code cannot
always be forcibly stopped. It must never revive a disposed instance. Repeated
disposal is harmless.

## AD-013: Loading, dynamic assets, and handle safety

Concurrent requests for a declared asset share one fetch/decode/upload operation
within a game instance, with ownership tracked separately for each acquisition.
Separate games manage GPU resources independently.

An individual post-start load failure rejects with a typed error and removes the
failed pending attempt from the cache. The game continues if the caller handles
the failure; explicit retry is allowed, without automatic placeholders or retries.
An error propagated from required setup follows AD-011.

Runtime texture input accepts a File or Blob through a distinct typed entry point,
returning the same kind of handle as declared textures. The developer performs
fetching for dynamic assets. This does not remove URL loading from declared
manifests or add unchecked string keys to them.

Released handles are invalid even while another owner retains the underlying
resource. Drawing with one throws a descriptive asset/handle-identifying error;
repeated release is harmless. Opaque types and future declarative ownership
reduce misuse, but runtime alias/lifetime validation remains necessary.

## AD-014: Draw order and coordinate conventions

Preserve draw call order across all primitive types, including through batching.
Use positive X right and positive Y down. Sprite origins default to top-left and
can be overridden with normalized coordinates relative to the selected region.
The origin anchors position, scale, and rotation. A centered atlas sprite uses
its region dimensions, not the dimensions of the whole atlas.

Rotation units/direction and the exact default camera mapping remain open;
the earlier radians/clockwise recommendation was not separately confirmed.

## AD-015: Shapes, paths, and polygons

Include filled/outlined rectangles and circles, basic lines, and reusable geometry.
Squares are equal-sided rectangles. Polygons can be concave but have no holes or
self-intersections. Paths are stroke-only and support straight segments, quadratic
and cubic Bézier curves, and explicit closure. Draw reusable geometry with explicit
transforms and styles; rebuild its geometry when shape data changes.

Dashed strokes and configurable joins/caps are deferred. Filled curved paths,
holes, and fill rules are Phase 3 candidates. Tessellation, stroke conventions,
and invalid-geometry behavior need detailed contracts before implementation.

## AD-016: Font assets and reusable glyph preparation

Supersedes the supplied-bitmap-only restriction in AD-006. The preferred developer
experience is a bundled font-file URL, including npm/Fontsource-style imports,
loaded through a typed font asset. Core code does not depend on Vite's URL syntax.
Canvas 2D is permitted for preparation; WebGPU draws the resulting world text.

Prepare reusable glyph atlases during loading with a configurable character set
and a basic Latin default. Prepare additional supported glyphs automatically when
needed. Changes composed of already prepared glyphs reuse texture data; drawing
data changes without rerasterizing whole labels. Font support does not imply
complex-script shaping or unlimited font/size coverage.

Keep draw.text dependent on a font handle, not its source format. Build-time atlas
generation is deferred. Remote direct font-file URLs can use normal declared URL
loading; no Google-specific CSS loader is required. The preferred bundled workflow
avoids depending on a remote font service at runtime. A specific BMFont JSON import
format, missing-glyph policy, and support for supplied atlas imports remain open.

## AD-017: Typed bridge and UI ownership

Expose typed read-only state subscriptions and typed commands, preserving inferred
values, parameters, and synchronous/asynchronous return types. The game controls
publication and business rules; the UI does not receive a general mutable simulation.
Publish relevant changes as needed rather than making all game data reactive.

Svelte owns a game instance and disposes it on host unmount. Hosts and bridges are
per instance. Future scenes can own overlays within that host through an optional
Svelte adapter, while core scenes remain independent of Svelte. Phase 2 provides
the bridge and host; scene-owned overlays belong to the future scene layer.

Type tests must verify inference and rejected misuse. TypeScript does not validate
external input, current gameplay permissions, or runtime immutability of aliases.

## AD-018: Verification and documentation acceptance

Require greater than 90% statements, branches, functions, and lines across the
framework's TypeScript/Svelte runtime code, including renderer CPU-side logic and
Svelte integration. Exclude demos, generated files, and type-only declarations.
Pair coverage with API type tests and real WebGPU rendering tests; mocked GPU
calls do not prove shader or pixel correctness.

Acceptance includes an organized documentation library with focused runnable
demos and relevant tests for every individual feature, plus a final playground /
kitchen sink that exercises composition. The playground supplements focused tests.

## AD-019: Explicit update timing values

Pass a read-only per-game `UpdateTime` object instead of a bare dt. Its fields are
`delta_seconds` (clamped simulation step), `elapsed_seconds` (sum of supplied
steps including this update), `update_index` (zero-based invocation index),
`measured_delta_seconds` (interval before clamping), and `delta_was_clamped`.

Accumulated simulation time excludes loading, pauses, hidden time, and discarded
excess. Reset the measurement baseline after suspension. Keep FPS averages and
callback execution costs separate from simulation timing. Cap/default and
first/resume-frame semantics remain open.

## AD-020: Frame scheduling and disposal completion

Use synchronous update/draw, with one update then one draw per active animation
callback. An update error skips drawing. Async orchestration belongs in setup,
future scene hooks, or commands/events. Developers should not initiate explicit
fetching/loading in frame callbacks; automatic font glyph preparation is an
internal exception whose first-use policy remains to be designed.

Clamp simulation deltas to 0.1 seconds by default, configurable, and discard excess.
The first update at startup/resume has zero measured/simulation deltas and false
clamping flag, unchanged elapsed time, and an advancing update index. Each update
receives a new read-only timing snapshot that the framework never mutates later.

The application/Svelte host disposes its game. Stop immediately, signal cancellation,
and return a promise for framework-owned cleanup. Repeated disposal returns the
same promise. Arbitrary developer work must not indefinitely block disposal;
late managed results are safely released. Initialization-time access to the game
or a cancellation handle remains an API design detail.

## AD-021: Strict tooling and coordinated upgrade

Maintain Prettier formatting and very strict type-aware ESLint checks. Explicit
any is an error; narrow ESLint exceptions require a written reason. Enforce
unhandled/misused promises, unsafe type operations, unused variables, and unused
or unexplained suppressions. Use snake_case for ordinary runtime identifiers and
properties, PascalCase for types/classes/Svelte components, with narrow external
API/import/framework-contract exceptions.

Upgrade Svelte/SvelteKit and compatible Vite/plugins/adapters/checking dependencies
as a separate maintenance change before replacement-framework implementation.
Capture baseline failures and verify diagnostics, build/package, tests, and demos.
Report existing strict-lint debt separately instead of confusing it with migration
regressions or weakening the baseline to hide it.

## AD-022: Rotation units and degrees helper

Express drawing rotation in radians. Positive angles rotate clockwise in the
agreed positive-Y-down coordinate system. Provide `degrees(value)` to convert
degrees to radians, so `degrees(90)` expresses a clockwise quarter-turn. The helper
belongs in Phase 2 alongside rotation; the broader safe-math capability remains
a future candidate. This decision does not settle branded angle types or camera
rotation semantics.

## AD-023: Sprite flips preserve geometry

Explicit sprite flips mirror the image horizontally or vertically within its
existing bounds. Preserve the sprite’s position, origin, and transformed geometry,
including for off-center origins. Atlas flips operate within the selected region.
This keeps facing-direction changes from shifting the sprite rectangle. It does
not settle whether negative scale is supported or how it would behave.

## AD-024: Shared color type with equal authoring helpers

Provide one readonly `Color` type for sprite tint, shape color, and text color.
Support HSL/HSLA, RGB/RGBA, and hex construction helpers as equal authoring options.
No helper is the preferred style for documentation or examples; choose whichever
makes an example clear. Convert authoring representations to a consistent RGB
representation at construction rather than making each draw interpret HSL or hex.
The renderer owns the required color-space conversions.

Exact helper signatures/ranges and internal encoding still need explicit contracts.
AD-027 defines Phase 2 blending scope. AD-025 defines invalid-input behavior; AD-026 defines opacity
composition. Supporting HSL
does not imply HSL interpolation or a palette-manipulation API in Phase 2.

## AD-025: Validate colors at construction

Color helpers throw immediately for invalid input rather than silently clamping.
Errors identify the offending channel or input and its allowed range or format.
Reject NaN and infinity. Finite hue values intentionally wrap around a full turn;
360 degrees and 0 degrees describe the same hue. Alpha outside 0–1 is invalid.

Validate at construction so drawing consumes validated color values. Exact RGB
and saturation/lightness input ranges, supported hex formats, error types, and
how the type prevents unchecked construction remain API design details.

## AD-026: Per-draw opacity multiplies alpha

Provide per-draw `opacity`, defaulting to 1, for sprites, shapes (including paths
and polygons), and text. Multiply it by the color's alpha and, where applicable,
the texture or glyph's alpha/coverage. An opaque sprite pixel with tint alpha 0.5
and opacity 0.5 has effective source alpha 0.25; a transparent pixel stays
transparent. A draw's opacity does not mutate its color, assets, or subsequent
calls. Developers can fade an item without constructing a new color.

This defines source alpha, not the final framebuffer alpha or the blend equation.
Invalid per-draw opacity handling and internal alpha encoding remain open.

## AD-027: Normal alpha blending in Phase 2

Use normal source-over alpha blending for every Phase 2 draw: later sprites,
shapes, paths, polygons, and text appear over earlier content, with transparency
revealing what is behind them. Apply AD-026's effective source alpha consistently
across primitive types. Batching must preserve these results and draw order.

Do not expose selectable blend modes in Phase 2. Additional modes, including
additive and multiply blending, are Phase 3 candidates rather than committed
implementation scope. Internal alpha encoding and color-space handling remain
implementation contracts to resolve and verify.

## AD-028: Basic shape anchors

Originally, rectangles used top-left `(x, y)` with positive width and height;
AD-032 refines this to a starting corner with signed dimensions. Place circles
by their center `(x, y)` with radius. Define lines by two explicit endpoints.
These conventions apply to the underlying geometry of filled and outlined forms;
stroke alignment is a separate decision. Basic placement does not require an
origin option. Transformation pivot semantics and exact signatures remain open.

## AD-029: Centered strokes in Phase 2

Center strokes on their geometric boundary or path centerline, placing half the
stroke width on each side. Apply this convention to rectangles, circles, lines,
paths, and polygon outlines. A circle of radius 10 with stroke width 4 has stroke
radii 8 and 12. AD-031 defines cap/join direction. Very wide or degenerate
strokes still need separate contracts.

Inside/outside stroke alignment is a Phase 3 candidate, not Phase 2 scope. Keep
future rendering extensions visible in the candidate log alongside their
corresponding decisions and capability notes.

## AD-030: Stroke widths scale with the world

Measure stroke widths in world units and scale them with their geometry. With
other transforms unchanged, a width-2 stroke appears twice as thick at camera
zoom 2 as at zoom 1. Viewport scaling and physical display density still apply;
world units are not a promise of a fixed physical pixel count.

Constant screen-thickness strokes for selection outlines or debug overlays are
Phase 3 candidates. Nonuniform object-scale behavior remains a separate contract.

## AD-031: Fixed flat ends and limited sharp joins

Use flat (butt) caps for open strokes: geometry ends at the supplied endpoint
without extending beyond it along the tangent. Use sharp (miter) joins with a
fixed limit, preserving square rectangle corners and falling back to a cut-off
(bevel) join when an acute corner would produce an excessive spike. Apply the
same policy to lines, outlined shapes, and stroked paths/polygons where applicable.

The exact miter-limit value and ratio definition remain to be specified before
implementation. Rounded ends/corners and configurable cap/join styles remain
future options recorded in the candidate log; Phase 2 exposes fixed defaults.

## AD-032: Signed rectangles and invalid basic geometry

Allow finite signed rectangle width and height. `(x, y)` is the starting corner;
negative width extends left and negative height extends up. Normalize the bounds
internally. This refines AD-028’s rectangle anchor wording; positive dimensions
still start at the top-left. Signed dimensions define geometry, not texture flips.

Throw for negative radii, negative stroke widths, and nonfinite basic geometry
values, including positions. Negative finite positions remain valid. For otherwise
valid inputs, draw nothing for zero-area rectangles (either dimension zero),
zero-radius circles, zero-width strokes, and lines with coincident endpoints.
Zero stroke width suppresses the stroke, not a separately requested fill.

Apply rectangle/circle zero-size behavior to filled and outlined forms alike,
so animations can shrink to zero without special handling. For example,
`{ x: 100, y: 80, width: -30, height: -20 }` has normalized geometric bounds
from (70, 60) to (100, 80). Reusable polygon/path validation and transformation
pivot behavior remain separate contracts.

## AD-033: Editable commands and explicit path geometry updates

Construct reusable paths from declarative typed command arrays, using helpers
such as `move_to`, `line_to`, curve commands, and `close`. The command array is
ordinary editable application data; the created route is an opaque geometry
handle, not an indexable array. Creation snapshots command values, so later
array or command edits cannot silently change prepared geometry.

Provide an explicit operation to submit revised commands to the same handle.
Snapshot and validate the proposed commands before changing the active geometry.
Invalid input throws and preserves the previous geometry. Successful updates keep
the handle stable, so existing users of that handle draw the updated geometry.
Ordinary placement changes use draw transforms; geometry updates happen outside
`draw` to make rebuilding work explicit.

The operation name is unresolved: `replace` was illustrative and is not the
preferred committed verb. Exact signatures, command shapes, rebuild scheduling,
and resource ownership/disposal remain open. This decision establishes path
behavior; AD-035 extends the editing contract to polygons.

## AD-034: Multiple disconnected path subpaths

A single path handle can contain multiple disconnected subpaths. Each `move_to`
starts a new subpath without connecting to the previous one. `close()` connects
only the current subpath back to its own starting point. All subpaths share the
style and transforms of the draw call. This does not add filled paths or holes
to Phase 2; paths remain stroke-only.

Command sequencing after closure, empty subpaths, and malformed sequences remain
validation details to resolve before implementation.

## AD-035: Point-array polygons with explicit updates

Construct reusable polygons from ordered arrays of `{ x, y }` points. Connect
the last vertex to the first implicitly; callers do not need a repeated endpoint
or a path `close()` command. This remains the simple, potentially concave polygon
scope already agreed, without holes or self-intersections.

Use the same editing contract as paths: snapshot input point values, return an
opaque stable handle, and accept revised points through an explicit validated
update outside `draw`. Mutating application-owned points does not silently alter
prepared geometry. Invalid updates throw and leave the previous geometry usable.
The update operation's name remains unresolved for both paths and polygons.

AD-036 defines winding, duplicate-point cleanup, and polygon validation.

## AD-036: Polygon normalization and validation

Validate polygons when creating or explicitly updating geometry. Accept either
clockwise or counterclockwise vertex order. Remove consecutive duplicate points
and an optional repeated closing point from the internal snapshot without
mutating application-owned input.

Throw for nonfinite coordinates, self-intersections, fewer than three distinct
vertices after cleanup, or zero-area polygons. Invalid updates preserve the
previous geometry. These rules apply to filled and outlined polygons; malformed
polygon input is an error rather than the zero-size no-op permitted for basic
shapes in AD-032.

Numerical tolerances and treatment of overlapping edges or nonadjacent touching
vertices still require precise implementation contracts; this decision does not
introduce holes, automatic shape repair, or automatic simplification.

## AD-037: Frame-local draws and documented persistent resources

All `draw_*` APIs submit commands for the current frame and return no disposable
resource. Capture scalar/structured draw values at submission so subsequent
application-data edits do not change an already submitted command. Drawing a
basic circle, rectangle, or line requires no developer-owned geometry handle and
creates no per-call texture. The renderer owns temporary buffers and their safe
reuse; exact internal rendering/storage choices remain open.

Persistent resources are obtained separately through creation/loading APIs.
Drawing sprites, text, or prepared geometry references those existing resources;
the draw itself does not create another developer-owned resource. Automatic
preparation of previously unseen glyphs may grow the font-owned cache, as already
agreed, without giving the text draw its own disposable lifetime.

Every resource-returning create/load API must document ownership, the obligation
and method to release the resource, and applicable owner/game-disposal cleanup.
Include this in API reference/editor-visible documentation and show cleanup in
usage examples. Distinguish resource acquisition from pure value helpers such as
colors and path commands, which do not require resource release.

AD-039 defines prepared-geometry ownership; AD-038 defines release safety.
This rule does not decide GPU allocation layout or promise zero internal allocations.

## AD-038: Immediate release with safe completion of prior draws

Releasing a resource handle immediately invalidates it for new draws. Commands
already accepted by the drawing API remain valid, including commands buffered
by the renderer before GPU submission. The renderer retains the necessary
underlying storage until these uses are safe, even after the final application
owner releases its handle.

Developers do not wait for the GPU before releasing a resource. Actual destruction
or pooled-storage reuse happens only when safe; no particular fence or allocation
strategy is prescribed. Repeated release remains harmless. This rule preserves
resource validity for prior commands; it does not override existing game-failure,
device-loss, or disposal behavior to guarantee presentation of a frame.

## AD-039: Game-owned prepared geometry

Each prepared path or polygon handle belongs to the game instance that created
it. Retain it until explicit release or game disposal; disposing the game cleans
up remaining geometry. Drawing or updating through a released handle, or using
it through another game, throws. Safe reclamation of prior uses follows AD-038.
Plain command and point arrays remain reusable to create separate handles.

Optimize API ergonomics and documentation for the primary use case: one game
instance. The cross-game check is a misuse boundary, not a reason to introduce
cross-game resource sharing, transfer APIs, or multiple-game orchestration.
Basic shape draw calls remain frame-local and need no geometry handles or release.

## AD-040: Camera position is the view center

Camera `(x, y)` identifies the world point displayed at the center of the logical
viewport. Setting it to a character’s position centers that character without
requiring viewport-size or zoom calculations. Zooming keeps this focus point
stationary at the viewport center. Viewport fitting/letterboxing and physical
resolution remain separate from camera positioning.

Prioritize intuitive camera ergonomics. This decision defines position semantics,
not automatic follow behavior. AD-041 defines the initial view and AD-042 defines
zoom semantics. AD-043 defines rotation; the camera-binding API remains open.

## AD-041: Default camera centers the world origin

Initialize the camera at `(0, 0)` with zoom 1 and rotation 0. World `(0, 0)`
appears at the logical viewport center, with positive X right and positive Y down.
At zoom 1, before viewport fitting/display-density scaling, one world unit maps
to one logical viewport unit. The default position does not depend on viewport
dimensions; there is no automatic half-viewport position offset.

## AD-042: Positive camera magnification

Camera zoom is a positive magnification factor: 2 doubles apparent size and 0.5
halves it, with the camera’s world focus remaining at the viewport center. Reject
zero, negative values, NaN, and infinity. Do not impose an arbitrary gameplay
minimum or maximum; applications can define their own zoom limits. Numerical
precision/representability at extreme values still needs implementation guidance.

Cursor-anchored zoom is a Phase 3 convenience candidate, not Phase 2 behavior.

## AD-043: Camera rotation is world orientation

Express camera rotation in radians, accepting the shared `degrees()` helper.
Positive angles orient the camera clockwise in the positive-Y-down world. Apply
the inverse camera rotation to the view, so world content appears to rotate
counterclockwise about the logical viewport center while the camera focus stays
centered. At camera rotation `degrees(90)`, a world point directly right of the
camera appears above the viewport center.

Matching a sprite’s orientation to the camera’s orientation cancels their relative
rotation on screen. This is transform behavior, not automatic follow/rotation
tracking. Camera-binding and value-validation details remain separate contracts.

## AD-044: Explicit reusable camera scopes

Create reusable cameras through a `create_camera()`-style API and apply them
explicitly within `draw`. Drawing inside a camera scope uses world coordinates;
drawing outside any scope uses screen coordinates. A camera need not be applied
every frame. The defaults and transform semantics of AD-040 through AD-043 apply
when a camera scope is active, not to unscoped drawing.

The proposed implicit main camera was not adopted. AD-045 selects a synchronous
`camera.draw(callback)` scope. Exact callback typing, camera ownership/release, snapshot timing, and the screen-coordinate origin remain open. Creating a reusable camera
does not yet prescribe a dedicated GPU allocation. Svelte remains the UI solution;
explicit screen-space GPU drawing is also available in Phase 2.

## AD-045: Synchronous camera callback scopes

Use `camera.draw(callback)` for Phase 2 camera scopes. Execute the callback
synchronously under the camera transform and restore the previous drawing state
when it exits, including when it throws, using exception-safe cleanup. Errors
propagate to the existing draw/game failure policy; scope cleanup does not swallow
them. The scope must not remain active across asynchronous work.

Support both inline callbacks and reusable functions, allowing applications to
avoid creating a new callback each frame without changing the API. Do not promise
a performance difference without measurement. Exact typing/runtime enforcement
of synchronous callbacks remains open; AD-046 defines nested-camera semantics.

Manual `begin()`/`end()` is a future candidate only if a concrete need emerges;
record it in the candidate log rather than exposing it in Phase 2.

## AD-046: Nested cameras replace rather than compose

If camera scopes nest, the innermost camera temporarily replaces the outer camera
transform. Do not multiply the two camera transforms. On exit, restore the prior
camera, including during exception unwinding, consistently with AD-045.

Nesting is expected to be uncommon. Keep a single camera scope as the primary
workflow; define and test nesting predictably without introducing camera trees,
transform inheritance, or a prominent nested-camera API.

## AD-047: Screen coordinates use the logical content viewport

Outside a camera scope, screen `(0, 0)` is the top-left of the logical content
viewport, positive X right and positive Y down. Use logical units before viewport
fitting and physical display scaling. Letterbox bars are outside this content
coordinate system. The viewport sizing policy controls fitting/letterboxing;
cameras transform world coordinates into that viewport, not the bars themselves.

## AD-048: Visibility query now, automatic culling later

Include `camera.is_in_view(bounds)` in Phase 2. Query caller-supplied world-space
bounds using camera position, zoom, rotation, and logical viewport dimensions.
Return false only when the supplied bounds are definitely outside the view;
return true for partially visible or potentially visible bounds. This is a
conservative intersection query, not proof of pixel visibility or lack of
occlusion. Callers must supply bounds covering the rendered content, including
stroke extent and other relevant expansion.

The query does not automatically skip drawing or change gameplay updates.
Automatic offscreen bounds culling and more advanced occlusion culling are Phase
3 candidates, with automatic offscreen culling the initial optimization to
investigate. Require output equivalence, preservation of draw order/transparency,
and measured benefit before adopting an optimization. Do not couple rendering
culling to simulation/update scheduling.

AD-049 defines the bounds representation. Edge-touching/invalid-input policy and
query snapshot timing remain open. Letterboxing continues to belong to viewport sizing, not the camera.

## AD-049: World-axis-aligned visibility rectangles

Accept plain `{ x, y, width, height }` world-space rectangles in
`camera.is_in_view(bounds)`. Rectangle axes remain aligned with the world axes
when the camera rotates. Callers can enclose sprites, circles, or prepared
geometry without passing entity objects or GPU resource handles to the query.

For example, a circle centered at `(x, y)` with radius `r` has bounds
`{ x: x - r, y: y - r, width: 2 * r, height: 2 * r }`, expanded further if its
stroke extends outside that radius. Exact exported type naming and signed/zero
extent, boundary-touching, and invalid-value behavior remain to be settled.

## Implementation readiness

Capability contracts are drafted under [specs](../specs/README.md). Their Draft
status preserves unresolved details; none claim replacement-framework verification.
Follow [readiness guidance](implementation-readiness.md) before each implementation
slice. Use the [open questions](open-questions.md) to resolve behavior before tests
or implementation accidentally establish an undocumented policy.

Future work is recorded in the [Phase 3 candidate log](phase-3-candidates.md) and
[Phase 4 candidate log](phase-4-candidates.md).
