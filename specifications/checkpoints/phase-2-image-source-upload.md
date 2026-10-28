# Phase 2 image-source upload checkpoint

## Scope

- Added `create_texture_from_image` for validated `CanvasImageSource` preparation.
- The source is copied through a temporary preparation canvas into the existing
  owned RGBA texture path.
- Texture release remains governed by the existing resource owner.

## Code trace

`create_texture_from_image(source, width, height)` → Canvas 2D source preparation
→ RGBA pixel extraction → `create_texture` → owned GPU texture → draw submission
→ readback → release.

## Verification

- `[dynamic-assets] prepares a canvas image source and uploads its pixels` — passed
  on real Chromium WebGPU with deterministic red-pixel readback.
- `npm run test:unit` — passed, 26 files and 103 tests.
- `npm run test:type` — passed.
- `npm run check` — passed with zero diagnostics.

## Evidence gap and go/no-go

Direct `ImageBitmap` and Blob/File-to-GPU evidence is not promoted. In this
Chromium environment, browser-created ImageBitmap sources reported zero
dimensions and `copyExternalImageToTexture` produced black readback pixels.
The pure Blob/File decode seam remains verified, but the dynamic texture upload
criterion is blocked until a supported real-image fixture is available.
Do not promote `dynamic-assets` yet.
