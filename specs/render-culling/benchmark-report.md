# Render-culling benchmark report

Run date: 2026-11-12

The trusted Chromium WebGPU fixture records CPU visibility work separately from
diagnostic renderer timing. Diagnostic timings include the existing full-surface
readback, so they are comparative evidence rather than an absolute frame-rate
promise.

Environment:

- Browser: Chromium 156.0.8078.4
- OS: macOS (`darwin`)
- Backend/adapter: Apple Metal-3 (the same trusted WebGPU environment used by
  the renderer suite)
- Secure context: true
- `navigator.gpu`, adapter, and device: available
- Workload: 50% visible, 50% definitely offscreen; 800×450 logical fixture;
  nearest 1×1 texture; three samples after one warm-up

| Commands | Visible | Skipped | CPU visibility (ms) | Unculled diagnostic (ms) | Culled diagnostic (ms) |
| -------: | ------: | ------: | ------------------: | -----------------------: | ---------------------: |
|      100 |      50 |      50 |           0.8 / 0.2 |                      3.1 |                    2.0 |
|    1,000 |     500 |     500 |           1.8 / 1.1 |                      5.6 |                    4.0 |
|   10,000 |   5,000 |   5,000 |         13.8 / 12.3 |                     31.6 |                   20.0 |

CPU values are `unculled / culled` benchmark-side visibility reference samples.
The 10,000-command run shows a useful GPU-side reduction in this workload, but
the option remains opt-in because CPU preparation and scene distribution can
change the tradeoff. The benchmark has no universal FPS promise or automatic
promotion threshold.

Correctness evidence is separate: `[render-culling] preserves pixels when
conservative culling is enabled` compares culling on and off and verifies the
visible and edge-touching output.
