# Capability specifications

Each capability uses `specs/{capability}/spec.md`; the directory name is its
stable ID. The [spec-system capability](specs/specs/spec.md) defines structure and
lifecycle. Use the [template](spec_template.md) for additions.

## Phase 2 capabilities

Each specification records the capability status, requirements, observable
acceptance criteria, test layers, and open details. Read the status in the
individual specification before treating a capability as complete.

### Implemented

- [asset-loading](asset-loading/spec.md)
- [camera-2d](camera-2d/spec.md)
- [dynamic-assets](dynamic-assets/spec.md)
- [feature-documentation](feature-documentation/spec.md)
- [game-lifecycle](game-lifecycle/spec.md)
- [game-timing](game-timing/spec.md)
- [paths-and-polygons](paths-and-polygons/spec.md)
- [resource-ownership](resource-ownership/spec.md)
- [shape-drawing](shape-drawing/spec.md)
- [sprite-drawing](sprite-drawing/spec.md)
- [svelte-bridge](svelte-bridge/spec.md)
- [text-drawing](text-drawing/spec.md)
- [texture-filtering](texture-filtering/spec.md)
- [viewport-sizing](viewport-sizing/spec.md)
- [webgpu-runtime](webgpu-runtime/spec.md)

### Draft

Existing PixiJS-era tests are not evidence of replacement contracts. Add actual
test-file and tagged-suite links as implementation proceeds. Future candidates
remain in the phase backlogs rather than appearing as accepted contracts.

## Before implementation

- Read [readiness guidance](../specifications/implementation-readiness.md).
- Resolve relevant [open questions](../specifications/open-questions.md).
- Consult [Phase 2 sequencing](../specifications/phase-2.md) and the
  [decision log](../specifications/decisions.md).
- Use `/spec-validate` for an on-demand structure and traceability review.

Phase 1 closeout evidence and the selected verification baseline are recorded
in [phase-1-readiness.md](../specifications/phase-1-readiness.md). The local
structural check is available as `npm run validate:specs`; it does not replace
the on-demand review or behavioral tests.
