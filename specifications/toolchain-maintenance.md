# Toolchain maintenance

This maintenance implements AD-021 ahead of the WebGPU replacement. It does not
implement the draft rendering capabilities.

## Upgrade

- Svelte 5.57.2 and SvelteKit 3.1.0, with adapter-static 4, package 3,
  vite-plugin-svelte 7, Vite 8, and svelte-check 4.
- TypeScript 6.0.3 matches SvelteKit and typescript-eslint peer requirements.
- Vitest 5, Playwright 1.64, ESLint 10, typescript-eslint 8, and Prettier 3
  with prettier-plugin-svelte 4. Exact resolutions are in `package-lock.json`.
- Node.js 22.17 or newer is required. GitHub Pages uses Node.js 24 and `npm ci`.
- PixiJS remains pinned to the previously installed 8.5.1 during this migration.

SvelteKit configuration moves into `vite.config.ts`; `#lib` imports replace
`$lib`, and `$app/state` replaces the removed store API. Navigation and static
assets use the typed `resolve` and `asset` helpers. The migration follows the
[official SvelteKit 3 guide](https://svelte.dev/docs/kit/migrating-to-sveltekit-3).

## Verification baseline

Before the upgrade, type checking passed and all 18 unit tests passed. Build and
packaging succeeded with a SvelteKit dependency warning and a repository URL
suggestion. ESLint reported six errors and 68 warnings. Formatting reported eight
unrelated skill files; those files were preserved.

The original browser-test attempt was blocked by sandbox port binding, so it
provided no application-level baseline result. Upgraded browser verification runs
with the required local-server and browser permissions.

## Current verification

- Clean `npm ci` succeeds without peer-dependency bypasses.
- `npm run check`: zero errors or warnings.
- `npm run test:unit`: seven files, 18 passing tests.
- Production build and package generation succeed. Package validation retains the
  SvelteKit dependency warning and repository URL suggestion; the newer Publint
  also suggests declaring the existing license in package metadata.
- `npm run test:integration`: all five tests pass. Browser verification covers documentation navigation, rendering surfaces in
  Pixi and camera demos, Svelte bridge interaction, and returning to the home page.

Strict lint configuration and remaining legacy debt are documented in
[tooling standards](tooling-standards.md).
