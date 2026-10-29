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
| `asset-loading` | Yes | Complete: Core → asset loading | Complete: Demos → playground | Complete | Complete | Complete | Guide added; focused GPU proof remains linked from the guide |
| `dynamic-assets` | Yes | Complete: Core → dynamic assets | Complete: Demos → playground | Complete | Complete | Complete | Guide added; focused GPU proof remains linked from the guide |
| `sprite-drawing` | Yes | Complete: Core → sprites | Complete: Demos → playground | Complete | Complete | Complete | Guide added; focused GPU proof remains linked from the guide |
| `shape-drawing` | Yes | Complete: Core → shapes | Complete: Demos → playground | Complete | Complete | Complete | Guide added; focused GPU proof remains linked from the guide |
| `paths-and-polygons` | Yes | Complete: Core → paths & polygons | Complete: Demos → playground | Complete | Complete | Complete | Guide added; focused GPU proof remains linked from the guide |
| `camera-2d` | Yes | Complete: Core → camera 2D | Complete: Demos → playground | Complete | Complete | Complete | Guide added; focused GPU proof remains linked from the guide |
| `viewport-sizing` | Yes | Complete: Core → viewport sizing | Complete: Demos → playground | Complete | Complete | Complete | Guide added; focused GPU proof remains linked from the guide |
| `texture-filtering` | Yes | Complete: Core → texture filtering | Complete: Demos → playground | Complete | Complete | Complete | Guide added; focused GPU proof remains linked from the guide |
| `game-lifecycle` | Yes | Complete: Core → game lifecycle | Complete: Demos → playground | Complete | Complete | Complete | Guide added; lifecycle controls remain in the playground |
| `game-timing` | Yes | Complete: Core → game timing | Complete: Demos → playground | Complete | Complete | Complete | Guide added; tick/FPS proof remains in the playground |
| `webgpu-runtime` | Yes | Complete: Core → WebGPU runtime | Complete: Demos → playground | Complete | Complete | Complete | Guide added; focused GPU proof remains linked from the guide |
| `resource-ownership` | Yes for resource APIs | Complete: Core → resource ownership | Complete: Demos → playground | Complete | Complete | Complete | Guide added with release examples and ownership proof references |
| `svelte-bridge` | Yes, as an adapter guide | Complete: Core → Svelte bridge and Demos → svelte | Complete: Demos → svelte | Complete | Complete | Complete | Guide added; the primary demo shows one host and advanced multi-host isolation remains in adapter tests |
| `feature-documentation` | No; this is the audit contract | Core documentation index | N/A | Complete in `AGENTS.md` and this audit | N/A | N/A | Remains Draft until the required guide inventory is complete |
| `specs` | No; governance metadata | N/A | N/A | N/A | N/A | N/A | Not a runtime feature |

## Remaining evidence follow-up

1. Keep the shared guide registry and sidebar inventory synchronized; the
   inventory browser test covers every generated Core route.
2. Add dedicated per-capability live proof pages only when the shared playground
   no longer gives readers a sufficiently focused demonstration.
3. Update each capability spec's test references and checkpoint as focused GPU
   proof links are added; the guides already link the current proof boundary.

The text page is the accepted template for the remaining guides. The current
Phase 2 promotion status is unaffected by missing documentation pages; those
pages are the next feature-documentation completion gate.
