# <capability-name>

Write for a developer who needs to make a decision or complete a task. Lead with
the outcome, use short active sentences, prefer plain terms, and keep one term
for one concept. Use sentence-style capitalization for headings. Keep API
names, file names, and test names exact.

## Goal

Describe the feature, the problem it solves, and the intended outcome in plain language.
Scope it around one coherent, user-visible behavior. Keep related scenarios
together; split or regroup capabilities later when their contracts warrant it.

## Status

Draft.

Choose one lifecycle status and explain relevant limitations:

- **Draft:** still being designed.
- **Accepted:** requirements agreed; implementation incomplete.
- **Implemented:** acceptance criteria satisfied, with verification references.
- **Deprecated:** still present, but discouraged or scheduled for removal.

If applicable, record the target phase separately. Phase targeting is planning
information, not evidence of implementation or acceptance.

## Requirements

- Describe each required behavior or constraint as a clear, readable statement.
- Mark unresolved requirements explicitly rather than presenting proposals as decisions.

## Scenarios

### <Scenario name>

Describe a concrete situation, what the user or system does, and the expected
result. Use short prose or lists; formal EARS syntax is not required.
Choose representative scenarios: the happy path, important failures, and relevant
lifecycle boundaries. Leave exhaustive edge-case enumeration to tests.

## Acceptance criteria

- Describe observable evidence that demonstrates the capability satisfies its requirements.
- State what proves completion rather than repeating the scenarios verbatim.
- Do not mark criteria satisfied without supporting evidence.
- Describe concrete observable outcomes and planned evidence. Before implementation,
  consult [readiness guidance](../specifications/implementation-readiness.md).

## Usage description

Explain how someone uses the capability. Include a small example when helpful.
Label proposed APIs as illustrative until accepted and implemented.

## Test references

- Link relevant tests and describe the behavior they verify.
- Tests may reference this capability by its directory name, which is its stable ID.
- Use a bracketed capability tag in the suite name, for example
  `describe("[asset-loading] typed manifest loading", ...)`.
- Link the test file and identify the relevant tagged suite in this section.
- If tests do not exist yet, state that explicitly. Do not invent references.

## Notes

- Record limitations, open questions, and relevant context.
- Link architecture decisions for rationale instead of duplicating their full discussion.
