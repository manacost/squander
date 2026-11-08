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
| Create entities and add positions | 439.77 ms |
| Update query                      | 528.95 ms |
| Remove/add 100,000 positions      | 556.74 ms |
| Read query                        | 494.64 ms |
| Clear world                       | 137.58 ms |

Memory observations from process.memoryUsage():

| Point          | Heap used |      RSS |
| -------------- | --------: | -------: |
| After creation |  158.6 MB | 249.0 MB |
| Before clear   |  638.7 MB | 802.0 MB |
| After clear    |  676.5 MB | 864.3 MB |

The benchmark does not force garbage collection. The post-clear increase is
therefore an observation of the host runtime and benchmark allocation history,
not evidence that clear() retains component data. A future performance slice
should add explicit GC runs where available, compare archetypes and typed
columns, and measure browser runtimes separately.

Fixture: [verification/ecs-benchmark.test.ts](../../verification/ecs-benchmark.test.ts)

## Storage comparison

The comparison fixture uses the same object-shaped set/update/remove/add/read/
clear workload through a small storage interface. It compares the selected
sparse-set column with an object-map column. These numbers are storage-only;
they do not include the ECS query match allocation measured above.

| Strategy   |    Create |   Update | Structural |    Query |   Clear |
| ---------- | --------: | -------: | ---------: | -------: | ------: |
| Sparse set | 232.16 ms | 36.35 ms |   79.19 ms | 15.67 ms | 0.05 ms |
| Object map | 128.44 ms | 49.33 ms |   57.27 ms | 13.69 ms | 0.05 ms |

The object map was faster to populate and structurally replace in this single
Node run, while the sparse set updated existing values faster. The sparse set
also keeps packed entity/value arrays and remains the selected implementation
because it provides a denser path for component membership and a clear seam for
future archetype or typed-column work. No final performance budget is claimed
until browser and workload-specific measurements exist.

Comparison fixture: [verification/ecs-storage-comparison.test.ts](../../verification/ecs-storage-comparison.test.ts)
