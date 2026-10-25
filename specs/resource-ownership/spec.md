# resource-ownership

## Goal

Keep shared GPU assets alive exactly while owners retain them, with predictable misuse detection.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Separate frame-local drawing from persistent resource creation/loading. Draw APIs return no disposable resource; existing resources retain their own lifetime (AD-037).
- Document ownership and required release for every resource-returning create/load API, including owner/game cleanup and release examples. Pure value helpers require no release.
- Prepared paths/polygons belong to their creating game, permit early explicit release, and are cleaned up on game disposal. Reject released-handle updates and cross-game use; favor single-game ergonomics (AD-039).
- Track explicit ownership independently of arbitrary JavaScript references.
- Game ownership can outlive future scenes. After the final owner releases a resource, reclaim its underlying storage when prior accepted draws can safely finish (AD-038).
- Releasing a handle immediately invalidates it for new draws, even if another owner keeps the resource alive. Repeated release is harmless.
- Previously accepted draw commands retain valid underlying resources, including commands buffered before GPU submission. The renderer manages safe destruction/reuse; applications need not wait for GPU completion (AD-038).
- Using a released handle for drawing throws a descriptive error identifying the asset/handle; callback errors follow lifecycle policy.
- Use opaque typed handles to reduce misuse, while retaining runtime checks because TypeScript cannot invalidate aliases.
- Future scene ownership retains assets until explicit release or scene disposal, not unmount. Scene automation is outside Phase 2.

## Scenarios

### Repeated circle drawing

An application changes a circle-data object and draws it each frame. Each call
captures its current values without creating a persistent circle handle or a new
texture. Later object mutations cannot retroactively change submitted values.

### Shared texture

Owners A and B share a texture. Releasing A invalidates A’s handle, but B can still draw. Releasing B allows resource destruction.

### Release after drawing

A draw command is accepted, then the application releases the resource before
renderer submission or GPU completion. The earlier draw remains valid. A new draw
through that released handle throws, while underlying storage is retained until
its prior use is safe.

### Stale alias

A developer retains another variable pointing to A’s released handle. Drawing through it fails rather than silently accessing live shared storage.

## Acceptance criteria

- Verify repeated basic shape draws expose no disposable handle or per-call texture creation, and mutations after submission do not change captured draw values.
- Acquire twice, release once, and render through the surviving handle; release the second and verify underlying destruction exactly once.
- Exercise draw-then-release before GPU submission and while work is in flight: verify earlier commands render without released-resource errors, new draws fail, and storage is not destroyed or reused prematurely.
- Attempt drawing through a released alias and assert an asset-identifying error; double release has no extra effect.
- Disposing an owner releases its remaining acquisitions without invalidating another live owner.
- Verify game disposal cleans up remaining prepared geometry, foreign-game drawing/updating fails, and independent geometry handles can be created from the same source data.
- Type tests reject forged ordinary objects and wrong asset kinds; tests do not claim compile-time proof of lifetime safety.

## Usage description

Acquire resources through an owner and release each acquired handle or dispose its owner. Keep long-lived shared assets under game ownership.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Ownership and stale-handle unit tests; one real shared-resource rendering fixture; type misuse tests.

Use `[resource-ownership]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-004, AD-013, and AD-037 through AD-039. Open: exact release/scope API, internal completion/reclamation strategy, whether standalone custom scopes ship initially.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
