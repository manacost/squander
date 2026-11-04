# Tooling standards

AD-021 sets the quality baseline for new framework work. The global verification
suite requires `npm run lint`, alongside type checks and tests. Run `npm run
lint:format` and `npm run lint:code` independently when diagnosing failures.
`npm run lint` requires both formatting and code lint to pass.

All future changes must leave ESLint with zero warnings and zero errors. A
change may not introduce new diagnostics or rely on broad suppression. Resolve
the diagnostic in the changed code, or use the smallest named, explained
exception for a required external API contract.

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

## Verification baseline

The complete project is checked with zero fatal/parser errors, zero ESLint
warnings, and zero ESLint errors. The replacement runtime and documentation
workflow use the same strict rules; broad suppressions are not accepted.

Run `npm run lint` for the repository gate. Run `npm run lint:format` and
`npm run lint:code` separately when diagnosing a failure. Formatting and code
lint are independent checks, and generated output remains excluded.

The current verification baseline is recorded in the phase closeout evidence
under [`specifications/history/`](history/README.md).

See [toolchain maintenance](toolchain-maintenance.md) for version choices and
runtime verification. No >90% replacement-framework coverage is claimed here.
