# Phase 2 Sequence 0 checkpoint

Status: **Complete with recorded environment constraints**.

## Scope

This checkpoint covers only verification feasibility. It does not claim that
the replacement framework is implemented.

## Observed evidence

- `npm run validate:specs`: passed; 16 capability directories validated.
- `npm run test:type`: passed; the existing type-test harness compiled.
- `npm run test:unit`: passed; 7 files and 18 tests passed. These remain
  PixiJS-era tests and are not replacement-framework evidence.
- `npm run test:webgpu`: passed with the required elevated local-server
  permission. The real Chromium fixture created a WebGPU adapter and device,
  rendered the deterministic fixture, and read back the expected result.
- The same WebGPU command first failed in the restricted sandbox with
  `EPERM` while binding `127.0.0.1:5173`; that is an environment constraint,
  not a rendering result.

## Trace

The verification path is `package.json` script →
`playwright.webgpu.config.ts` → trusted Vite origin →
`verification/webgpu.spec.ts`. The type path is the `test:type` script →
`tsconfig.type-tests.json` → `type-tests/phase-1-harness.ts`. Structural
validation is the `validate:specs` script → `verification/validate-specs.mjs`.

## Gate

Sequence 1 may begin. No replacement capability is promoted, and no coverage
or compatibility claim is made from this checkpoint.
