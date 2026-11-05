# specs

## Goal

Describe system capabilities in small, readable specifications that connect
intended behavior to usage, acceptance criteria, and tests.

Specifications also provide source material for future high-level system
documentation generation. Building that generator is outside the current scope.

## Status

Draft.

The initial document structure, template, and lifecycle vocabulary are established.
The spec-system design is still being discussed. Validation is an on-demand
skill review; no automated enforcement or CI validator is required.

## Requirements

- Each capability describes a feature of the system.
- Scope each capability around one coherent, user-visible behavior, rather than
  an individual class, function, or an entire subsystem.
- Keep closely related scenarios together. Split a capability when it has an
  independently useful contract and distinct acceptance criteria. Refine or
  regroup capabilities later as needed; update affected references when doing so.
- Each capability has its own `specs/{capability}/spec.md` file.
- The capability directory name is its stable ID. Do not introduce separate
  numeric capability IDs.
- Base each specification on [`spec_template.md`](../spec_template.md).
- Include sections for goal, status, requirements, scenarios, acceptance
  criteria, usage description, test references, and notes.
- Write plain, readable language rather than formal EARS syntax.
- Prefer lists over tables.
- Use representative scenarios covering the happy path, important failures,
  and relevant lifecycle boundaries. Do not exhaustively enumerate every edge case.
- Requirements state the contract, scenarios illustrate it, and acceptance
  criteria define evidence of completion. Tests may cover additional edge cases
  without duplicating each one in the specification.
- Tests can reference a capability by its name.
- Identify the capability in a test suite name with a bracketed tag, for example
  `describe("[asset-loading] typed manifest loading", ...)`, using ordinary
  test-runner APIs rather than a custom wrapper.
- In test references, link the test file and identify the relevant tagged suite.
- Provide `/spec-validate` as an on-demand skill that reviews structure, local
  references, lifecycle status, and capability-to-test traceability.
- Implemented capabilities must have test references and a matching tagged
  suite. A matching tag alone does not prove that acceptance criteria are met.
- Validation reports findings; it does not automatically edit files or promote
  capability status. Automated CI enforcement is outside the agreed scope.
- Specifications can link the architecture decision log to explain rationale.
- Keep intended behavior distinguishable from implemented and tested behavior.
- Use one of these lifecycle statuses:
  - **Draft:** still being designed.
  - **Accepted:** requirements agreed; implementation incomplete.
  - **Implemented:** acceptance criteria satisfied, with verification references.
  - **Deprecated:** still present, but discouraged or scheduled for removal.
- Record any target phase separately from lifecycle status. A future-phase
  candidate may remain a draft; phase targeting does not imply acceptance.
- Write descriptions and usage explanations so they can inform future
  high-level system documentation. No generator is required now.

## Scenarios

### Describe a new capability

- An author copies the template to `specs/{capability}/spec.md`.
- The directory name becomes the capability's stable ID.
- The author describes the feature and its expected behavior, marking unresolved
  decisions and missing tests explicitly.

### Connect behavior to tests

- A test can identify the capability it verifies using the capability name.
- The capability's test references point readers to relevant tests and explain
  what they verify.
- The suite name includes a bracketed capability tag such as `[asset-loading]`.
- `/spec-validate` reviews these relationships on demand.

### Explain a design choice

- A reader finds behavioral expectations in the capability specification.
- A linked architecture decision provides the rationale and tradeoffs.

### Validate specifications on demand

- A developer invokes `/spec-validate` for all capabilities or a selected scope.
- The skill checks required sections, names, statuses, local links, and test tags.
- It reports violations and suggestions with evidence, distinguishing source
  inspection from executed tests and leaving files unchanged unless fixes are requested.

### Generate system documentation in the future

- A future documentation tool can use capability goals and usage descriptions
  as source material.
- The tool must distinguish proposed features from implemented features.
- Generator behavior and output formats will be specified separately if pursued.

## Acceptance criteria

- The spec-system capability exists at `specs/specs/spec.md`, with stable ID `specs`.
- A reusable template exists at `specs/spec_template.md`.
- Both documents contain all eight required sections.
- The documents explain capability naming, test references, and architecture
  decision links using readable prose and lists.
- Missing tests and unresolved design details are visible.
- The template and capability specs use the defined lifecycle vocabulary and
  distinguish phase targeting from status.
- Future documentation generation is described without claiming it is implemented.
- A repository skill at `.agents/skills/spec-validate/SKILL.md` describes the
  on-demand checks and reports traceability without claiming behavioral coverage.

These criteria describe the initial document structure, status vocabulary, and
on-demand validation workflow. Automated enforcement is not required.

## Usage description

Copy `specs/spec_template.md` into a new capability directory and replace its
placeholders with feature-specific content. For example, a future capability
named `asset-loading` would live at `specs/asset-loading/spec.md`; its tests could
refer to `asset-loading` directly. This example does not establish that capability.

Use the requirements and scenarios to explain behavior, acceptance criteria to
state how completion is assessed, and test references to locate verification.
Use notes for open questions and links to supporting decisions.

Before implementing a capability, use the
[readiness guidance](../../specifications/implementation-readiness.md) to resolve
relevant open contracts and choose observable acceptance evidence. The
[capability index](../README.md) lists current framework drafts.

Invoke `/spec-validate` to review all specs, or name a capability to narrow the
review. The [validation skill](../../.agents/skills/spec-validate/SKILL.md)
contains the review workflow.

## Test references

No automated tests exist for this capability yet. The validation skill provides
an on-demand review rather than an automated test suite.
The current documents can be checked for formatting, but formatting does not
establish behavioral coverage or test traceability.

## Notes

- The [architecture decision log](../../specifications/decisions.md) records
  accepted framework decisions from the ongoing interview.
- The existing phase candidate logs are planning backlogs, not capability specs.
  Their planning IDs do not replace capability names as stable spec IDs.
- Open questions include the remaining section guidance.
- The location of existing planning documents has not changed as part of
  establishing the capability directory convention.
