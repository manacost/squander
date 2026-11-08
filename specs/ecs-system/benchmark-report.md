# ECS performance evidence

## Result

The object-first sparse-set implementation completes the shared workload for
one million entities in Node and 100,000 entities in Chromium. The benchmark
measures both supported identity policies, dense and sparse queries, structural
churn, snapshot import/export, and teardown.

Commands:

    npm run test:benchmark:ecs
    npm run test:benchmark:ecs:guard
    npm run test:benchmark:ecs:browser:guard

The regular benchmark records advisory regressions. The `:guard` commands set
`ECS_BENCHMARK_ENFORCE=1` and fail when a matching environment profile exceeds
20% timing or 15% retained-heap regression. Unmatched environments record new
evidence without comparing it to unrelated hardware.

## Node profile

Environment:

- Node.js v24.18.0
- Vitest v5.0.5
- macOS arm64
- One million entities
- 100,000 structural remove/add operations
- 100,000 snapshot entities
- Three measured repetitions after a small warm-up
- Explicit garbage collection at memory observation boundaries

The recorded profile is `darwin-arm64-v24.18.0`.

| Policy       |     Create | Dense update | Sparse query | Structural |  Snapshot |     Clear |
| ------------ | ---------: | -----------: | -----------: | ---------: | --------: | --------: |
| Monotonic    |  506.50 ms |    408.70 ms |     64.01 ms |   99.00 ms | 173.29 ms | 229.88 ms |
| Generational | 1114.15 ms |    564.92 ms |     88.60 ms |  177.27 ms | 220.49 ms | 526.76 ms |

Generational handles cost more in this workload because slot and generation
state is maintained in addition to component storage. The policy is opt-in so
applications can choose stale-handle protection and slot reuse only when they
need it.

| Policy       | Heap after creation | Peak heap before clear | Retained heap after clear |
| ------------ | ------------------: | ---------------------: | ------------------------: |
| Monotonic    |            248.7 MB |               297.8 MB |                  371.6 MB |
| Generational |            705.5 MB |               861.2 MB |                  285.3 MB |

Heap and RSS values are observations from the host allocator. The guard uses
retained heap after all benchmark worlds are cleared, while peak and RSS remain
reported for investigation.

## Browser profile

Environment:

- Chromium 156.0.8078.4
- Trusted local origin: `http://127.0.0.1:4174`
- Secure context: true
- DPR: 1
- Viewport: 1280 × 720
- 100,000 entities
- 10,000 structural remove/add operations
- 10,000 snapshot entities
- Five measured repetitions after a small warm-up

The recorded profile is `darwin-chromium-156.0.8078.4`.

| Policy       |   Create | Dense update | Sparse query | Structural | Snapshot |    Clear |
| ------------ | -------: | -----------: | -----------: | ---------: | -------: | -------: |
| Monotonic    | 21.20 ms |     19.10 ms |      2.90 ms |    4.10 ms | 19.50 ms | 12.80 ms |
| Generational | 36.90 ms |     23.70 ms |      3.00 ms |    3.50 ms | 21.20 ms | 19.00 ms |

Browser memory is reported as unavailable because the benchmark does not use a
non-standard heap API. The fixture asserts `window.isSecureContext` and records
browser, OS, DPR, viewport, and workload details. It does not require WebGPU;
the ECS benchmark exercises CPU behavior only.

## Storage decision

The selected backend remains dense sparse-set storage behind the object-first
component API. The storage comparison fixture remains useful as historical
context, but its one-component map comparison is not a promotion budget. No
archetype or typed-column backend is added until a representative workload
demonstrates a need.

Fixtures:

- [verification/ecs-benchmark.test.ts](../../verification/ecs-benchmark.test.ts)
- [verification/ecs-benchmark-workload.ts](../../verification/ecs-benchmark-workload.ts)
- [tests/ecs-browser.spec.ts](../../tests/ecs-browser.spec.ts)
- [verification/ecs-storage-comparison.test.ts](../../verification/ecs-storage-comparison.test.ts)
