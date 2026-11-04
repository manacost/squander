# Phase 2 dynamic Blob/File upload checkpoint

## Scope

- Added `WebGpuRenderer.create_texture_from_blob(source, options)` to the
  public runtime renderer interface.
- The method uses the existing typed Blob/File decode seam, uploads the decoded
  ImageBitmap through the deterministic Canvas 2D preparation path, and closes
  the bitmap on both success and failure.
- Exported the WebGPU renderer interface from the runtime entrypoint and added a
  public type test rejecting non-Blob inputs.

## Code trace

`create_texture_from_blob(Blob|File)` → `decode_image_source` → ImageBitmap →
`create_texture_from_image` → RGBA texture upload → draw/readback → bitmap close.

## Verification

- `npm run test:unit -- src/lib/core/runtime/image_loading.test.ts src/lib/core/runtime/texture_filtering.test.ts` — passed, 2 files and 8 tests.
- `npm run test:type` — passed.
- `npm run check` — passed with zero diagnostics.
- `npm run validate:specs` — passed for 16 capability directories.
- `npm run test:webgpu -- --grep 'decodes Blob and File|dynamic-assets'` — passed, 2 real Chromium WebGPU tests.
- `npm run test:webgpu -- --grep 'dynamic-assets|sprite-drawing|texture-filtering|viewport-sizing'` — passed, 11 tests.

## Coverage and evidence gaps

The runtime coverage command still reports the known aggregate gaps: the
renderer is not included in the unit coverage merge and reports 0%, while older
geometry branches remain below 90%. This slice adds browser evidence but does
not claim full `dynamic-assets` promotion: game-owned typed texture loading,
malformed-data browser coverage, and replacement-handle integration remain.

## Go/no-go

**Continue.** Direct Blob/File-to-GPU evidence is no longer blocked in the pinned
Chromium environment. Proceed with public game asset integration and the remaining
sprite/viewport promotion work.
