# Phase 4 capability candidates

Last updated: 2026-10-22.

These are future candidates, not committed scope. Acceptance criteria and test
mappings must be defined before implementation.

Earlier closeout work does not promote mipmaps into the current runtime.

## P4-001: Optional fixed-step scheduling — promoted

The runtime uses variable `update(dt)` timing. Consider an optional scheduler that
advances simulation at a fixed interval independently of drawing. The accepted
contract is now implemented in [fixed-step](../specs/fixed-step/spec.md).

The implementation uses bounded catch-up updates, one draw after each browser
callback's update batch, and explicit overload reporting. Interpolation,
rollback, and automatic draw skipping remain uncommitted.

## P4-002: Mipmap support

Consider generated or supplied mip levels for improved texture minification.
The runtime uses the original texture level with configurable nearest or linear
filtering; substantial downscaling may shimmer or lose detail.

Define generation/loading behavior, sampling policy, and resource costs before
implementation. Sprite and bitmap-font atlases need special care to avoid
neighboring regions bleeding into one another at smaller mip levels. Test
minification and atlas boundaries when this candidate is promoted into scope.

Related backlog: [future capability candidates](phase-3-candidates.md).
