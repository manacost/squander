# Effective implementation and verification

This is working guidance for Phase 2 implementation slices. The accepted product
requirements live in capability specs and the decision log. These practices help
produce useful evidence; they do not add a spec-validation CI gate or mandate a
particular test library or strict test-first workflow.

## Before starting a slice

- Name the capability and the smallest user-visible outcome being delivered.
- Read its requirements, scenarios, dependencies, and open questions. Resolve
  ambiguities that affect this slice's behavior before encoding them in tests.
  Unrelated deferred decisions need not block independent work.
- Sketch one realistic consumer example. Check whether it preserves inference,
  ownership, and composition without casts or exposure of GPU internals.
- Write observable acceptance criteria and identify the evidence for each.
- Identify failure/lifecycle paths that can invalidate the outcome, especially
  disposal races, errors, and resource sharing. Choose representative cases.
- Inspect existing code and tests before designing replacements. Record baseline
  failures separately; legacy passing tests do not verify the replacement API.
- Select the relevant focused demo and test layers before writing implementation.

## Writing acceptance criteria

Use a concrete setup, action, and observable result, with a tolerance or timing
boundary where needed. Criteria should allow different correct implementations.

- Weak: “Asset loading works and is well tested.”
- Useful: “Two concurrent acquisitions share one upload; releasing the first
  invalidates its handle while the second still renders the expected image.”
- Weak: “The renderer uses the batch helper.”
- Useful: “Overlapping sprite, shape, and text output follows submission order
  even when batching combines compatible draws.”
- Weak: “The viewport is responsive.”
- Useful: “A 1280 × 720 fixed view in a 1000 × 1000 CSS container produces a
  centered 1000 × 562.5 viewport; physical rounding follows the documented rule.”

Requirements define the contract; scenarios illustrate important situations;
acceptance criteria define proof. Avoid copying the same paragraph into all three.
Do not turn incidental implementation details into externally promised behavior.

## Choosing tests that can detect a regression

- Test public outcomes or meaningful resource invariants. A test should fail if
  its named requirement is broken, not merely because a helper was renamed.
- Derive expected values independently: hand-calculated transform points, known
  inside/outside geometry points, or deliberately distinct texture colors.
  Avoid duplicating the implementation algorithm to calculate expectations.
- Use controlled clocks and deferred promises for timing and cancellation races;
  avoid sleeps as synchronization. Include late completion after disposal.
- Mock the network or GPU where needed for deterministic failure/ownership tests,
  but verify decode, upload, shader execution, and compositing in a real WebGPU context.
- For type tests, include valid inferred use and expected compilation failures.
  Assert return/value types as well as inputs. Avoid any or assertions that bypass
  the contract under test. Expected-error directives must fail when no error occurs.
- For Svelte, assert rendered updates, command effects, subscription cleanup, and
  host isolation. Check SSR separately from browser mounting.
- When a test's value is unclear, inspect whether a plausible broken version would
  still pass; selectively introduce a temporary defect to verify it if useful,
  then restore the code. A full mutation-testing system is not required.

## Rendering evidence

- Pin and record browser version, OS, GPU adapter/backend, device pixel ratio,
  font fixture, and viewport for reproducible results. Distinguish hardware GPU
  runs from software WebGPU adapters; neither is a universal compatibility claim.
- Choose small fixtures with known output. Use exact interior pixel assertions
  where stable and justified tolerances for edges, blending, and rasterized fonts.
  Define tolerances before accepting a changed result, not to make a failure pass.
- Inspect screenshots when behavior changes. Update approved reference images
  only after understanding the visual difference; snapshots alone are not proof.
- Missing WebGPU support is a reported verification gap, not a successful render
  check. The required rendering verification must actually execute somewhere in
  the supported environment before marking a capability Implemented.
- Use behavior instrumentation to verify glyph reuse/resource lifetimes alongside
  pixel tests; a screenshot cannot detect every leak or redundant upload.

## Coverage and traceability

- Each of statements, branches, functions, and lines must exceed 90% across
  framework runtime code, including renderer CPU logic and Svelte integration.
- Include runtime files even if unimported by tests. Exclude demos, generated
  files, and type-only declarations; do not exclude hard-to-test runtime paths
  simply to reach the threshold. Report component gaps as well as the aggregate.
- Select coverage instrumentation and report-merging rules before implementation
  relies on combined unit/browser results. WGSL correctness needs separate
  rendering evidence; do not disguise shader files as covered TypeScript.
- Add `[capability-name]` to relevant real suite names. Link the file and suite
  from the spec and explain the behavior checked. A tag is navigation, not proof.
- Run `/spec-validate` on changed capability contracts and mappings. Spec
  validation remains an on-demand skill, separate from normal code test tooling.

## Completing a slice

- Run the focused tests, type checks, and relevant browser/rendering checks; add
  package validation when public exports change. Broaden checks when evidence
  warrants it, not by repeatedly running already-passing unrelated suites.
- Deliver a focused documentation demo with usage and limits. The final playground
  demonstrates composition and does not replace feature-specific acceptance.
- Record actual commands/results and relevant environment. Keep missing checks,
  pre-existing failures, and remaining requirements visible.
- Promote to Implemented only when the whole capability's acceptance criteria are
  satisfied with evidence. A partial slice or a high coverage number is insufficient.
