# Phase 2 package boundary checkpoint

Status: **Replacement package boundary and v8 release metadata verified**.

## Pre-slice contract checkpoint

- The runtime factory surface is present in the generated core entrypoint and
  runtime sub-entrypoint.
- Package validation must use a writable npm cache and record non-fatal publint
  suggestions separately from failures.
- No PixiJS dependency removal or Svelte bridge migration is claimed here.

## Replacement boundary slice

- The package root and `squander/core` now expose the replacement runtime only.
- The optional Svelte adapter remains available through `squander/svelte` and
  `squander/svelte/adapter`; the package root no longer exports legacy `app` or
  `GameHost` symbols.
- The remaining package surface is the replacement runtime and optional Svelte
  adapter; PixiJS-era demos are no longer part of the source tree.

## Migration cleanup slice

- Removed the obsolete PixiJS runtime, viewport helpers, scenes, UI components,
  old scene routes, and old getting-started/UI documentation.
- Removed `pixi.js` from peer/development metadata and the lockfile.
- Added `@webgpu/types` as an explicit development dependency instead of relying
  on a transitive declaration package.
- Updated navigation and integration coverage to target the Phase 2 docs library.

## Evidence

- `npm_config_cache=/tmp/squander-npm-cache npm run package`: passed.
- `npm_config_cache=/tmp/squander-npm-cache npm pack --dry-run --json`: passed;
  packed files include `dist/core/index.js`, `dist/core/runtime/index.js`, and
  declarations.
- Non-fatal suggestions remain for `@sveltejs/kit` declaration, repository URL
  normalization, and license metadata.
- `npm run check`: passed with zero diagnostics.
- `npm_config_cache=/tmp/squander-npm-cache npm run package`: passed; Publint
  reports only the existing repository URL and license suggestions.
- `npm_config_cache=/tmp/squander-npm-cache npm run validate:package`: passed;
  root, `squander/core`, `squander/core/runtime`, and the Svelte adapter imports
  were validated from the generated package.
- `npm run validate:consumer`: passed; an isolated consumer imported the root and
  core entrypoints without Svelte, while a Svelte-aware isolated consumer imported
  the adapter and compiled `GameHost.svelte`.
- `npm run test:unit`: passed with 25 files and 110 tests after removing legacy
  suites.
- `npm run check:coverage`: passed for all 22 included replacement-runtime
  files; the detailed metrics are recorded in
  `phase-2-runtime-coverage.md`.

## Code trace

`src/lib/index.ts` → `src/lib/core/index.ts` → generated `dist/index.js` and
`dist/core/index.js` → Node package self-reference → verified root and explicit
core/runtime factory symbols. The generated package contains only replacement
entrypoints; Svelte component compilation is verified separately in the
Svelte-aware consumer.

## Known gaps and gate

- Bumped the package to `8.0.0` and normalized the repository/license metadata
  for Publint.
- The final package gate is complete. This release intentionally does not add a
  migration guide.
- Go/no-go: **package release validation is complete. Capability promotion is
  recorded in the Phase 2 audit remediation checkpoint.**

## Remaining Phase 2 coverage gaps

The replacement-runtime four-metric coverage gate is complete. Browser-only
renderer correctness remains separate from the CPU report and is evidenced by
the trusted real-WebGPU suite. Current capability promotion is recorded in the
Phase 2 audit remediation checkpoint.
