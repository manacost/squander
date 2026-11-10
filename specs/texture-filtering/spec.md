# texture-filtering

## Goal

Choose texture sampling appropriate to artwork when enlarging or reducing it.

## Status

Implemented.

## Requirements

- Default to linear filtering and permit nearest filtering per texture.
- Expose independent magnification/minification choices and a shorthand setting both.
- The renderer uses the original mip level; document aliasing/shimmer limits under significant downscaling.
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
- [`tests/webgpu-renderer.spec.ts`](../../tests/webgpu-renderer.spec.ts)
  verifies independent nearest and linear sampling at real GPU pixels in the
  `[texture-filtering]` suite.

Real GPU sampling fixtures and sampler binding are implemented for nearest and
linear magnification/minification without mipmaps. Font preparation coverage
also verifies that filtering options reach every generated atlas/glyph texture.

## Notes

AD-010. The current CPU policy uses `filter`, `magnification`, and
`minification`, defaults to linear, and does not represent mipmaps. Mipmaps
remain a future capability.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
