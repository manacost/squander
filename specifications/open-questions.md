# Remaining contract decisions

The numbered interview established direction, not every API detail. These are
implementation-readiness questions, not reopened decisions. Resolve the relevant
ones before a dependent slice starts; record outcomes in its spec and the decision
log when architectural. No fixed implementation values below are implied.

## Lifecycle and runtime

- `game-lifecycle`: factory/setup/cleanup signatures, typed errors,
  and how external custom setup cleanup cooperates with cancellation.
- `game-timing`: the timing fields, cap, first/resume delta, snapshot lifetime, and
  synchronous callback scheduling are agreed (AD-019 and AD-020).
- `webgpu-runtime`: supported Chromium/OS baseline, GPU limits, unavailable-adapter
  handling, and intentional teardown versus unexpected device loss.

## Assets

- `asset-loading`: descriptor/cache identity and cancellation of one concurrent
  requester without disrupting others.
- `dynamic-assets`: supported image encodings and size limits; duplicate-input policy.
- `resource-ownership`: release/scope API and internal
  completion/reclamation strategy. AD-038 defines safe release semantics.

## Rendering

- `sprite-drawing`: color helper signatures/ranges and error types, color/alpha encoding and invalid per-draw opacity handling,
  atlas metadata, and negative-scale policy.
- `shape-drawing`: transformation pivots, the exact miter limit, very wide strokes,
  antialiasing, and nonuniform object-scale behavior.
- `paths-and-polygons`: exact command shapes, update-operation name (revisit `replace`),
  numerical validation tolerances and overlapping/touching edges, rebuild scheduling,
  command sequencing/empty subpaths, tessellation tolerance,
  and the exact geometry release API (ownership is agreed in AD-039).
- `viewport-sizing`: pixel rounding, zero-size hosts, DPR policy, bar color, and
  whether policy changes require recreation.
- `camera-2d`: exported bounds type name, numerical visibility tolerances, synchronous-callback enforcement, camera lifetime, optional in-scope mutation enforcement, position/rotation value validation, and extreme-value numerical behavior.
- `texture-filtering`: descriptor names, sampler changes, and font sampling defaults.

## Text and integration

- `text-drawing`: atlas resolution/capacity/eviction, first-use glyph readiness,
  fonts/variants and language scope, missing-glyph behavior, and supplied-atlas import.
  Browser-font loading was accepted; BMFont JSON import was only proposed.
- `svelte-bridge`: exact read-only subscription and command types, runtime alias
  protection, SSR boundary, notification scheduling, and commands after disposal.
- `feature-documentation`: feature route inventory, demo organization, and the
  playground's composition flows. Feature-specific tests and demos are required.

## Verification and migration

- Select real GPU test infrastructure, visual tolerances, type-test runner, and
  coverage instrumentation/merging. The four greater-than-90% metrics and runtime
  scope are already agreed.
- Identify which legacy demos can be adapted and which are removed or archived;
  preserve unrelated work and avoid a broad unreviewed deletion.
- Resolve package entry points so plain TypeScript consumers do not require Svelte.

See [capability drafts](../specs/README.md) and [readiness guidance](implementation-readiness.md).

## Approved project maintenance

Strict type-aware ESLint, reasoned narrow suppressions, and consistent naming are
agreed in AD-021. The coordinated Svelte/SvelteKit toolchain upgrade is complete; see
[maintenance verification](toolchain-maintenance.md) and the remaining
[lint debt](tooling-standards.md).

The lifecycle/timing and maintenance questionnaire is complete. Continue with the
remaining capability contracts above before their dependent implementation slices.

## Rendering questionnaire progress

The six-question rendering block is complete:

- Radians with a `degrees()` helper (AD-022).
- Image flips preserve geometry and origins (AD-023).
- Equal color helpers return a shared readonly `Color` (AD-024).
- Invalid colors throw at construction; finite hue wraps (AD-025).
- Per-draw opacity multiplies alpha (AD-026).
- Phase 2 uses normal source-over blending; additional modes are Phase 3 candidates (AD-027).

This completes the block, not all rendering contracts. Exact helper contracts and
internal encodings remain open.

## Geometry questionnaire progress

The five-question geometry block is complete:

- Rectangle starting corners with signed dimensions, circle centers, and line endpoints (AD-028, refined by AD-032).
- Centered strokes (AD-029).
- World-unit stroke widths (AD-030).
- Flat caps and limited sharp joins (AD-031); the exact miter limit remains open.
- Invalid basic geometry throws; valid zero-size geometry draws nothing (AD-032).

Future alignment, constant screen thickness, and configurable/rounded styles are
recorded in the candidate log. This block does not resolve all geometry contracts.

## Reusable geometry questionnaire progress

The four-question reusable geometry block is complete:

- Editable declarative command arrays with explicit validated updates (AD-033).
- Multiple disconnected subpaths (AD-034).
- Implicitly closed point-array polygons with the same editing contract (AD-035).
- Either winding, duplicate-point cleanup, and strict polygon validation (AD-036).

Revisit the update verb; `replace` was not accepted as final naming. Remaining
numerical and path-sequencing details are listed above. The next block covers
geometry resource lifetime.

## Geometry lifetime questionnaire progress

The three-question geometry lifetime block is complete:

- Frame-local draws and documented create/load release obligations (AD-037).
- Immediate handle invalidation with safe retention for prior accepted draws (AD-038).
- Game-owned prepared geometry, early release, and game-disposal cleanup (AD-039).

Single-game use is the primary ergonomic target. Cross-game rejection is a guard,
not a request for cross-game sharing features.

## Camera questionnaire progress

The four-question camera semantics block is complete:

- Centered world focus (AD-040).
- Origin-centered defaults (AD-041).
- Positive magnification and rejected invalid zoom values (AD-042).
- Clockwise world orientation with inverse view rotation (AD-043).

Cursor-anchored zoom remains a Phase 3 candidate. Continue with camera integration
and viewport behavior; the next block initially estimates three questions, starting
with how the camera is applied to drawing.

## Camera integration questionnaire progress

The three-question camera integration block is complete:

- Reusable cameras with synchronous callback scopes (AD-044/045).
- Inner scopes replace and restore outer cameras; nesting is secondary (AD-046).
- Unscoped screen coordinates start at the logical content viewport’s top-left (AD-047).

Camera lifetime and numerical edge cases remain open; AD-051 keeps snapshot mechanics internal.

## Visibility checkpoint

The scope split is agreed (AD-048): Phase 2 includes conservative
`camera.is_in_view(bounds)`; automatic offscreen and occlusion culling are Phase 3
candidates. Rendering culling must not automatically suppress gameplay updates.
Both visibility questions are resolved: world-axis-aligned rectangle bounds
(AD-049), signed-dimension normalization, inclusive touching, point/line queries,
and nonfinite-input rejection (AD-050).

## Camera lifecycle questionnaire progress

Question 1 of 3 is resolved: configure cameras before drawing; draw consumes
camera state, and snapshot mechanics stay internal (AD-051). The previously
proposed public snapshot contract was not adopted. Continue with camera lifetime
and cleanup expectations.
