# resource-ownership

## Goal

Keep shared GPU assets alive exactly while owners retain them, with predictable misuse detection.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Track explicit ownership independently of arbitrary JavaScript references.
- Game ownership can outlive future scenes. Release the underlying resource after its final owner releases it.
- Releasing a handle invalidates that handle even if another owner keeps the resource alive. Repeated release is harmless.
- Using a released handle for drawing throws a descriptive error identifying the asset/handle; callback errors follow lifecycle policy.
- Use opaque typed handles to reduce misuse, while retaining runtime checks because TypeScript cannot invalidate aliases.
- Future scene ownership retains assets until explicit release or scene disposal, not unmount. Scene automation is outside Phase 2.

## Scenarios

### Shared texture

Owners A and B share a texture. Releasing A invalidates A’s handle, but B can still draw. Releasing B allows resource destruction.

### Stale alias

A developer retains another variable pointing to A’s released handle. Drawing through it fails rather than silently accessing live shared storage.

## Acceptance criteria

- Acquire twice, release once, and render through the surviving handle; release the second and verify underlying destruction exactly once.
- Attempt drawing through a released alias and assert an asset-identifying error; double release has no extra effect.
- Disposing an owner releases its remaining acquisitions without invalidating another live owner.
- Type tests reject forged ordinary objects and wrong asset kinds; tests do not claim compile-time proof of lifetime safety.

## Usage description

Acquire resources through an owner and release each acquired handle or dispose its owner. Keep long-lived shared assets under game ownership.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Ownership and stale-handle unit tests; one real shared-resource rendering fixture; type misuse tests.

Use `[resource-ownership]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-004 and AD-013. Open: exact release/scope API, destruction timing relative to submitted GPU work, and whether standalone custom scopes ship initially.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
