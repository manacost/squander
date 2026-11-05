# Phase 2 dynamic image-input checkpoint

## Scope

- Added validated Blob/File image-source decoding.
- Added typed decode failures and abort errors.
- Closed decoded ImageBitmap results that arrive after cancellation.
- Exported the seam through the replacement runtime entrypoint.

## Code trace

`decode_image_source(Blob | File)` → input validation → browser
`createImageBitmap` → cancellation race → `ImageBitmap` result or typed failure
→ caller-owned upload/release boundary.

## Verification

- `npm run test:unit -- src/lib/core/runtime/image_loading.test.ts` — passed, 6 tests.
- `npm run check` — passed with zero diagnostics.
- Focused image-loading coverage — passed:
  - Statements: 100%
  - Branches: 100%
  - Functions: 100%
  - Lines: 100%

## Evidence gaps and go/no-go

This checkpoint verifies only the browser image-input seam. It does not claim
texture upload, malformed-image browser decode evidence, dynamic handle ownership,
or deterministic GPU readback. `dynamic-assets` remains Draft.
