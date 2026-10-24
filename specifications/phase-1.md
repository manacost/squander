# Phase 1: Specifications and architecture prework

## Purpose and status

Establish a lightweight specification system before implementing the replacement
framework. Planning is in progress; the spec template, spec-system capability,
decision log, and validation skill exist, and an initial set of framework capability drafts now exist. Remaining contract
details are tracked explicitly; Phase 1 is not declared complete.

## Agreed scope

- Maintain an [architecture decision log](decisions.md) with accepted choices,
  rationale, boundaries, and clearly marked unresolved details.
- Describe each capability at `specs/{capability}/spec.md`. Its directory name
  is its stable ID.
- Base capability specs on [the template](../specs/spec_template.md), with goal,
  status, requirements, scenarios, acceptance criteria, usage description,
  test references, and notes.
- Scope capabilities around coherent, user-visible behavior. Prefer readable
  prose and lists, with representative scenarios rather than exhaustive edge cases.
- Use Draft, Accepted, Implemented, and Deprecated statuses. Keep phase targeting
  separate from lifecycle status.
- Connect specs and tests through `[capability-name]` suite tags and links to
  the relevant test files and suites. Explicitly identify tests that do not exist yet.
- Provide [spec-validate](../.agents/skills/spec-validate/SKILL.md) for on-demand
  structure and traceability review. It reports findings without automatic edits.
- Keep future capability candidates visible in the phase candidate logs.
- Write specs so they can later inform generated high-level system documentation.

The [spec-system capability](../specs/specs/spec.md) is the authoritative contract
for specification structure and validation conventions.

## Outside this phase

- Replacing the renderer or implementing framework features.
- Building a documentation generator.
- Adding an automated spec-validation CI gate.
- Treating a matching test tag as proof of sufficient tests or coverage.

## Remaining planning work

- Finish the lifecycle, resource, rendering, and Svelte integration contracts.
- Implement the agreed coverage measurement in the future verification setup and
  select the GPU/browser environment and type-test tooling.
- Refine the [capability drafts](../specs/README.md) using the
  [readiness guidance](implementation-readiness.md), without inventing test references.
- Review those specs using `/spec-validate` and resolve material ambiguities
  before treating the affected capabilities as ready for implementation.

These are planning deliverables, not a claim that Phase 1 is already complete.
The broader objectives are recorded in [goals](goals.md); implementation scope is
recorded in [Phase 2](phase-2.md).
