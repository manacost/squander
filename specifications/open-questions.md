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
- `shape-drawing`: transformation pivots, fixed cap/join behavior, degenerates,
  antialiasing, and nonuniform object-scale behavior.
- `paths-and-polygons`: path syntax, tessellation tolerance, winding, invalid inputs,
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

Questions 1–3 of 5 are resolved: top-left rectangle anchors, center-based circles,
explicit line endpoints (AD-028), centered strokes (AD-029), and world-unit stroke
widths that scale with the world (AD-030). Inside/outside alignment and constant
screen thickness are Phase 3 candidates. Continue with fixed cap/join behavior.
Five is the estimate for this block, not all remaining geometry contracts.
