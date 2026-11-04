# Phase 3-a: composition stack

> Historical plan. For current behavior, read `specs/README.md` and the
> relevant capability specification.

> This document records the original Phase 3-a plan. The plan is complete;
> Phase 3-b is specified separately in [`phase-3-b.md`](phase-3-b.md).

## Purpose

Phase 3-a adds the first higher-level composition layer above the Phase 2 game
kernel. It makes scenes, their owned assets, typed communication, and optional
Svelte overlays work together without moving Svelte into the core runtime.

This plan is the contract for four independently completed slices. Each slice
must be specified, implemented, verified, reviewed, gap-checked, and committed
before the next slice is promoted.

Phase 3-a is intentionally limited to:

1. Scene lifecycle and composition.
2. Scene asset dependencies.
3. Typed signals and scene communication.
4. Scene-owned Svelte UI overlays.

Phase 3-b through Phase 3-e are excluded. They will receive separate API
designs before planning or implementation:

- Phase 3-b: input routing, keyboard events, and gamepad detection.
- Phase 3-c: ECS integration.
- Phase 3-d: camera and rendering extensions.
- Phase 3-e: additional safety utilities and remaining exploratory work.

## Goals alignment

Phase 3-a advances the goals in [`goals.md`](../../goals.md):

- composition over inheritance through factory-based scenes and explicit
  ownership;
- a callback-driven game style with structured lifecycle and resources;
- strong public typing, including event maps, scene context, asset handles, and
  Svelte overlay contracts;
- a Svelte-independent core with an optional first-class Svelte integration;
- explicit resource ownership and disposal;
- focused documentation, type tests, unit tests, and real browser evidence.

It does not expand the framework into 3D, add a WebGL fallback, introduce
automatic device-loss recovery, or make gameplay state globally reactive.

## Existing-functionality research baseline

The repository research wave found these relevant seams:

- `create_game` owns one frame loop, renderer, asset cache, resource owner, and
  geometry owner. Setup is asynchronous; disposal is idempotent and wins over
  late setup work. Scenes must compose above this lifecycle rather than replace
  it.
- `create_asset_cache` already shares concurrent work within one game and
  returns independently releasable handles. `create_resource_owner` already
  provides explicit sharing, invalidation, leases, and final-owner destruction.
  Scene asset dependencies should orchestrate these primitives, not create a
  second GPU lifetime system.
- `create_signal` provides typed payload callbacks, `once`, removal, and
  clearing; it remains programmer-owned while scene subscriptions are scoped.
- `create_game_bridge`, `create_game_adapter`, and `GameHost` already establish
  per-instance UI ownership, readonly snapshots, typed commands, SSR-safe
  rendering, and teardown behavior. Scene-owned UI should extend this seam while
  keeping the core scene package free of Svelte imports.
- `src/lib/core/ecs.ts` is an old singleton-style experiment and is not a Phase
  3-a dependency. It must not be expanded incidentally while building scenes.
- Existing Phase 2 specs document scene ownership as deferred. Their status and
  wording must be updated only when the corresponding Phase 3-a acceptance
  evidence exists.

This baseline is repository research, not proof of the Phase 3-a behavior. Each
slice repeats a focused research wave before implementation and records changed
assumptions in its checkpoint.

## Dependency order

```text
scene lifecycle/composition
          |
          +--> scene asset dependencies
          |
          +--> typed signals
          |
          +--> scene-owned Svelte overlays
```

The signal and asset slices may be developed independently after the scene
contract is stable, but both are consumed by the overlay slice. No slice may
hide an unresolved contract decision behind an implementation detail.

## Required workflow for every slice

### 1. Research wave and trace

Before coding, record:

- the relevant goals, decisions, open questions, and existing capability specs;
- current public exports and runtime ownership boundaries;
- existing tests and documentation that cover adjacent behavior;
- a comparison of what already works, what is missing, and what must remain
  unchanged;
- risks, non-goals, and contract decisions required for the slice.

The trace must follow the public entry point through lifecycle/resource
boundaries, implementation modules, tests, and documentation. External research
is optional and should be used only when it answers a real API or platform
question; repository behavior is the primary source for migration decisions.

### 2. Spec-driven red-green TDD

For each slice:

1. Create or update a stable capability spec under `specs/{capability}/spec.md`.
2. Mark unresolved API decisions explicitly and resolve them before implementation.
3. Add failing tests for each acceptance criterion, including public type tests.
4. Implement the smallest coherent change.
5. Refactor only after focused tests pass.
6. Add or update focused documentation and a runnable example when behavior is
   user-visible.

