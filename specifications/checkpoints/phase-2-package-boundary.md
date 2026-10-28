# Phase 2 package boundary checkpoint

Status: **Replacement public boundary verified; final PixiJS migration remains Draft**.

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
- Legacy PixiJS demos are routed through an internal `src/lib/legacy` boundary
  while demo cleanup and dependency removal remain in the final migration slice.

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

## Code trace

`src/lib/index.ts` → `src/lib/core/index.ts` → generated `dist/index.js` and
`dist/core/index.js` → Node package self-reference → verified root and explicit
core/runtime factory symbols. Legacy route imports resolve through
`src/lib/legacy/index.ts` and are not part of the replacement public entrypoint.

## Known gaps and gate

- Final package export cleanup, dependency metadata decisions, WebGPU type
  declarations, PixiJS dependency removal, obsolete demo removal, and isolated
  consumer validation without Svelte remain unimplemented.
- Go/no-go: **continue with the intentional PixiJS/package migration; do not
  promote the full Phase 2 package.**
