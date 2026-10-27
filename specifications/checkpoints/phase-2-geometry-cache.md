# Phase 2 geometry cache checkpoint

Status: **Persistent owned-geometry GPU buffer reuse and update replacement verified; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- A successfully read owned geometry snapshot can reuse its GPU vertex buffer
  across draws of the same handle.
- When the handle updates to a new snapshot, the prior cached buffer is
  destroyed and replacement geometry is uploaded before drawing.
- Per-frame raw triangle, polygon, and stroke commands remain transient.
- Cached buffers are destroyed with renderer disposal; handle-release cleanup
  before renderer disposal is not yet observable through the current handle API.

## Implemented slice

- Added handle/snapshot keyed GPU buffer caching for owned geometry.
- Added replacement and persistent-buffer disposal paths.
- Added real readback coverage for geometry update replacement.

## Evidence

- Focused real WebGPU test: cached geometry replacement passed.
- `npm run test:webgpu`: passed, 26 tests.
- `npm run test:unit`: passed, 24 files and 75 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- Spec validation, focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`verification/webgpu-renderer.spec.ts` → owned handle read → snapshot-keyed
cache lookup → persistent vertex buffer reuse or old-buffer destroy/new-buffer
upload → render pass/readback. Handle update changes snapshot identity and takes
the replacement path; renderer disposal destroys retained buffers.

## Known gaps and gate

- The renderer cannot observe a handle release until a later command read fails;
  released-handle cache cleanup before renderer disposal remains unresolved.
- Public path/polygon factories, package exports, and broader lifecycle
  integration remain deferred.
- Go/no-go: **continue with release-observation or document its boundary before
  capability promotion; do not promote `paths-and-polygons`.**
