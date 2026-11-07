# Current framework state

This is the default entry point for the current framework contract. Phase 2,
Phase 3-a, and Phase 3-b are complete and their implemented capabilities are
listed below. Historical plans and slice evidence are archived under
[`specifications/history/`](../specifications/history/README.md).

## Source of truth

- [`specifications/decisions.md`](../specifications/decisions.md) records
  durable architectural decisions and their boundaries.
- `specs/{capability}/spec.md` records current observable behavior, usage, and
  verification references.
- [`phase-3-candidates.md`](../specifications/phase-3-candidates.md) and
  [`phase-4-candidates.md`](../specifications/phase-4-candidates.md) record
  future work; candidates are not commitments.
- [`specifications/history/`](../specifications/history/README.md) contains
  historical plans and evidence. Read it only when auditing a past slice.
- `.codex/plans/` contains temporary execution state and should contain only
  active work.

## Implemented capabilities

### Phase 2: WebGPU foundation

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

### Phase 3: composition and input

- [scene-lifecycle](scene-lifecycle/spec.md)
- [scene-assets](scene-assets/spec.md)
- [scene-signals](scene-signals/spec.md)
- [scene-ui](scene-ui/spec.md)
- [input-routing](input-routing/spec.md)

### Phase 3 draft capabilities

- [ecs-system](ecs-system/spec.md)

## Verification baseline

Use focused checks first, then the repository gates:

```sh
npm run validate:specs
npm run check
npm run lint
npm run test:type
npm run test:unit
npm run test:integration
npm run test:webgpu
npm run package
npm run validate:package
npm run validate:consumer
```

WebGPU claims require trusted local Chromium with `navigator.gpu`, adapter and
device creation, explicit GPU flags, and deterministic texture or buffer
readback. Coverage and mocked GPU tests do not replace real-device evidence.

## Future work

Read the candidate logs for deferred behavior such as action mapping,
cursor-anchored zoom, automatic culling, custom shaders, fixed-step scheduling,
and mipmaps. The [ecs-system](ecs-system/spec.md) document is a Draft contract;
do not treat it as an accepted implementation until its evidence plan passes.

## Adding or changing a capability

Copy [`spec_template.md`](spec_template.md) into a stable capability directory.
Keep the lifecycle status separate from the target phase, link the relevant
architecture decisions, and add matching bracketed capability tags to focused
test suites. Use the [implementation readiness guidance](../specifications/implementation-readiness.md)
before implementation and run `npm run validate:specs` after contract changes.

The [spec-system capability](specs/spec.md) defines the format and lifecycle
vocabulary. Validation is an on-demand structural and traceability review; it
does not replace behavioral tests or real rendering evidence.
