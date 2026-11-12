# Stroke options benchmark report

Date: 2026-11-12

The focused benchmark measures CPU stroke geometry preparation with round caps
and round joins. Each workload runs five samples after the module is loaded;
the report records the median. Static preparation reuses the same subpath;
dynamic preparation changes its offset on each repetition.

Environment: Node `v24.18.0`.

| Segments | Static median (ms) | Dynamic median (ms) |
| ---: | ---: | ---: |
| 10 | 0.040 | 0.046 |
| 100 | 0.181 | 0.188 |
| 1,000 | 0.605 | 0.663 |

This is preparation evidence, not a GPU frame-rate promise. Trusted Chromium
WebGPU pixel fixtures separately verify round endpoint/corner coverage and
screen-unit stability across camera zoom and DPR.
