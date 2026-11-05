---
name: spec-validate
description: Review capability specs for structure, readable contracts, and test traceability when asked to validate specs or their test mappings.
---

# Validate capability specs

Perform an on-demand review and report findings. Validation alone does not
authorize edits, status promotion, new tests, or CI integration.

## Scope and sources

Read `specs/specs/spec.md` and `specs/spec_template.md` from the repository root
as the authoritative format and lifecycle contract. If either is missing, report
the missing prerequisite rather than inventing a replacement convention.

Review the requested capability names or paths; default to all
`specs/{capability}/spec.md` files. The template and planning backlogs are not
capabilities. Discover tests from the repository's test configuration, including
unit and browser tests. Build the complete capability-name inventory even for a
scoped review, so references outside the selected scope are resolved correctly.

## Review

- Check required sections, a valid lifecycle status, and agreement between the
  capability name and its directory. Keep target phase separate from status.
- Check coherent feature scope, readable requirements, representative scenarios,
  observable acceptance criteria, and a useful usage description. Treat prose
  improvements as suggestions unless they violate an agreed requirement.
- Resolve local Markdown links relative to their containing file. Check linked
  files and any specified headings. Distinguish actual references from illustrative
  code or paths; examples do not require existing capabilities or files.
- Inspect bracketed capability tags in real test suite declarations. Confirm
  each capability tag names an existing spec. Ordinary bracketed text unrelated
  to capability tagging is not automatically an unknown capability.
- Follow each spec's test references to the file and named suite. Confirm the
  suite carries the matching capability tag and inspect its assertions for
  relevance. A matching tag alone is not evidence of behavioral coverage.
- An Implemented capability must have test references and a matching tagged
  suite. Report skipped, todo, empty, or irrelevant tests as insufficient evidence.
  Draft and Accepted capabilities may explicitly state that tests do not yet
  exist. Existing untagged tests are not violations by themselves.
- Check claims against the linked architecture decisions and inspected evidence.
  Flag unsupported completion claims without silently changing status.

For a scoped review, inspect the selected specs and their test relationships;
report repository-wide tag integrity only if it was actually checked. Test
execution is separate from structural review: run focused tests when needed to
verify a claim, and state exactly what ran. Never infer passing tests or a coverage
percentage from source inspection.

## Report

Use a concise list of findings with capability names, file/line links, the rule
or claim involved, and the smallest useful correction. Separate contract
violations, suggestions, and checks that could not be completed. State scope and
test execution status. If no violations were found, say so within that scope;
do not imply that traceability proves complete behavioral coverage.
