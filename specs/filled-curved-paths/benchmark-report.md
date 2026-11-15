# Filled curved paths benchmark report

Run date: 2026-11-12

The CPU benchmark measures static reuse and dynamic preparation separately. Each
case uses five samples and reports the median. The workload contains a curved
outer subpath and a rectangular hole; it is a preparation signal, not an
absolute rendering budget.

Environment: Node.js v24.18.0 on the repository host.

| Workload scale | Static tessellation (ms) | Dynamic tessellation (ms) |
| -------------: | -----------------------: | ------------------------: |
|             10 |                    0.064 |                     0.096 |
|            100 |                    0.064 |                     0.087 |
|          1,000 |                    0.083 |                     0.114 |

The trusted GPU fixture remains the correctness gate: it verifies a curved
filled region and a transparent even-odd hole with deterministic readback.
Future tessellation optimizations should compare the same static and dynamic
profiles rather than adopting an absolute timing promise.
