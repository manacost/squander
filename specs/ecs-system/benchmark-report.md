# ECS million-entity benchmark

## Result

The initial object-first sparse-set implementation completed a one-million
entity workload on the repository host. This is evidence that the current
layout can run the workload in Node; it is not a performance budget or a
browser/WebGPU result.

Command:

    npm run test:benchmark:ecs

Host runtime:

- Node.js v24.18.0
- Vitest v5.0.5
- One component: { x: number; y: number }
- One million entities
- One hundred thousand remove/add structural changes
- One full update query and one full read query

Recorded output:

| Workload                          |      Time |
| --------------------------------- | --------: |
| Create entities and add positions | 383.64 ms |
| Update query                      | 485.24 ms |
| Remove/add 100,000 positions      | 637.65 ms |
| Read query                        | 468.02 ms |
| Clear world                       | 138.60 ms |

Memory observations from process.memoryUsage():

| Point          | Heap used |      RSS |
| -------------- | --------: | -------: |
| After creation |  158.4 MB | 248.5 MB |
| Before clear   |  664.1 MB | 802.9 MB |
| After clear    |  701.9 MB | 866.7 MB |

The benchmark does not force garbage collection. The post-clear increase is
therefore an observation of the host runtime and benchmark allocation history,
not evidence that clear() retains component data. A future performance slice
should add explicit GC runs where available, compare archetypes and typed
columns, and measure browser runtimes separately.

Fixture: [verification/ecs-benchmark.test.ts](../../verification/ecs-benchmark.test.ts)
