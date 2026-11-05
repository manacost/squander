---
name: plan-execution
description: Execute a repository plan through verified slices, checkpoints, commits, and resumable progress. Use when implementing a multi-step plan, continuing unfinished planned work, or asked not to stop until the plan is complete.
---

# Plan execution

Use this workflow for any repository plan. The plan is the contract; the progress ledger is
the memory; checkpoints are the proof. Keep moving through independent work, but never turn
an intended result into an evidenced result.

## Start with state

1. Read repository instructions, then inspect `git status --short --branch`.
2. Locate the user-approved plan and read it completely enough to identify its sequences,
   acceptance criteria, dependencies, explicit non-goals, and required checks.
3. Locate the plan's progress ledger. For ordinary local work, keep both in the gitignored
   `.codex/plans/` directory; use a plan-specific filename such as
   `.codex/plans/<plan-name>.md` and `.codex/plans/<plan-name>.status.md`. If no ledger exists,
   create one before implementation using [the ledger template](references/progress-ledger.md).
   Keep the plan versioned only when the user explicitly wants it shared or reviewed as a
   repository artifact.
4. Reconcile the ledger with the repository: inspect the relevant commits, source imports,
   tests, reports, and current diff. Correct stale ledger claims before starting new work.
5. Select the first incomplete, unblocked slice. State its acceptance criteria and the next
   concrete action in the ledger.

Completion criterion: the selected slice, its evidence requirements, current baseline, and
next action are recorded from the actual repository state.

## Execute one slice

1. Resolve only contract decisions that affect the selected slice. Record decisions and
   deferred questions in the plan's decision log.
2. Write or update tests for each acceptance criterion before considering implementation
   complete. Use independent expected values and public outcomes; use controlled promises or
   clocks for races and cancellation.
3. Implement the smallest coherent change. Preserve unrelated work and keep public API,
   documentation, and tests in the same logical change when they describe the same behavior.
4. Run focused checks first, then the plan's broader checks. Include type tests for public
   contracts, runtime coverage for modified runtime code, and real integration/rendering
   evidence where mocks cannot prove correctness.
5. If a check fails, classify it immediately as fixable, environment-blocked, contract-blocked,
   or pre-existing. Fix it in the slice when possible. Otherwise record the exact command,
   failure, affected acceptance criteria, and the next independent slice.

Completion criterion: every acceptance criterion is either evidenced by a passing check or
explicitly recorded as unverified with an actionable blocker; no failure is hidden by a skip.

## Checkpoint and commit

At the slice boundary, update the local ledger and the versioned checkpoint with:

- contract decisions and deferred behavior;
- files and public symbols changed;
- a code trace from public entrypoint through implementation, resource/lifecycle boundaries,
  tests, and documentation;
- exact commands and outcomes;
- coverage by statements, branches, functions, lines, and file where the plan requires it;
- type-test and real integration evidence where applicable;
- known failures, environment limits, and unverified claims;
- the next independent action and a go/no-go decision.

Commit only the coherent slice after its required gates pass. Use a Conventional Commit and
record the resulting commit in the local ledger. Do not promote a capability merely because a
structural validator, legacy test, screenshot, or high aggregate coverage number passes.

Completion criterion: the checkpoint can be audited without chat history, and the commit
contains only the slice it describes.

## Continue instead of stopping

After a commit or a blocked gate, reload the ledger and choose the next independent slice.
Continue automatically when:

- the next work has explicit acceptance criteria;
- no unresolved decision on the critical path is required;
- the necessary authority and environment are available.

Ask the user one focused question only when the missing answer changes public behavior,
permissions, destructive scope, or the dependency order of all remaining work. If one slice
is blocked but another is independent, record the blocker and continue with the independent
slice. If all remaining slices share the blocker, leave the repository in a resumable state
and report the exact question or external prerequisite.

Never finish with only “in progress,” “tests pass,” or “blocked.” Finish a turn with one of:

- a committed verified slice and the next action;
- a precise blocker and independent work exhausted;
- a complete plan with final evidence and promotion decision.

## References

Read [the ledger template](references/progress-ledger.md) when creating or repairing a plan
ledger. Read the repository's plan, capability specifications, and local test instructions
for domain-specific gates; this skill does not replace them.
