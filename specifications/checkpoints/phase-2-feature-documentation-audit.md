# Phase 2 feature/documentation crossover audit

Date: 2026-10-28

This audit applies the repository rule in `AGENTS.md`: a feature with visually
observable behavior or a real rendering/evidence fixture needs a sidebar link,
a live example, an explanation, public type information, and copyable code
samples. A composition playground is supplementary and does not satisfy the
focused-page requirement by itself.

## Site structure decision

- `Core` is for framework-independent API guides: types, ownership, usage, and
  focused rendering proofs.
- `Demos` is for live composition and adapter experiences: the playground and
  Svelte host example.
- The former `/docs/examples` evidence index was removed because it repeated
  repository-oriented checkpoint information without helping readers choose a
  feature or run a focused example.

| Capability | Crossover required? | Sidebar | Live example | Explanation | Type info | Code samples | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `text-drawing` | Yes | Complete: Core → text | Complete: `/docs/examples/text` | Complete | Complete | Complete | Promoted; use as the reference implementation |
| `asset-loading` | Yes | Missing focused page | Partial: playground/focused GPU fixtures | Partial | Partial | Missing | Create Core asset-loading guide |
| `dynamic-assets` | Yes | Missing focused page | Partial: playground failure flow and GPU fixtures | Partial | Partial | Missing | Create Core dynamic-assets guide |
| `sprite-drawing` | Yes | Missing focused page | Partial: playground and GPU gallery | Partial | Partial | Missing | Create Core sprite guide |
| `shape-drawing` | Yes | Missing focused page | Partial: playground and GPU fixtures | Partial | Partial | Missing | Create Core shapes guide |
| `paths-and-polygons` | Yes | Missing focused page | Partial: playground and GPU fixtures | Partial | Partial | Missing | Create Core geometry guide |
| `camera-2d` | Yes | Missing focused page | Partial: playground and GPU fixtures | Partial | Partial | Missing | Create Core camera guide |
| `viewport-sizing` | Yes | Missing focused page | Partial: playground and GPU fixtures | Partial | Partial | Missing | Create Core viewport guide |
| `texture-filtering` | Yes | Missing focused page | Partial: playground/fixtures | Partial | Partial | Missing | Create Core filtering guide |
| `game-lifecycle` | Yes | Missing focused page | Partial: playground controls | Partial | Partial | Missing | Create Core lifecycle guide |
| `game-timing` | Yes | Missing focused page | Partial: playground tick/FPS display | Partial | Partial | Missing | Create Core timing guide |
| `webgpu-runtime` | Yes | Missing focused page | Partial: playground and renderer gallery | Partial | Partial | Missing | Create Core WebGPU runtime guide |
| `resource-ownership` | Yes for resource APIs | Missing focused page | Partial: release/readback fixtures | Partial | Partial | Missing | Create Core ownership guide with release examples |
| `svelte-bridge` | Yes, as an adapter guide | Partial: Demos → svelte | Complete: `/docs/examples/svelte` | Partial | Partial | Partial | Add a focused adapter guide |
| `feature-documentation` | No; this is the audit contract | Core documentation index | N/A | Complete in `AGENTS.md` and this audit | N/A | N/A | Remains Draft until the required guide inventory is complete |
| `specs` | No; governance metadata | N/A | N/A | N/A | N/A | N/A | Not a runtime feature |

## Required follow-up slices

1. Add focused Core pages for asset loading, dynamic assets, sprites, shapes,
   paths/polygons, cameras, viewport sizing, filtering, lifecycle, timing,
   WebGPU runtime, and ownership.
2. Add the Svelte guide to the sidebar, preserving its adapter-specific
   placement while linking the existing live example.
3. Add one normal browser documentation test per page and one real WebGPU
   proof test for pages whose claim depends on rendering.
4. Update each capability spec's test references and checkpoint when its five
   crossover parts are complete.

The text page is the accepted template for the remaining guides. The current
Phase 2 promotion status is unaffected by missing documentation pages; those
pages are the next feature-documentation completion gate.
