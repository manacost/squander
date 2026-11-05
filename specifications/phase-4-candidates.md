# Phase 4 capability candidates

Last updated: 2026-10-22.

These are future candidates, not committed scope. Acceptance criteria and test
mappings must be defined before implementation.

Phase 1 closeout does not promote fixed-step scheduling or mipmaps into Phase 2.

## P4-001: Optional fixed-step scheduling

Phase 2 uses variable `update(dt)` timing. Consider an optional scheduler that
advances simulation at a fixed interval independently of drawing.

Explore bounded catch-up updates, drawing between batches of updates,
interpolation support, and overload behavior. No fixed-step or automatic draw
skipping API is committed by this entry. A fixed timestep alone does not
guarantee deterministic simulation or a sustainable update rate.

## P4-002: Mipmap support

Consider generated or supplied mip levels for improved texture minification.
Phase 2 uses the original texture level with configurable nearest or linear
filtering; substantial downscaling may shimmer or lose detail.

Define generation/loading behavior, sampling policy, and resource costs before
implementation. Sprite and bitmap-font atlases need special care to avoid
neighboring regions bleeding into one another at smaller mip levels. Test
minification and atlas boundaries when this candidate is promoted into scope.

Related backlog: [Phase 3 candidates](phase-3-candidates.md).
