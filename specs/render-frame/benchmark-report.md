# Target-switch frame benchmark

Date: 2026-11-13

This trusted-origin Chromium WebGPU benchmark records eight small rectangle
draws per production frame, split across canvas and one offscreen target. It
uses five warm-up frames and 15 measured frames per case. Before the change,
each target group created a command encoder and called `queue.submit`.

Environment: Chromium 156.0.8078.4, macOS host, Apple Metal-3, DPR 1, viewport
1280×720, 64×64 canvas and target.

| Target switches | Command buffers per frame | Median frame time before (ms) |
| --------------: | ------------------------: | ----------------------------: |
|               0 |                         1 |                           0.5 |
|               1 |                         2 |                           0.8 |
|               3 |                         4 |                           1.9 |
|               7 |                         8 |                           3.9 |

After the shared-encoder change, the same fixture records:

| Target switches | Command buffers per frame | Render passes per frame | Median frame time after (ms) |
| --------------: | ------------------------: | ----------------------: | ---------------------------: |
|               0 |                         1 |                       1 |                          0.7 |
|               1 |                         1 |                       2 |                          0.7 |
|               3 |                         1 |                       4 |                          0.9 |
|               7 |                         1 |                       8 |                          1.0 |

The pre-change profile showed a clear cost as queue submissions increased. The
post-change profile held one command buffer per frame and reduced the
seven-switch workload from 3.9 ms to 1.0 ms. The one-command-buffer structural
gate is met. Timings are environment-specific and do not justify an absolute
latency threshold; continue tracking target-switch timing as a relative
benchmark.
