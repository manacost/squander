# Toolchain maintenance

This document records the current toolchain and the completed migration that
established the WebGPU replacement runtime. It is not a capability contract.

## Upgrade

- Svelte 5.57.2 and SvelteKit 3.1.0, with adapter-static 4, package 3,
  vite-plugin-svelte 7, Vite 8, and svelte-check 4.
- TypeScript 6.0.3 matches SvelteKit and typescript-eslint peer requirements.
- Vitest 5, Playwright 1.64, ESLint 10, typescript-eslint 8, and Prettier 3
  with prettier-plugin-svelte 4. Exact resolutions are in `package-lock.json`.
- Node.js 22.17 or newer is required. GitHub Pages uses Node.js 24 and `npm ci`.
- PixiJS is not part of the current replacement package surface.

SvelteKit configuration moves into `vite.config.ts`; `#lib` imports replace
`$lib`, and `$app/state` replaces the removed store API. Navigation and static
assets use the typed `resolve` and `asset` helpers. The migration follows the
[official SvelteKit 3 guide](https://svelte.dev/docs/kit/migrating-to-sveltekit-3).

## Historical migration notes

The original SvelteKit and tooling upgrade had separate packaging warnings,
legacy lint debt, and sandbox server-bind failures. Those results are retained
in archived implementation records and do not describe the current repository gate.

## Current verification baseline

- `npm ci` uses the locked dependency graph.
- `npm run check`, `npm run lint`, `npm run test:type`, and `npm run test:unit`
  are required repository gates.
- `npm run test:integration` and `npm run test:webgpu` provide trusted-origin
  browser and real-device rendering evidence.
- `npm run package`, `npm run validate:package`, and
  `npm run validate:consumer` verify the published package boundary.

Strict lint configuration and remaining legacy debt are documented in
[tooling standards](tooling-standards.md).
