# Capability specifications

Each capability uses `specs/{capability}/spec.md`; the directory name is its
stable ID. The [spec-system capability](specs/spec.md) defines structure and
lifecycle. Use the [template](spec_template.md) for additions.

## Phase 2 drafts

The following are Draft, not implemented or verified. Each records the accepted
direction, observable acceptance criteria, planned test layers, and open details.

- [game-lifecycle](game-lifecycle/spec.md)
- [game-timing](game-timing/spec.md)
- [webgpu-runtime](webgpu-runtime/spec.md)
- [asset-loading](asset-loading/spec.md)
- [dynamic-assets](dynamic-assets/spec.md)
- [resource-ownership](resource-ownership/spec.md)
- [sprite-drawing](sprite-drawing/spec.md)
- [shape-drawing](shape-drawing/spec.md)
- [paths-and-polygons](paths-and-polygons/spec.md)
- [viewport-sizing](viewport-sizing/spec.md)
- [camera-2d](camera-2d/spec.md)
- [texture-filtering](texture-filtering/spec.md)
- [text-drawing](text-drawing/spec.md)
- [svelte-bridge](svelte-bridge/spec.md)
- [feature-documentation](feature-documentation/spec.md)

Existing PixiJS-era tests are not evidence of these replacement contracts. Add
actual test-file and tagged-suite links as implementation proceeds. Future
candidates remain in the phase backlogs rather than being presented as accepted
capability contracts.

## Before implementation

- Read [readiness guidance](../specifications/implementation-readiness.md).
- Resolve relevant [open questions](../specifications/open-questions.md).
- Consult [Phase 2 sequencing](../specifications/phase-2.md) and the
  [decision log](../specifications/decisions.md).
- Use `/spec-validate` for an on-demand structure and traceability review.
