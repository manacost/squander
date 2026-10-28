# Phase 2 resource ownership promotion checkpoint

Status: **Implemented for Phase 2.**

## Public-to-runtime trace

`create_game()` and the public geometry/asset APIs acquire opaque handles from
the game-owned resource owner. Draw submission obtains a lease before encoding,
so releasing a handle invalidates only future reads while an already accepted
draw keeps its underlying GPU resource alive until completion. Owner disposal
releases remaining handles exactly once.

## Evidence

- `src/lib/core/runtime/resource_ownership.test.ts` covers shared handles,
  stale aliases, repeated release, leases, final-owner destruction, foreign
  ownership, and idempotent disposal.
- `src/lib/core/runtime/geometry_ownership.test.ts` covers game-scoped geometry,
  release-before-update, cross-game rejection, and disposal cleanup.
- `type-tests/phase-2-runtime.ts` rejects forged ordinary `ResourceHandle`
  values and wrong asset kinds.
- `tests/webgpu-renderer.spec.ts` proves a real WebGPU draw remains valid when
  its handle is released immediately after acceptance, and that later handle
  reads fail.
- `tests/webgpu-renderer.spec.ts` also proves independent games use isolated
  devices/resources and that disposing one does not affect the other.

## Boundary

Fake resources cover deterministic ownership accounting. Real Chromium WebGPU
readback covers accepted draw lifetime, texture destruction timing, and device
isolation. Scene automation and future multi-scene ownership remain outside
Phase 2.

## Verification

Focused unit, type, Svelte check, spec validation, and the focused real-WebGPU
fixtures passed on 2026-10-28. The real-GPU environment is the trusted local
origin configured by `playwright.webgpu.config.ts`; its browser report records
the adapter, backend, DPR, viewport, and fixture dimensions.

## Go/no-go

**Promote `resource-ownership`.** The public handle, ownership, disposal, and
accepted-draw evidence satisfy the Phase 2 contract.
