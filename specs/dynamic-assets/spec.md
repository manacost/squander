# dynamic-assets

## Goal

Let applications supply assets that were not known when their code was compiled.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Provide a typed texture-loading entry point accepting a File or Blob without adding arbitrary manifest keys.
- The application handles fetching dynamic content; the framework handles decode, validation, upload, and ownership.
- Return the same kind of texture handle used for manifest assets, with the same release and disposal behavior.

## Scenarios

### Avatar upload

A user selects an image. The application passes its File to the loader, draws the returned handle, and releases the old avatar when replacing it.

### Invalid upload

The application passes non-image bytes. Loading rejects with a useful typed error and leaves the running game usable.

## Acceptance criteria

- Load a small image Blob and a File through the public API and render the expected pixels.
- Reject malformed data without leaving a usable handle or leaked ownership.
- Replace and release an uploaded avatar, verifying the replacement still draws and the old handle is invalid.
- Verify the dynamic entry point accepts the declared binary inputs and does not accept unchecked manifest keys.

## Usage description

Illustrative: const avatar = await game.assets.load_texture(file). For remote avatars, the application fetches a Blob first.

## Test references

The validated image-source seam is now covered by
[`src/lib/core/runtime/image_loading.test.ts`](../../src/lib/core/runtime/image_loading.test.ts)
in the `[dynamic-assets] image source decoding` suite. It covers Blob/File
acceptance, cancellation, late-result cleanup, unavailable decoding, and typed
decode failure. GPU texture upload and readback remain unimplemented.

Canvas-image preparation and upload are exercised by the
`[dynamic-assets] prepares a canvas image source and uploads its pixels` suite in
[`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts). Direct
Blob/File decoding and GPU upload are now exercised by the
`[dynamic-assets] decodes Blob and File sources and uploads their pixels` suite
in the same file. Game-owned Blob/File loading and GPU readback are exercised by
the `[dynamic-assets] loads Blob and File textures through a game-owned renderer`
suite. The `[dynamic-assets] rejects malformed input while allowing a valid retry`
suite verifies typed decode failure, continued game usability, and a successful
subsequent upload. Capability promotion remains pending.

Planned verification for the remaining replacement-framework contract:

Browser File/Blob decode and rendering tests, malformed-data tests, public API type tests.

Use `[dynamic-assets]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-013. Open: dimension/byte limits, supported image encodings, duplicate Blob caching, and cancellation behavior. Do not add a remote-fetch service.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
