# Jumping rope with Wails and Squander

This is a one-page desktop game built from Squander's documented SvelteKit path and embedded by Wails 3. It uses the published `squander` package, not repository source imports.

## Toolchain

- Wails 3.0.0
- Go 1.26 or newer
- Node.js 22.17 or newer
- SvelteKit, Svelte, and Squander at their latest versions resolved in `frontend/package-lock.json`

## Run the frontend

```sh
cd frontend
npm run check
npm run lint
npm test
npm run build
```

The build writes the static SvelteKit output to `frontend/dist`, which matches Wails' embedded asset contract.

## Run the desktop app

From this directory, use the Wails CLI:

```sh
wails3 dev
wails3 build
```

Wails owns the desktop shell. Squander owns the WebGPU renderer, game loop, input routing, and game lifetime. Svelte owns the HUD and controls.

The game supports keyboard, pointer, and button input. Start a run, then press Space as the marker enters the gold timing window. An exact center hit scores +6, a jump within 1% of center scores +3, and any other jump scores +1. The two-percent target shifts every three jumps, and the rail speeds up every three attempts. Missing an entire rope cycle ends the run.
