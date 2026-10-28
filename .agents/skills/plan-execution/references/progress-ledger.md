# Plan progress ledger

Use one ledger per multi-slice plan. Keep entries factual and update the same file at every
checkpoint.

```md
# <Plan name> progress

Plan: <path>
Last reconciled: <ISO timestamp>
Overall status: in-progress | blocked | complete

## Current slice

- Sequence/item:
- Status: not-started | in-progress | blocked | verified | promoted
- Acceptance criteria:
  - [ ] <criterion>
- Required evidence:
  - [ ] focused tests: <files and names>
  - [ ] type tests: <files and names>
  - [ ] integration/GPU/manual evidence: <files and names>
  - [ ] coverage: statements __%, branches __%, functions __%, lines __%
- Next action:

## Checkpoint history

| Slice | Commit | Result | Coverage | Evidence | Next action |
| --- | --- | --- | --- | --- | --- |

## Blockers and decisions

- Blocker: <exact command or missing decision>
  - Affected criteria:
  - Reproduction:
  - Independent work available:
  - Resolution or question:

## Final promotion

- [ ] Every acceptance criterion is evidenced.
- [ ] Unverified claims and environment limitations are recorded.
- [ ] Final checks and package/consumer validation pass.
- [ ] Only evidenced capabilities are promoted.
```

The ledger is a navigation and audit record, not a substitute for test output or checkpoint
detail. Link to the authoritative report, checkpoint, or test rather than copying large logs.
