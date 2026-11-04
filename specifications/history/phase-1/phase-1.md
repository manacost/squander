# Phase 1: Specifications and architecture prework

> Historical plan. For current behavior, read `specs/README.md` and the
> relevant capability specification.

## Purpose and status

Establish a lightweight specification system before implementing the replacement
framework. The specification system, decision log, validation skill, capability
drafts, and verification-readiness evidence are established. Capability
implementation and behavioral verification remain Phase 2 work; Phase 1 does
not promote a draft to Implemented.

## Agreed scope

- Maintain an [architecture decision log](../../decisions.md) with accepted choices,
  rationale, boundaries, and clearly marked unresolved details.
- Describe each capability at `specs/{capability}/spec.md`. Its directory name
  is its stable ID.
- Base capability specs on [the template](../../../specs/spec_template.md), with goal,
  status, requirements, scenarios, acceptance criteria, usage description,
  test references, and notes.
- Scope capabilities around coherent, user-visible behavior. Prefer readable
  prose and lists, with representative scenarios rather than exhaustive edge cases.
- Use Draft, Accepted, Implemented, and Deprecated statuses. Keep phase targeting
  separate from lifecycle status.
- Connect specs and tests through `[capability-name]` suite tags and links to
  the relevant test files and suites. Explicitly identify tests that do not exist yet.
- Provide [spec-validate](../../../.agents/skills/spec-validate/SKILL.md) for on-demand
  structure and traceability review. It reports findings without automatic edits.
- Keep future capability candidates visible in the phase candidate logs.
- Write specs so they can later inform generated high-level system documentation.

The [spec-system capability](../../../specs/specs/spec.md) is the authoritative contract
for specification structure and validation conventions.

## Outside this phase

- Replacing the renderer or implementing framework features.
- Building a documentation generator.
- Adding an automated spec-validation CI gate.
- Treating a matching test tag as proof of sufficient tests or coverage.

## Closeout work

- Record the verification baseline and readiness evidence in
  [phase-1-readiness.md](phase-1-readiness.md).
- Use the dedicated pre-slice gates in [open-questions.md](../../open-questions.md)
  for details that cannot be resolved without an implementation experiment.
- Keep capability drafts honest: do not invent test references or promote a
  capability based on structure validation alone.
- Run `npm run validate:specs` and the repository's `/spec-validate` review after
  contract or planning changes.

These are planning deliverables, not a claim that replacement rendering is
implemented. The broader objectives are recorded in [goals](../../goals.md);
implementation scope is recorded in [Phase 2](../phase-2/phase-2.md). The closeout record
and validation commands are collected in [phase-1-readiness.md](phase-1-readiness.md).
