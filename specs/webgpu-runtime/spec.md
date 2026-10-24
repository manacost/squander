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

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Real Chromium/WebGPU integration, isolated device-loss handling tests, and package-consumer checks.

Use `[webgpu-runtime]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-001, AD-002, and AD-012. Open: supported browser/OS baseline, unavailable-adapter error, device limits, intentional device destruction semantics, and GPU test environment.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
