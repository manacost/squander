# Codex work-harness plan template

Use this template for plans that Codex will implement over multiple turns. Replace every
placeholder before execution. Keep the plan authoritative; put changing execution state in a
separate progress ledger.

## Harness rule

Copy this section into the repository's `AGENTS.md` when the plan needs resumable execution:

```md
For this plan, use the repository plan-execution workflow. Read the plan and progress ledger
before editing. Work in the smallest unblocked slice. Each slice requires tests for its
acceptance criteria, the applicable type/integration/coverage evidence, a checkpoint, and an
atomic commit before promotion. After a failure, fix it, record the exact blocker and next
independent action, or ask one focused contract question. Continue through independent work;
do not end with an unqualified progress report. Never promote behavior that is not evidenced
by the repository's actual tests, reports, and runtime checks.
```

## Plan

### 1. Outcome

- **User outcome:** What can a user do when this plan is complete?
- **Observable finish line:** What repository behavior proves completion?
- **Success measures:** Exact values, thresholds, compatibility boundaries, or user-visible
  outcomes. Avoid “works,” “complete,” or “high quality” without a measurable definition.

### 2. Scope

- **In scope:**
  - <capability or behavior>
- **Explicit non-goals:**
  - <deferred behavior>
- **Compatibility boundary:** <packages, APIs, browsers, platforms, or versions>
- **Authorized mutations:** <files, dependencies, generated outputs, external systems>

### 3. Repository baseline

- **Instructions:** <AGENTS.md and relevant skills>
- **Starting revision:** `<commit>`
- **Current branch/worktree expectation:** <clean, preserve unrelated changes, etc.>
- **Existing implementation:** <entrypoints and relevant modules>
- **Existing tests/reports:** <commands and known baseline results>
- **Known failures:** <pre-existing failures, environment limits, or stale artifacts>

### 4. Contract decisions

Record decisions before implementation when they change public behavior, resource ownership,
error handling, timing, compatibility, or test interpretation.

| ID | Decision | Rationale/evidence | Affected slices | Deferred alternative |
| --- | --- | --- | --- | --- |
| AD-001 | <contract> | <reason> | <slice IDs> | <if any> |

### 5. Slice map

Order slices by dependency, not by file size. Each slice must be independently reviewable and
have a concrete completion criterion.

#### Slice `<ID>` — `<short outcome>`

- **Depends on:** <slice IDs or none>
- **Public symbols/files:** <expected surface>
- **Consumer example:** <small realistic use without casts or internals>
- **Acceptance criteria:**
  - [ ] Given <setup>, when <action>, then <observable result>.
  - [ ] Given <failure/race>, when <action>, then <typed/error/resource result>.
- **Test names:**
  - `<tag> <test name>` — <criterion IDs>
- **Evidence required:**
  - [ ] Unit/runtime: <file and suite>
  - [ ] Type: <valid inference and rejected misuse>
  - [ ] Integration/GPU/browser/manual: <file, fixture, and independent expectation>
  - [ ] Coverage: statements __%, branches __%, functions __%, lines __%
  - [ ] Documentation/demo: <route or usage reference>
- **Failure and ownership paths:** <cancellation, disposal, retries, sharing, isolation>
- **Checkpoint:** <record path and required code trace>
- **Commit:** `<type(scope): imperative summary>`
- **Completion criterion:** Every criterion is evidenced, or each unverified criterion has an
  exact blocker and a documented decision not to promote it.

Repeat the slice block for every implementation sequence. Do not combine unrelated public
contracts merely to reduce the commit count.

### 6. Verification matrix

| Evidence | Command/suite | Proves | Does not prove | Required result |
| --- | --- | --- | --- | --- |
| Unit/runtime | `<command>` | <CPU behavior> | <GPU/raster behavior> | pass |
| Type | `<command>` | <public inference/rejection> | <runtime behavior> | pass |
| Integration | `<command>` | <cross-module behavior> | <unexercised paths> | pass |
| Real runtime/GPU | `<command>` | <shader, upload, raster, device behavior> | <coverage> | executes, no silent skip |
| Coverage | `<command>` | <instrumented runtime paths> | <shader correctness> | all required dimensions exceed threshold |
| Package/consumer | `<command>` | <published boundary> | <source-only behavior> | pass |

State how expected values are calculated independently and how environment metadata is
recorded. A skipped required environment is a failed evidence gate, not a pass.

### 7. Checkpoint protocol

Every slice checkpoint records:

- contract decisions and deferred behavior;
- files and public symbols changed;
- code trace from public entrypoint through implementation, lifecycle/resource boundaries,
  tests, and documentation;
- exact commands and outcomes;
- per-file and aggregate coverage where required;
- type and integration evidence;
- failures, limitations, and unverified claims;
- go/no-go decision and the next independent action.

### 8. Continuation policy

- After a successful commit, reload the ledger and begin the next unblocked slice.
- After a failed gate, classify it as fixable, environment-blocked, contract-blocked, or
  pre-existing.
- Fix fixable failures before promotion.
- Record exact reproduction and continue with independent work after a blocker.
- Ask the user only when the answer changes public behavior, authority, destructive scope, or
  the dependency order of the remaining plan.
- The plan is complete only when every slice has a checkpoint, required evidence, commit, and
  promotion decision.

### 9. Final review

- [ ] All acceptance criteria map to named tests or explicit external evidence.
- [ ] Every modified runtime file is included in the required coverage scope.
- [ ] Real runtime behavior is separately verified where mocks or TypeScript coverage are
      insufficient.
- [ ] Public exports, package consumers, and documentation match the implementation.
- [ ] Non-goals were not silently implemented or promised.
- [ ] Pre-existing failures are separated from regressions.
- [ ] The final progress ledger is complete and auditable without chat history.
