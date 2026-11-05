# Phase 2 feature documentation checkpoint

Status: **Core/Demos documentation structure and guide inventory verified; dedicated live proof pages remain optional follow-up**.

## Pre-slice contract checkpoint

- Documentation must distinguish verified slices from promoted capabilities.
- The route may link evidence commands and repository checkpoints, but must
  distinguish verified implementation seams from Draft capability promotion.
- The docs navigation must expose focused Core guides and live Demos without a
  dead landing page.

## Implemented slice

- Removed the low-value `/docs/examples` landing page.
- Added `Core` and `Demos` sidebar sections.
- Kept the live playground, Svelte adapter, and focused text routes stable.
- Added the feature/documentation crossover rule and the Phase 2 gap audit.
- Added generated Core guides for every remaining runtime capability, each with
  a live demo link, explanation, public types, code sample, proof boundary, and
  limitations.

## Evidence

- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- `npm run validate:specs`: passed, 16 capability directories.
- `npm run test:integration -- --grep 'core documentation'`: passed; Core and
  Demos navigation resolve to useful pages.
- `npm run test:integration -- --grep 'Core exposes'`: passed; every Core guide
  is present in the sidebar and the camera guide renders its shared structure.
- Prettier and `git diff --check`: passed.

## Code trace

`src/routes/(docs)/+layout.svelte` Core/Demos navigation → focused Core index
and live demo routes → rendered SvelteKit pages. The five-part crossover rule
and capability inventory are recorded in
`phase-2-feature-documentation-audit.md`.

## Known gaps and gate

- Per-capability runnable demos beyond the composition/Svelte examples and
  complete coverage promotion remain deferred.
- Go/no-go: **release metadata and package validation are complete; do not
  promote the full Phase 2 package until individual capability gates pass.**
