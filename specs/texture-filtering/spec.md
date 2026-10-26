# texture-filtering

## Goal

Choose texture sampling appropriate to artwork when enlarging or reducing it.

## Status

Draft. Target: Phase 2.

The direction was agreed in the interview; open contract details are listed below.
This draft does not claim implementation or verification.

## Requirements

- Default to linear filtering and permit nearest filtering per texture.
- Expose independent magnification/minification choices and a shorthand setting both.
- Phase 2 uses the original mip level; document aliasing/shimmer limits under significant downscaling.
- Do not require duplicate texture pixel storage merely to change sampler settings.

## Scenarios

### Pixel sprite and smooth label

A nearest-filtered pixel sprite shares the view with linearly sampled text without changing one another’s settings.

### Different scale policies

A texture uses nearest when enlarged and linear when reduced.

## Acceptance criteria

- Render a known checker texture enlarged and reduced and distinguish the selected sampling modes at documented sample positions.
- Verify shorthand and equivalent explicit settings produce equivalent results.
- Verify sampling choices remain independent across assets and no mipmap support is claimed.

## Usage description

Select filtering in texture asset options; use separate controls only when the magnification and minification policy differ.

## Test references

Current verification:

- [`src/lib/core/runtime/texture_filtering.test.ts`](../../src/lib/core/runtime/texture_filtering.test.ts)
  covers linear defaults, independent magnification/minification values, and
  shorthand precedence in the `[texture-filtering] sampler policy` suite.
- [`verification/webgpu-renderer.spec.ts`](../../verification/webgpu-renderer.spec.ts)
  verifies independent nearest and linear sampling at real GPU pixels in the
  `[texture-filtering]` suite.

Real GPU sampling fixtures and sampler binding are implemented for nearest and
linear magnification/minification without mipmaps; font-atlas filtering remains
unverified.

## Notes

AD-010. The current CPU policy uses `filter`, `magnification`, and
`minification`, defaults to linear, and does not represent mipmaps. GPU sampler
binding and font-atlas filtering remain open. Mipmaps are Phase 4.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
