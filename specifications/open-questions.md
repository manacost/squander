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
- `resource-ownership`: release/scope API and safe GPU destruction timing.

## Rendering

- `sprite-drawing`: color helper signatures/ranges and error types, color/alpha encoding and invalid per-draw opacity handling,
  atlas metadata, and negative-scale policy.
- `shape-drawing`: transformation pivots, the exact miter limit, very wide strokes,
  antialiasing, and nonuniform object-scale behavior.
- `paths-and-polygons`: exact command shapes, update-operation name (revisit `replace`),
  polygon editing ergonomics, rebuild scheduling, command sequencing/empty subpaths, tessellation tolerance, winding, invalid inputs,
  and reusable geometry ownership/disposal.
- `viewport-sizing`: pixel rounding, zero-size hosts, DPR policy, bar color, and
  whether policy changes require recreation.
- `camera-2d`: default mapping, position meaning, application scope, and zoom limits.
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

Questions 1 and 2 of 4 are resolved: editable declarative command arrays,
snapshotted by opaque path handles with explicit validated updates (AD-033), and
multiple disconnected subpaths sharing draw style/transforms (AD-034). Revisit
the update verb; `replace` was not accepted as final naming. Continue with polygon
construction/editing ergonomics. Four is an estimate for this block.
