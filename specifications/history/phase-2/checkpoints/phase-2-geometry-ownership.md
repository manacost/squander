# Phase 2 geometry ownership checkpoint

Status: **Game-scoped geometry ownership and disposal invalidation verified; paths-and-polygons remains Draft**.

## Pre-slice contract checkpoint

- Each game receives a distinct `GeometryOwner` through setup and on the game
  instance.
- Geometry handles snapshot vertices and indices, preserve handle identity on
  update, reject foreign-owner access, and reject released handles.
- Game disposal invalidates all geometry handles; repeated disposal and release
  are safe.
- Prepared geometry must contain finite vertices and indexed triangles.

## Implemented slice

- Added opaque game-scoped geometry handles with read/update/release operations.
- Added caller-array snapshots and indexed-triangle validation.
- Added geometry owner creation/disposal to game setup and game disposal.

## Evidence

- `npm run test:unit`: passed, 24 files and 75 tests.
- `npm run check`: passed with zero diagnostics.
- `npm run test:type`: passed.
- Focused ESLint, Prettier, and `git diff --check`: passed.

## Code trace

`game.test.ts`/`geometry_ownership.test.ts` → `create_game()` → setup
`GeometryOwner` → `owner.create()` snapshot → handle read/update/release → game
dispose → owner invalidation. Foreign owners and stale handles fail at the
handle boundary.

## Known gaps and gate

- Renderer commands still accept prepared values directly rather than game
  handles; public path/polygon factories and package exports remain deferred.
- GPU resource reclamation for geometry buffers is not yet connected to handle
  lifetime.
- Go/no-go: **continue with handle-to-renderer lifecycle wiring; do not promote
  `paths-and-polygons`.**
