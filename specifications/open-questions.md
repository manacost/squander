# Open contract questions

No blocking contract questions remain for the completed Phase 1, Phase 2,
Phase 3-a, or Phase 3-b scope. Their accepted behavior is recorded in the
[decision log](decisions.md) and the implemented capability specs under
[`../specs/`](../specs/README.md).

This file contains only questions that must be answered before a future
capability becomes an implementation contract. A candidate is not promoted by
answering these questions alone; it also needs a capability specification,
acceptance evidence, and the relevant documentation.

## Future capability gates

- **ECS integration:** The Draft [ecs-system capability](../specs/ecs-system/spec.md)
  records the current goals and alternatives. Before implementation, decide
  whether Squander ships a minimal ECS or exposes composition seams for an
  application-owned ECS, then define ownership, update ordering, and disposal
  boundaries.
- **Action mapping:** Define action names, rebinding, device precedence, and
  how mapped actions coexist with the raw input router.
- **Text input and IME:** Define composition events, editable-control policy,
  and the boundary between browser text editing and gameplay input.
- **Camera extensions:** Define cursor-anchored zoom, swappable projections,
  and any screen-space stroke policy before implementation.
- **Rendering extensions:** Define culling correctness, custom shaders, render
  targets, blend modes, curved fills, holes, and fill rules with measured
  performance and real-device evidence.
- **Text and assets:** Define rich layout, shaping, fallback, supplied atlas
  import, generated manifests, and advanced font workflows.
- **Simulation and packaging:** Define fixed-step overload behavior, desktop
  wrapper support, safe storage/math utilities, and the supported OS/GPU matrix.

See the [Phase 3 candidate log](phase-3-candidates.md) and
[Phase 4 candidate log](phase-4-candidates.md) for current placement. Do not
reopen accepted decisions in this file; add a superseding decision when a
future capability changes the architecture.

## Slice gate for future work

Before implementation, resolve the capability's public contract, ownership and
failure behavior, lifecycle boundaries, type-test misuse cases, documentation
surface, and the CPU/browser/WebGPU evidence needed to prove it.
