# Phase 2 Svelte 5 adapter checkpoint

## Scope

- Added `create_game_adapter` with `initial_state`, typed `commands`, and a
  `create({ canvas, bridge, publish })` factory.
- Added `<GameHost>` using Svelte 5 runes, a per-instance canvas, render-prop
  view, loading/ready/error/disposed state, and unmount disposal.
- Added the `squander/svelte` package subpath and Node-safe
  `squander/svelte/adapter` validation entry.
- Kept publication authority in the game factory; the adapter exposes only a
  readonly bridge and typed command wrappers.

## DX decisions

- `subscribe` delivers one complete view instead of requiring separate state
  and status subscriptions.
- The common component path is `<GameHost>` with a typed `{#snippet children}`;
  custom hosts use `create_game_adapter` directly.
- Commands remain synchronous/asynchronous according to the supplied command
  definitions, and command calls after bridge disposal retain the bridge's
  typed runtime failure behavior.

## Code trace

`src/lib/svelte/GameHost.svelte` → `create_game_adapter` → core
`create_game_bridge` → game `publish` / readonly snapshot → Svelte render-prop
view and typed command wrappers → game disposal on effect cleanup.

## Verification

- `npm run test:unit -- src/lib/svelte/adapter.test.ts` — passed, 3 tests.
- `npm run test:type` — passed, including `type-tests/svelte-adapter.ts`.
- `npm run check` — passed with zero Svelte diagnostics.
- `npm run validate:package` — passed for `squander/core`,
  `squander/core/runtime`, and `squander/svelte/adapter`.
- `npx playwright test --config=playwright.webgpu.config.ts
  tests/webgpu-svelte-adapter.spec.ts` — passed, one browser mount/command/
  navigation recreation test against the trusted Vite origin, including two
  isolated hosts with independent scores and commands.
- SSR unit rendering — passed; `GameHost.ssr.test.ts` imports and renders the
  component without invoking its browser-only game factory.
- Notification scheduling unit coverage — passed; four adapter tests verify
  readonly publication and injected microtask-style batching.
- `npm_config_cache=/private/tmp/squander-npm-cache npm run package` — passed
  through `svelte-package` and `publint`; publint reports repository/license
  suggestions and the existing SvelteKit dependency warning.
- Isolated consumer validation — passed: `npm pack` produced the package,
  a clean temporary consumer imported `squander/svelte/adapter` and ran its
  command wrapper, and TypeScript checked the same consumer against published
  declarations.

## Evidence gaps

The component subpath is intentionally not claimed as Node-executable because
its default module contains `.svelte` source; SSR behavior is covered through
the Svelte SSR test and Svelte-aware packaging.

## Go/no-go

**Promote `svelte-bridge`.** The API/DX seam, disposal race, browser host
mount/unmount, two-host isolation, SSR import/rendering, package consumers, and
adapter coverage are evidenced.
