# Phase 2 WebGPU renderer checkpoint

Status: **First GPU-backed replacement slice verified**.

## Implemented slice

- Added a WebGPU-only canvas renderer that requests an adapter and device,
  configures the preferred canvas format, clears a render attachment, submits
  commands, and reads back deterministic pixels.
- Added typed availability errors for insecure contexts, unavailable WebGPU,
  unavailable adapters, and missing canvas contexts.
- Normalized BGRA canvas readback to the renderer's RGBA result contract after
  the host fixture exposed the format difference.
- Kept the renderer internal; the legacy PixiJS package boundary is unchanged.

## Evidence

- `npm run test:webgpu`: passed; both the baseline probe and
  `[webgpu-runtime]` renderer test passed on trusted local Chromium.
- The first renderer attempt failed with BGRA readback ordering
  `[191, 128, 64, 255]` for an RGBA request; the normalized implementation now
  reads `[64, 128, 191, 255]`.
- `npm run check`: passed with zero diagnostics.
- Targeted ESLint and Prettier checks passed.
- Existing unit suite remains passing; it does not prove GPU shader behavior.

## Trace

The verified path is Playwright → trusted Vite origin → dynamic Vite module
import → `create_webgpu_renderer` → adapter/device → canvas context → render
pass clear → command submission → mapped readback → RGBA assertion.

## Gate

The next GPU slice may add texture upload and sprite commands. Device-loss
handling, mixed draw ordering, and package exports remain separate acceptance
requirements.
