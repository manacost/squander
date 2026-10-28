# webgpu-runtime

## Goal

Provide a WebGPU-only rendering runtime with explicit availability and device-loss behavior.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Use WebGPU without PixiJS, Canvas 2D game rendering, or a WebGL fallback. Canvas 2D is permitted for font preparation.
- Keep runtime resources isolated per game instance.
- Device loss stops the loop with a distinct device-lost error. Recovery requires disposal and a fresh game instance.
- Initially verify a specified Chromium environment; desktop packaging is deferred.

## Scenarios

### Lost device

The active device becomes unavailable. The host can display the failure and dispose the failed instance rather than repeatedly submitting frames.

### Independent games

Two game hosts exist; disposing one does not destroy the other game’s resources.

## Acceptance criteria

- Present a known image through a real WebGPU context; no PixiJS or fallback rendering is involved.
- Trigger controlled device loss and verify the distinct error and stopped loop; distinguish expected teardown from unexpected loss under the agreed policy.
- Run two hosts and dispose one; the other continues rendering correctly.
- Package a core consumer without Svelte and verify its public imports contain no required Svelte or PixiJS dependency.

## Usage description

The game factory initializes the GPU runtime during setup. Applications handle typed initialization and device-loss failures.

## Test references

Current verification:

- [`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts)
  verifies secure-context and WebGPU availability, real adapter/device-backed
  canvas clearing, and deterministic RGBA readback in the
  `[webgpu-runtime] clears and reads back a real canvas texture` suite.
- [`tests/webgpu.spec.ts`](../../tests/webgpu.spec.ts) retains the
  independent low-level adapter/device probe.

Device-loss transitions, independent game devices, and final package-consumer
checks remain unimplemented.

## Notes

AD-001, AD-002, and AD-012. The current renderer rejects insecure contexts,
missing WebGPU, missing adapters, and missing canvas contexts with a typed
availability error. The test baseline is trusted local Chromium on the Apple
M1/Metal host. Device-loss transitions and final package checks remain open.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