Every test suite uses a bracketed stable capability tag. A type test must verify
both intended inference and representative rejected misuse.

### 3. Verification and review

Run focused checks first, then the broader checks required by the repository:

- `npm run check`
- `npm run lint` (Prettier and ESLint; run `npm run lint:code` separately when
  diagnosing ESLint failures)
- `npm run test:unit`
- `npm run test:type`
- `npm run validate:specs`
- `npm run test:integration` for browser-visible behavior
- `npm run test:webgpu` when the slice changes rendering or resource submission
- `npm run test:coverage:runtime` and `npm run check:coverage` when runtime code
  changes, recording statements, branches, functions, and lines separately

The real WebGPU baseline remains mandatory for rendering/resource claims. A
mocked renderer may prove CPU lifecycle behavior but cannot prove GPU behavior.
Failures are classified as fixable, environment-blocked, contract-blocked, or
pre-existing and recorded with the exact command and affected criterion.

At the slice boundary, perform a review against the slice spec, goals, trace,
acceptance criteria, and non-goals. The review verdict must be `READY` before
gap analysis. A non-READY result returns to the current slice.

### 4. Independent gap report and iteration limit

After a `READY` review, use a fresh agent with no implementation authorship
assumption to write a gap report comparing:

- the slice plan and capability spec;
- the acceptance criteria;
- the implementation and public exports;
- the tests, type tests, integration evidence, and documentation;
- the recorded trace and goals alignment.

The report is `PASS` only when every acceptance criterion has evidence and no
unresolved contract is hidden. On `FAIL`, make one focused iteration, rerun the
review and gap report, and record the iteration number. Stop after the third
failed iteration and involve the user. Do not promote a slice on a passing
structural validator alone.

### 5. Checkpoint, worklog, and commit

At completion, update:

- this versioned plan with the final contract, changed files, trace, evidence,
  review verdict, gap report verdict, limitations, and next slice;
- the local ledger at `.codex/plans/phase-3-a.status.md`;
- the local worklog at `.codex/plans/phase-3-a.worklog.md`;
- a versioned checkpoint under `specifications/history/phase-3/checkpoints/`.

Commit only the coherent slice with a Conventional Commit. Record the commit in
the ledger and worklog before selecting the next slice.

## Slice 1: scene lifecycle and composition

### Outcome

Provide a core scene composition API that mounts scene instances into the game
loop, supports explicit replacement/removal and ordered stacking, and disposes
scene-owned work without changing Phase 2 game lifetime rules.

### Research and analysis questions

- Where should scene update and draw calls sit relative to the existing game
  callbacks, camera scopes, and draw order?
- Are scene factories synchronous, asynchronous, or both, and how do setup
  failures map to `GameInitializationError` versus scene-specific errors?
- What happens when a scene is mounted, replaced, removed, or disposed during an
  update or draw callback?
- Is a scene stack a single active scene plus overlays, or a general ordered list?
  Choose the smallest contract that supports later scene-owned overlays.
- Which operations are legal before `game.ready`, after game disposal, and after
  scene disposal?
- How are scene-local resources and subscriptions cleaned up on unmount, and how
  are late asynchronous results prevented from reviving a scene?

### Planned feature changes

- Add a core scene capability and public exports without importing Svelte.
- Add a typed scene context that exposes only the game capabilities a scene needs.
- Add lifecycle operations for mounting, ordered composition, replacement/removal,
  and disposal, with deterministic update/draw ordering.
- Define error, cancellation, reentrancy, and teardown semantics explicitly.
- Add a focused documentation page and runnable composition example.

### Tests and evidence

- Unit tests cover mount/unmount, ordering, replacement, setup failure,
  cancellation, callback failure, reentrant mutation policy, and idempotent
  disposal.
- Type tests cover factory/context inference and reject access to unsupported
  internals or use after the declared lifecycle boundary where expressible.
- Browser evidence demonstrates two composed scenes and visible update/draw
  ordering using the real game host. Rendering claims use the WebGPU fixture.
- Coverage is recorded for every modified runtime file.

### Acceptance criteria

- A scene can be created, mounted, updated, drawn, removed, and disposed through
  the public core API with deterministic ordering.
- Scene setup failure does not leave a partially mounted scene or leak owned
  resources; a late setup result cannot revive it.
