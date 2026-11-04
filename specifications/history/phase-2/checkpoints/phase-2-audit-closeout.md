# Phase 2 audit remediation checkpoint

Date: 2026-10-29

## Status

**Phase 2 capability and evidence audit resolved for the current scope.**

The four previously Draft runtime capabilities—camera, shapes, sprites, and
viewport sizing—are now marked Implemented. Feature documentation is also
marked Implemented. The remaining advanced behavior is explicitly deferred by
the Phase 2 decisions rather than left as an unresolved implementation gap.

## Remediation

- Updated the text example browser assertion to match the current documentation
  copy.
- Added a real GPU camera fixture covering a sprite, primitive, and text label
  in one synchronous camera scope.
- Promoted capability status records and synchronized the capability index.
- Recorded the current trusted verification environment and exact suite result.

## Evidence

- `npm run validate:specs` — passed; 16 capability directories.
- `npm run check` — passed; zero Svelte diagnostics.
- `npm run test:type` — passed.
- `npm run test:unit` — passed; 27 files and 127 tests.
- `npm run test:coverage:runtime` — passed; 97.57% statements, 95.90%
  branches, 98.46% functions, and 98.38% lines.
- `npm run check:coverage` — passed; all 22 included runtime files exceed 90%
  on every metric.
- `npm run test:webgpu` — passed; 43 real Chromium WebGPU tests.
- `npm_config_cache=/tmp/squander-npm-cache npm run package` — passed;
  Publint reported `All good!`.
- `npm run validate:package` — passed.

## Verification baseline

- OS: macOS 27.2, build 26B123, Apple M1 GPU.
- Browser: Playwright Chromium, HeadlessChrome 156.0.8078.4.
- Origin: `http://127.0.0.1:5173`.
- Security and device: `window.isSecureContext`, `navigator.gpu`, adapter
  creation, and device creation all passed. Chromium exposed no adapter-info
  fields, so the baseline does not claim a WebGPU backend name.
- Probe fixture: DPR 1, viewport 1280×720, with the project’s explicit
  `--enable-unsafe-webgpu --enable-gpu` flags.

## Explicitly deferred

Automatic DOM resize observation, automatic DOM overlay management, advanced
camera projections/culling, additional blend modes, mipmaps, configurable or
rounded stroke styles, richer text layout, and desktop packaging remain outside
Phase 2 according to the decision and candidate logs.

## Remaining environment note

The default sandbox cannot bind local browser-server ports, and its default npm
cache contains root-owned files. The trusted WebGPU suite and package command
were rerun with the required elevated local-server permission and writable npm
cache. Broad repository lint still sees unrelated untracked agent files and is
not treated as Phase 2 evidence.
