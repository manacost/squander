# Tooling standards

AD-021 sets the quality baseline for new framework work. Run `npm run check`,
`npm run lint:format`, and `npm run lint:code` independently when diagnosing
failures. `npm run lint` requires both formatting and code lint to pass.

## Enforced rules

- TypeScript strict checking remains enabled. ESLint applies strict type-aware
  and stylistic rules to source, Svelte components/rune modules, tests, and root
  TypeScript configuration files via `tsconfig.eslint.json`.
- Explicit `any`, unsafe type operations, floating/misused promises, and unused
  identifiers are errors. Intentionally unused parameters may start with `_`.
- Prefer `type` declarations. Use snake_case for ordinary runtime identifiers
  and properties, PascalCase for types/classes, and preserve imported API names.
  Imported Svelte components retain their PascalCase names.
- External API names, framework contracts, and local component aliases that
  cannot follow ordinary naming rules need narrow, explained exceptions.
  Quoted properties requiring quotes, explicit overrides, and Svelte's
  `$`-prefixed compiler/store bindings have specific naming exemptions.
- Unused suppressions, unexplained suppressions, and disables without named
  rules are errors. Keep exceptions at the smallest applicable scope.
- ESLint runs with zero allowed warnings. Generated outputs are excluded.
- Prettier retains two-space indentation, double quotes, trailing commas, and
  a 140-character print width.

For a necessary untyped external boundary, name the rule and explain the reason:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- The legacy plugin supplies an untyped callback payload.
type LegacyPayload = any;
```

A suppression is an exception to review, not a substitute for designing a typed
boundary. Prefer validation and `unknown` where the value's shape is not known.

## Verification and remaining debt

The configuration parses the complete project with zero fatal/parser errors.
Focused disposable probes verified valid snake_case code, rejection of explicit
`any`, acceptance of a reasoned exception, rejection of an unexplained exception,
floating-promise detection, and naming enforcement.

At this maintenance checkpoint, ESLint reports 911 errors and zero warnings in
existing code under the new standard. These are not waived or hidden; migration
and renderer work must address relevant violations as affected code is replaced.
The prior configuration reported six errors and 68 warnings, so these counts are
not directly comparable measures of regressions. New migration configuration and
browser tests pass their lint checks.

Repository-wide formatting still fails on eight unrelated skill documents that
already failed before this work. Those files were preserved. All changed files
pass formatting. Therefore the repository's aggregate lint command is **not yet
green**; passing type checks/build/tests does not mean lint debt is resolved.

See [toolchain maintenance](toolchain-maintenance.md) for version choices and
runtime verification. No >90% replacement-framework coverage is claimed here.
