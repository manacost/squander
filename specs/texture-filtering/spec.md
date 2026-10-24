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

No tests currently verify this replacement-framework contract. Existing legacy
tests are not claimed as coverage. Planned verification (not existing test links):

Real GPU sampling fixtures plus descriptor/default tests.

Use `[texture-filtering]` in relevant suite names and add actual file/suite links as tests land.

## Notes

AD-010. Open: final option names, sampler mutability, and filtering rules for internally generated font atlases. Mipmaps are Phase 4.

See the [decision log](../../specifications/decisions.md) and
[implementation readiness guidance](../../specifications/implementation-readiness.md).