- Scene mutations and callback failures follow documented, tested semantics and
  preserve the parent game's lifecycle guarantees.
- Multiple game instances have isolated scene composition state.
- The capability spec, exports, tests, type tests, focused documentation, and
  runnable example all trace to the same contract.

### Trace notes to record at checkpoint

`create_game` -> scene host/composer -> scene factory/context -> scene update/draw
callbacks -> scene teardown -> resource/subscription cleanup -> unit/type/browser
tests -> focused docs/example.

## Slice 2: scene asset dependencies

### Outcome

Let a scene declare and acquire typed asset dependencies with explicit ownership,
while reusing the existing per-game asset cache and resource owner.

### Research and analysis questions

- Should dependencies be loaded during scene setup, lazily after mount, or both?
- What is the exact shape of the typed dependency dictionary and how are asset
  keys inferred from the parent manifest?
- Does unmount release handles immediately, or does a scene retain them until an
  explicit scene disposal operation? Align the answer with the ownership goal and
  document it.
- How do shared assets behave when two scenes use the same manifest key?
- How do dependency cancellation, retry, setup failure, and parent-game disposal
  compose with the existing cache behavior?

### Planned feature changes

- Add scene dependency declarations and a scene-owned asset scope built on
  `AssetCache` and `ResourceOwner`.
- Preserve independent handles and final-owner destruction; do not add a second
  cache or bypass renderer leases.
- Integrate dependency cleanup with scene teardown and parent game disposal.
- Add a focused asset-dependency documentation page and example.

### Tests and evidence

- Unit tests cover typed key inference, concurrent scene acquisition, shared
  resource lifetime, unmount/disposal cleanup, failed setup, retry, cancellation,
  and late load completion.
- Type tests reject unknown manifest keys, wrong resource expectations, and
  forged dependency handles.
- The real browser fixture loads one image through two scenes and verifies draw
  success after one scene leaves plus destruction after the final owner leaves.
- Coverage includes scene scope and any modified ownership/cache code.

### Acceptance criteria

- Scene dependencies use the parent game's typed manifest and existing ownership
  semantics without duplicating resource management.
- A scene's failed or cancelled dependency load cannot mount a partial scene or
  leak a late resource.
- Shared assets remain usable by surviving scenes and are destroyed exactly once
  after the final owner releases them.
- Scene teardown behavior is explicit, tested, and documented.
- The capability spec and tests distinguish scene ownership from frame-local draw
  data and parent-game ownership.

### Trace notes to record at checkpoint

`scene dependency declaration` -> `scene asset scope` -> `AssetCache.load` /
`ResourceOwner.acquire/share/release` -> renderer resource lifetime -> scene/game
teardown -> unit/type/WebGPU tests -> docs/example.

## Slice 3: typed signals and scene communication

### Outcome

Provide typed, lifecycle-safe event communication for scenes and their parent
composition without introducing a global event singleton or coupling the core to
Svelte.

### Research and analysis questions

- Should the existing `create_event_dispatcher` become the public event-bus
  primitive, or should a scene-scoped facade wrap it?
- Are events synchronous, ordered, and reentrant? What happens when a listener
  unsubscribes or subscribes during dispatch?
- How are parent, child, and sibling scopes addressed without an implicit global
  route?
- What cleanup occurs on scene unmount, event-bus disposal, and game disposal?
- Are event errors isolated, propagated to the game lifecycle, or reported through
  a typed error hook?

### Planned feature changes

- Add a stable typed-signal capability with payload inference and explicit scene
  subscription ownership.
- Preserve the existing dispatcher as an independent compatibility utility.
- Connect scene teardown to listener cleanup and prevent events from disposed
  scopes from reaching live scenes.
- Add focused docs and a scene communication example.

### Tests and evidence

- Unit tests cover typed emit/subscribe/once/unsubscribe, deterministic listener
  order, mutation during dispatch, error policy, scope routing, and disposal.
- Type tests verify payload inference and reject unknown event names or malformed
  payloads.
- A browser fixture demonstrates communication between composed scenes while
  proving disposed listeners do not receive later events.
- Coverage is recorded for the bus and any changed dispatcher implementation.

### Acceptance criteria

- Scene code can communicate through an explicitly scoped typed bus without a
  global mutable singleton.
- Event payloads and names are inferred from the public event map.
- Subscription cleanup is automatic at the documented lifecycle boundary and
  explicit unsubscription remains safe and idempotent.
