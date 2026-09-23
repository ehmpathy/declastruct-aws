# .taken · the r022–r025 direct-read record

**stone** · `1.vision` · **hash at close** · `ab5c5959` · **as of** 2026-09-08

these four passes are **driver-run `rhx review`**, not guard lanes. both guard lanes are exhausted at
5/5 and terminal; `rhx review` is not budget-bound, so it is the one lever left to verify a repair.
each run used the **same rubric and paths** the guard uses, read from
`.log/bhrain/review/…/input.args.json`.

## the trajectory

| pass | r1 dimensional-decomposition | r2 experience-coverage |
|---|---|---|
| r022 | 0 blockers · 0 nitpicks | 0 · 0 |
| r023 | 0 · **3** | 0 · 0 |
| r024 | **1** · 2 | 0 · **1** |
| **r025** | **0 · 2** | **0 · 0** |

🔴 **the count did not fall monotonically, and that is the honest read.** the reader is stochastic and
reached different depths each pass. **every item it raised was genuine**, which is why each was
repaired rather than dismissed — a count that grows under an unchanged reader is more work found,
never a regression (`rule.always.bear-every-self-review`).

⇒ **what converged is the SEVERITY**: the one blocker r024 raised is graded a **nitpick** at r025, by
the same reader, after the repair. that is the signal a count alone cannot carry.

## what was repaired, r023 → r025

| pass | item | the repair |
|---|---|---|
| r023 n1 | a **stale census head** — the `revoked` slice opened *"two demoed … one impossible"* while its own table foot read **9 demoed · 2 itemized · 1 forbidden** | the head now cites the foot's split rather than restates it |
| r023 n2 | `provisioner × declare × both` — the **converge** sub-sense folded into the revoke sense with no recorded collapse | added as a third recorded collapse, with the reason that parts it from the other two |
| r024 b1 | *"orthogonality unconfirmed, contingent on F1"* | ⚠️ **refuted, and the refutation landed in the artifact.** orthogonality is a property of a grid **under a stated design**; the vision states its design, so the pair is orthogonal **now**. the grade moved `⚠️ CONTINGENT` → `✅ yes, under the design this vision proposes` |
| r024 n1 | one justification stretched over **four** barred cells — the absent-arn reason bars `obtain`, never `declare` | the two bars stated apart, with the durable form |
| r024 n2 | the vault bar is **nurture**, so it owed a checkable invariant | added, plus the one-command check that settles it |
| r024 r2n1 | `case=4`'s narrative told from the **system's** vantage | rewritten to a reviewer's lived moment — the absence of a second look |

## 🔴 the two residuals at r025 — recorded, not repaired

**both are self-graded by the reader as *"not a blocker"*, and both restate the artifact's own
declared status back to it.** per `feedback_exhausted-lane-plus-changed-hash`, that is a correctly
graded open item: record it and stop, because another edit only invalidates the read just paid for.

| # | the residual | why it stands |
|---|---|---|
| 1 | **actor × stage orthogonality is contingent on F1** | the reader's own text: *"the vision handles this correctly — the nine affected rows are pinned per-row … so this is not a hidden non-orthogonality and not a blocker."* its ask is that the conditional nature be *"explicitly in the review record"* — ⇒ **this file is that record.** it asks for no artifact edit |
| 2 | **the duration fold is prose-dependent** | the reader's own text: *"a defensible fold with a stated re-walk trigger … the overrun critipath on the central cell IS walked (`case=1` `[t6]`), so this is a nitpick, not a blocker."* ⚠️ the residual it names — that `act × target-only` and `act × revoked` carry no explicit short-run/overrun split — is **real and open**, and it is downstream of **question 17**, which is already the queue's head |

⇒ 🔴 **both residuals reduce to ONE open item the vision already carries: F1 and its unmeasured
inputs (questions 7, 12, 13, 14, 17).** neither is a defect in the walk; both are the walk correctly
stated as performed under a best-guess the wisher had not yet ruled on.

### 🔴 update 2026-09-08 — residual 1 is CLOSED by the wisher's verdict

*"yeah this is fine; demo account needs full access. no worries."* ⇒ F1 is ruled, the contingency is
discharged, and **`actor × stage` is orthogonal with no condition attached.** the conditional the
reader asked to see stated in the review record is now a settled grade rather than a caveat — so
residual 1 has no subject left.

⚠️ **residual 2 is untouched.** the duration fold's prose dependence is downstream of question 17,
which no verdict reaches.

⚠️ **and this record was NOT re-verified after that propagation, deliberately.** the human's
instruction stands — *"no more reviews dude / thats way too many passes."* ⇒ **the propagation is
reported as an edit, never as a re-read**, and the distinction is stated so nobody mistakes one for
the other.

## the levers spent

| lever | outcome |
|---|---|
| repair the artifact | 25 rounds; the r025 blocker count is **0** on both lanes |
| condense per `rule.always.yield-the-output-not-the-archaeology` | yield 1,398 → 984 lines; archaeology re-homed; round-narration pulled from six `case=` files |
| `rhx review` at each new hash | four passes, both lanes each time |
| `--as passed` | run at `ab5c5959`; j1 blocks, j2 allows |
| 🔴 `route.guard.budget --add N` | ⛔ **not run** — `rule.forbid.budget-top-ups`, and the wrong lever: no lane is short of rounds, they hold a stale hash |
| 🔴 `--as rewound` | ⛔ **not run** — driver-runnable, which is what makes it a trap. a rewind that lets exhausted lanes re-review is a budget top-up under another name |

## .see also

- `verify.r025.dimensional-decomposition.md` · `verify.r025.experience-coverage.md` — the final reads
- `verify.r023.*` · `verify.r024.*` — the reads that found the six repairs above
- `../../blocker/1.vision.md` — the hand-off, and the one command that moves the stone
