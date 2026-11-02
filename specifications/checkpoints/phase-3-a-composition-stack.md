# Phase 3-a composition stack checkpoint

Status: implementation complete; CPU/package/browser verification complete; independent audit passed.

## Trace

`create_game()` -> `Game.scenes` -> scene factory/context -> required asset
scope and scene subscriptions -> ordered update/draw -> queued structural
mutation -> scene teardown -> game resource disposal.

The implementation preserves game-owned `AssetCache`, `ResourceOwner`, and
programmer-owned `Signal<T>` instances. Scene removal disposes the scene and
releases scene-owned handles/subscriptions. Core remains Svelte-independent;
the Svelte package supplies the `<Game onReady>` host and contextual `create_ui`.

## Evidence so far

- `npm run check` passed.
- Focused scene, signal, adapter, and SSR unit suites passed (29 tests).
- `npm run test:type` passed.
- `npm run validate:specs` passed.
- `npx eslint .` passed with zero errors and zero warnings.
- `npm run test:unit` passed: 30 files, 159 tests.
- Runtime coverage passed: statements 97.11%, branches 95.38%, functions
  98.70%, lines 98.09%; `npm run check:coverage` passed for 23 files.
- `npm run package` passed with an isolated writable npm cache; Publint reported
  `All good!`.
- Slice 3 first implementation slice now exposes a game-owned typed
  `SceneEventBus` through `game.scenes.events` and `SceneFactoryContext.events`.
  It has stable snapshot ordering, `once`, targeted `off`, listener error
  routing, disposal clearing, public type misuse tests, focused unit tests, a
  capability spec, and scene documentation.
- After the Slice 3 addition, runtime coverage remains above the gate:
  statements 97.02%, branches 95.34%, functions 97.52%, lines 98.08%.
- Latest gap-closure iteration adds focused scene evidence for shared asset
  handles surviving one scene's removal, exact-once final destruction,
  dependency retry, and idempotent disposed scopes. It also removes the unused
  `SceneDefinition.overlay` field, exposes the event bus in `GameReadyContext`,
  and documents a composed assets/events/UI path.
- Final gap-fix iteration corrects same-dispatch listener removal, threads
  `EventMap` through Svelte host contracts, upgrades the live scene demo to use
  a shared manifest dependency and event bus, and adds focused
  `webgpu-scene-assets.spec.ts` and `webgpu-scene-signals.spec.ts` fixtures.
  The full non-browser verification matrix passes with 169 unit tests.
- FAIL-resolution iteration adds automatic scene event listener cleanup, tests
  targeted and once-scoped cleanup, upgrades the scene fixture to decode and
  draw a real 1x1 PNG texture, and proves removed versus surviving listeners
  with explicit browser counters. It also adds Svelte EventMap type assertions
  and explicit capability-spec fixture references. Runtime coverage is
  96.92/95.27/97.87/97.88, and the coverage gate passes.
- Browser verification rerun with local server binding enabled: `npm run
  test:webgpu` passed 47/47 tests, including scene asset upload/draw and scene
  signal cleanup; `npm run test:integration` passed 7/7 tests. The browser used
  the configured trusted origins and explicit WebGPU/GPU launch flags.

## Limitations

The independent review and gap report passed. The worktree contains substantial
unrelated pre-existing changes; no destructive cleanup or broad staging was
performed.