- Dispatch ordering, reentrancy, and listener-error behavior are observable,
  documented, and tested.
- Existing dispatcher behavior is either preserved with regression evidence or
  intentionally migrated with updated exports, specs, and callers.

### Trace notes to record at checkpoint

`scene context/event facade` -> `scoped bus` -> listener registration/dispatch ->
scene/game disposal -> unit/type/browser tests -> docs/example.

## Slice 4: scene-owned Svelte UI

### Outcome

Provide a lean `<Game onReady={start_game}>` host. Scenes create, mount, update,
and dispose their own Svelte UI through a contextual `create_ui()` helper while
the core scene runtime remains Svelte-independent.

### Research and analysis questions

- Keep the private DOM UI layer inside `Game`; do not publish `SceneOverlayHost`.
- Expose contextual `SvelteScenes` and `create_ui()` only after game readiness.
- Define full-stack `switch`, UI stack ordering, replacement, cancellation,
  host unmount, and SSR behavior before promotion.

### Planned feature changes

- Add `Game`, `GameReadyContext`, `SvelteScenes`, `create_ui`, and `UiHandle` to
  the Svelte package. Keep `GameHost` and `create_game` as lower-level seams.
- Support `enter()` cleanup callbacks in core, running cleanup before `exit`.
- Make `switch()` transactionally replace the full stack only after its next
  root scene is ready; use `mount()` for intentional stacked UI. Uncaught
  factory, `init`, or `enter` failures follow the game runtime fatal-error path;
  applications catch expected failures inside those callbacks.
- Add focused documentation and a runnable scene-UI example.

### Tests and evidence

- Type tests cover component props, callback inference, scene navigation, and
  rejected missing/wrong props.
- Unit tests cover UI mount/update/idempotent disposal, multiple handles,
  replacement, late calls, `onReady` failure, and host disposal during setup.
- SSR tests prove `Game` imports/renders without browser globals or `onReady`.
- Browser/WebGPU tests cover two isolated games, UI ordering, actions, switch
  teardown, host unmount, and deterministic render readback.

### Acceptance criteria

- Consumers use `<Game onReady={start_game}>` without a separate UI-host API.
- `create_ui(Component, props)` is scene-scoped, strongly typed, and owns its
  mount/update/dispose lifecycle.
- Switch/replacement/unmount dispose UI, scene assets, and subscriptions without
  late updates or mixed stacks.
- Multiple game hosts remain isolated and core modules remain Svelte-free.
- SSR, browser integration, focused docs, and public exports match the same
  documented contract.

### Trace notes to record at checkpoint

`Game` -> `onReady` -> `SvelteScenes` -> scene factory -> `create_ui` -> private
UI layer -> scene/game disposal -> type/unit/SSR/browser tests -> docs/example.

## Slice 5: zero-lint verification baseline

### Outcome

Make `npm run lint` pass with zero warnings and zero errors, without weakening
the first-party quality rules. Treat copied agent/vendor assets as non-product
inputs and preserve strict linting for the package, application, tests, and
verification scripts.

### Tests and evidence

- Classify every current diagnostic as generated/vendor, external-contract, or
  first-party code.
- Add narrow ignores only for copied/generated non-product files.
- Repair first-party diagnostics in coherent modules; retain named, explained
  exceptions only where an external framework contract requires them.
- Run `npm run lint` with zero warnings and errors, followed by the relevant
  type and test suites.

### Acceptance criteria

- `npm run lint` passes with zero warnings and errors.
- All future changes preserve that result; no broad suppression or lowered
  severity hides new diagnostics.
- [Tooling standards](../../tooling-standards.md) documents the expectation and the
  verification workflow.

## Global definition of done

Phase 3-a is complete only when all four capability slices and the verification
baseline slice have:

- an accepted capability spec with implementation status and test references;
- a red-green TDD trail and passing focused tests;
- passing public type tests and relevant browser/WebGPU evidence;
- runtime coverage recorded for statements, branches, functions, and lines;
- focused documentation and runnable examples for visible behavior;
- a `READY` review and independent gap-report `PASS`;
- a versioned checkpoint, local worklog entry, and atomic Conventional Commit;
- no hidden contract blockers or unverified acceptance claims.

The final Phase 3-a review must also verify that the core remains Svelte-free,
Phase 2 behavior remains intact, the four capabilities compose in one example,
and later phases keep separate API designs and acceptance evidence.
