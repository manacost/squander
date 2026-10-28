# Phase 2 typed asset checkpoint

## Scope

- `create_game` now accepts an optional typed asset manifest.
- The setup context and game instance expose the manifest-backed asset cache.
- Asset handles retain the existing explicit release and owner-disposal behavior.
- Public type tests verify inferred resource types and reject unknown manifest keys.

## Code trace

`create_game({ manifest })` → `create_asset_cache` → setup `assets.load(key)` →
shared resource owner handle → game disposal → cache release → underlying destroy.

## Verification

- `npm run test:type` — passed.
- `npm run test:unit -- src/lib/core/runtime/game.test.ts` — passed, 9 tests.
- Focused lifecycle/asset coverage — passed for touched runtime files:
  - Statements: 100%
  - Branches: 97.72%
  - Functions: 100%
  - Lines: 100%
- `npm run check` — passed with zero diagnostics.
- `npm run validate:specs` — passed for 16 capability directories.

## Evidence gaps and go/no-go

The typed manifest/cache seam is verified, but `asset-loading` remains Draft.
Image decoding/upload, dynamic File/Blob inputs, browser texture readback, and
asset-specific focused documentation are not yet implemented. Continue the asset
slice without claiming the capability complete.
