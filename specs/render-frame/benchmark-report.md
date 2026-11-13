# Target-switch frame benchmark

Date: 2026-11-13

This trusted-origin Chromium WebGPU benchmark records eight small rectangle
draws per production frame, split across canvas and one offscreen target. It
uses five warm-up frames and 15 measured frames per case. Each target group
currently creates a command encoder and calls `queue.submit`; the command-buffer
count is therefore the group count.

Environment: Chromium 156.0.8078.4, macOS host, Apple Metal-3, DPR 1, viewport
1280×720, 64×64 canvas and target.

| Target switches | Command buffers per frame | Median frame time (ms) |
| --------------: | ------------------------: | ---------------------: |
|               0 |                         1 |                    0.5 |
|               1 |                         2 |                    0.8 |
|               3 |                         4 |                    1.9 |
|               7 |                         8 |                    3.9 |

The small workload shows a clear cost as groups and queue submissions increase.
These measurements are environment-specific and do not justify an absolute
latency threshold. Keep one command-buffer submission per logical production
frame as a structural performance gate; permit multiple render passes for
canvas/target changes within that encoder. Continue tracking target-switch
timing as a relative benchmark. A separate encoder per target group is a
measurable regression in this profile.
