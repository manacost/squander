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

Current verification:

- [`src/lib/core/runtime/asset_loading.test.ts`](../../src/lib/core/runtime/asset_loading.test.ts)
  covers concurrent sharing, independent release, retry after failure, and
  one-requester cancellation in the `[asset-loading] manifest cache` suite.

The current cache is renderer-independent. Manifest type tests, real image
decode/upload, and final descriptor policy remain unimplemented.

## Notes

AD-005 and AD-013. The current kernel uses manifest keys as cache identity,
shares a pending load within one cache, and aborts the shared operation only
when no requester remains. Runtime uploads have a separate capability.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
