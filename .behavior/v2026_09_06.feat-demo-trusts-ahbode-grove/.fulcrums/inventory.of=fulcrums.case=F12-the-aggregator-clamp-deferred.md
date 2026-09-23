# F12 — the aggregator clamp is deferred, so the SILENT revoke gesture stays uncaught

**stage** · `5.1.execution.from_vision` · **caught** 2026-09-08 · **rework** clean · **confidence 72%**

## the fork, stated fairly

`case=7` `[t3]` names the most dangerous gesture in the whole grant: remove a resource from
`getResources()`, and declastruct emits **no plan row, no warn, no error**. the role stays live,
still trusted, now unmanaged.

⇒ every other revoke hazard is caught by the plan-read fail-safe. **this one is caught by no
mechanism at all** — the artifact the operator is told to read is blank exactly where the defect is.

| branch | what it costs | what it buys |
|---|---|---|
| **① ship prose alone** — the pick | zero | the runbook + the declaration-site note name the trap. **a human must read one of them, at the right moment** |
| ② a clamp on `getResourcesOfReach()` | zero — it is already written | 🔴 **naught for this gesture.** the reach producer can be perfect while the aggregator drops it |
| ③ a clamp on `getResources()` | an edit to `resources.oidc.ts` + a new `resources.test.ts` | ✅ the gesture goes **red at CI**, on the commit that makes it |

## what was taken, and why at the time

**① — prose alone.** ③ is the honest fix and it is **not available in this wish**, on both halves of
the SAFE/CLEAN test:

- **SAFE — no.** `getResourcesOfOidc` reads live credentials at declare time
  (`resources.oidc.ts:22-24`), so `getResources()` cannot be called from a unit test. ③ requires a
  signature change there — and this wish's acceptance list requires that file be **unchanged and
  provable by diff**. ⇒ the fix would break the criterion on the commit that delivers the wish.
- **CLEAN — no.** it ripples through the oidc producer, the aggregator, `getProviders`, and a new
  test with its own snapshot.

⇒ so ① is not a preference over ③; it is what remains once the wish's own bounds are honoured.

## 🔴 the same defect blocks a SECOND named hazard, found independently

review round 2, lane `enroll-impl-behavior-intent`, raised what reads as a different nitpick and is
the same root cause:

> *"`ehmpathy-demo-oidc`'s 'exactly one statement' invariant — a named critipath hazard with zero
> test coverage … there is **no automated test** [that asserts] `getResourcesOfOidc()`'s role still
> carries a single policy statement — unlike the parallel guarantee this same PR built for the new
> grove role."*

⇒ **it is blocked by the identical line.** `getResourcesOfOidc` reads credentials at declare time, so
neither its own invariant nor the aggregator's composition can be clamped.

🔴 **two named hazards, one unavailable check, and each was found by a different hunt.** that is what
lifts this from a tidiness item: the fix does not buy one test, it unblocks **every** structural
clamp under `account=demo`.

## rework, and why it is clean

a later wish adds a test file and lifts one input. **not one line of this stone is undone by it** —
the reach producer, the runbook, and the snapshot all stand unchanged, and ③ composes beside them.

⚠️ **the exposure is NOT clean, on the F1 axis this inventory already draws.** the code rework is a
new file; the consequence of the pick is that the silent gesture stays uncaught until ③ lands, and
its cost falls at an incident. ⇒ read `clean` here as *"cheap to add later, expensive to need
meanwhile"*, exactly as the inventory's header instructs for F1, F7, and F9.

## confidence, and why it is 72%

the **deferral** is well-grounded — the SAFE/CLEAN test fails on both halves, and the wish's
acceptance list is explicit.

what is under 93% is the **sufficiency of prose as the interim guard**:

- the runbook and the declaration-site note both name the trap in bold, and `[t3]` walks it
- 🔴 **and a note is read by an operator who opened the file.** the gesture is reached for precisely
  by an operator who did **not** — one who reasons *"declarative means delete the declaration"* and
  never suspects the file has a caveat
- ⇒ the whole prose defense rests on the operator's habit, where every other revoke hazard rests on
  the plan-read

⚠️ **and the plan-read cannot cover this one.** its fail-safe is *"a plan that does not match is a
STOP"* — but the mismatch here is **an absent row**, and an operator who expected the removal to
produce a `DESTROY` reads the empty plan as *"already gone."* the guard's signal and the defect's
signature are the same emptiness.

## where

- the deferred work: `.dream/v2026_09_08.fix.demo-aggregator-reads-creds-at-declare-time.md`,
  symlinked at `dreams/` on this route
- the gesture: `1.vision.experience.case=7.the-reach-is-revoked.md` `[t3]`
- the prose that stands in for the clamp:
  `.agent/repo=.this/role=any/briefs/howto.revoke-grove-reach.md` → *"🔴 .read these three first"*,
  and `provision/aws.auth/account=demo/resources.reach.ts` at the trust statement
- the half that IS clamped: `provision/aws.auth/account=demo/resources.reach.test.ts`

## the verdict

⏳ **open.** a council may rule that prose suffices, or that ③ is owed ahead of the first apply.

🟡 **its clock is latent, and it is F8's clock** — it expires at the first revoke, which is the worst
moment to learn the guard was a habit.
