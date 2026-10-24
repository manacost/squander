# asset-loading

## Goal

Load declared assets with checked keys and inferred resource types while sharing concurrent work.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Declare assets in an explicit TypeScript manifest independent of any specific bundler.
- Infer loaded handle types from the definition; reject unknown manifest keys at compile time.
- Concurrent acquisitions of the same asset within a game share fetch/decode/upload work while retaining independent ownership.
- Reject a failed load with a typed error and remove the failed pending attempt so callers can explicitly retry. No automatic placeholder or retry.
- A handled post-start load failure leaves the game running. Errors propagated from required setup follow initialization failure policy.

## Scenarios

### Two consumers

Two consumers request the same declared texture before it completes. Both acquire ownership while the underlying work happens once.

### Retry after failure

A load fails, the application displays feedback, and a later explicit attempt succeeds without returning the old rejection.

## Acceptance criteria

- Compile positive examples and expected-error cases for unknown keys and wrong asset kinds without weakening types with any or assertions.
- Use a controlled loader to request an asset concurrently: verify one underlying operation and two independently releasable handles.
- Reject the first request, then succeed on retry; verify failure did not remain cached and the running game continues.
- Run a real image-decode/upload fixture in the browser in addition to loader fakes.

## Usage description

Illustrative: declare hero: texture(url), then await game.assets.load("hero"). Manifest keys are checked; network responses still need runtime validation.

## Test references

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Type tests; controlled concurrent-load/failure tests; browser decode/upload test.

Use `[asset-loading]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-005 and AD-013. Open: manifest descriptors, cache identity, cancellation of one shared requester, and error details. Runtime uploads have a separate capability.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
