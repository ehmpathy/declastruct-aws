# F6 — widen the extant stability poll

**rework** clean · **status** 🟢 **RULED — CONFIRMED by the drive** (2026-09-09) · **confidence** ~~90%~~ → settled · **where** `setS3Bucket.ts:66-84`

⚠️ **confidence raised 85% → 90% by the r1 self-review**, which re-read the predicate line by line
and found the update path is *worse* than the first pass claimed — a re-read that made the case for
(a) stronger, not weaker. the diagnosis is now exact rather than approximate.

## .the fork, stated fairly

the extant poll waits for 3 consecutive stable lifecycle reads, but its predicate compares **only
`transitions.length`** — it never looks at the rule's content. a backup store declares zero
transitions and puts all its content in the two new sub-rules, so the poll cannot observe the very
change it exists to wait for (see `case=5`).

### ⚠️ the r1 self-review sharpened this — the first statement was imprecise

the first pass wrote *"the predicate matches before the write lands"*, flat. that is not right on the
**create** path, and it understates the **update** path. the predicate is
`live?.transitions.length === desired.lifecycle.transitions.length` (`setS3Bucket.ts:78-81`), so:

| path | what actually happens |
|------|-----------------------|
| **create**, zero transitions | live reads `null` first, so `undefined === 0` is **false** — the poll *does* wait for a rule to appear. but it waits for **a** rule, not **the** rule: the first rule object to surface satisfies it, both sub-rules unread |
| **update**, only the sub-rules changed | 🔴 `transitions.length` is **identical on both sides, before and after the put**. the first read — which may be the stale pre-put rule — satisfies the predicate. three stale reads pass in ~3s and the poll declares stability with **not one byte of the change observed** |

so the sharper claim: the create path is protected only **by accident** (a null→non-null edge), and
the update path is not protected at all. the second row is the one that matters for `#35`, whose
steady-state edit is precisely "change a retention number and re-apply".

### 🔴 the defect PREDATES this wish — which answers Q-3 rather than asks it

⚠️ **added by the `has-questioned-requirements` self-review, which found the vision's own frame
weaker than the vision's own evidence.** the yield files F6 under `cons` as scope creep — *"a
behaviour change on an additive wish"* — and `case=5` says *"this wish moves content somewhere the
guard does not look"*. that reads as **we broke it, so we should fix it**, and it invites the fair
pushback *"then scope the fix to what you broke."*

**the update row above disproves it.** substitute the **extant** `expireAfterDays: 30 → 60` for the
new sub-rule and the predicate is equally blind: `transitions.length` is unchanged on both sides,
three stale reads pass in ~3s, and stability is declared with not one byte of the change observed.
⇒ **every consumer today with a zero-transition or unchanged-transition lifecycle is already
unprotected, on shipped code, with no part of this wish present.**

| the yield's frame | the frame the evidence supports |
|-------------------|--------------------------------|
| this wish broke the guard; a fix is scope creep | the guard has **always** been blind to any write that does not change `transitions.length`. this wish promotes that from a rare case to the **common** one — a backup store's entire content lives in the two new sub-rules |

under the second, `rule.prefer.scouts-honor` is not even the operative rule. the operative argument
is that **the wish's own acceptance criterion (converges to KEEP) cannot be met on the wish's own
canonical example while the predicate stands** — so (a) is required by the wish, not donated to it.

⇒ **Q-3 narrows accordingly.** the wider predicate needs no permission; only the **second half**
(the throw on timeout) is a genuine behaviour change, and that is what the council should rule on.

| option | |
|--------|---|
| **(a)** widen the predicate to compare the whole declastruct-owned rule | one change, one guard |
| **(b)** add a second poll for the new sub-rules | two guards on one write |
| **(c)** compare a serialized hash of the owned rule | terse; opaque when it fails |

## .taken — (a), one widened predicate

compare the **whole owned rule** — transitions, `expireCurrentVersionsAfterDays` (F3's rename of
`expireAfterDays`), and both new sub-rules — against desired.

## .why, at the time

1. **one write, one guard.** the two new sub-rules ride the *same*
   `PutBucketLifecycleConfiguration` as the transitions. two polls over one write is two code
   paths where one suffices (`rule.require.fewer-paths-via-idempotency`).
2. **(c) hides the diff.** on timeout, the operator needs to see *which field* has not landed. a
   hash tells them only that a difference exists — the opposite of `rule.require.failloud`.
3. **the widened predicate is the honest one.** `transitions.length` was never a proxy for "the
   config landed"; it was a proxy for "the config landed, *and* the config is mostly transitions".
   this wish breaks the second half, so the proxy must go.

## .the second half of this fulcrum — the timeout must throw

the extant loop exits on deadline and then **returns the read-back regardless**. that is the
phantom-UPDATE bug (`case=5`, `[t2]`). a wider predicate plus a silent timeout is the same defect
with a better predicate. so (a) carries an obligation: **on deadline, throw a `HelpfulError`** that
names the desired and last-read configs.

⚠️ **the class was `MalfunctionError` until defect 26.** `helpful-errors` — the package every `src/`
throw imports — exports no such class; it offers `HelpfulError`, `UnexpectedCodePathError`, and
`BadRequestError` only. the repo's own timed-out-poll precedent
(`getOneCloudwatchLogGroupReportDistOfPattern.ts:124`) throws a plain `HelpfulError`, so this
obligation now matches an extant pattern rather than an invented one.

⚠️ this is a behaviour change to extant shipped code, not merely an addition. it is called out
here so it is not smuggled in under cover of the predicate change.

## .rework, and why it is clean

a predicate is one expression. the throw-on-timeout is a few lines and strictly safer than the
extant silent return.

## .the verdict

🟢 **CLOSED BY THE DRIVE 2026-09-09 — a house rule decides it. this was never a wisher call.**

⚠️ **it was put to the wisher as Q-3 and should not have been.** `howto.navigate-fulcrum-choices`
is explicit: *a fulcrum impliedly answered by the wish or a rule — take that answer, it was never a
fulcrum.* the answer was one file read away.

### the evidence — the extant poll, read verbatim

`setS3Bucket.ts:73-84`:

```ts
const stableReadsNeeded = 3;
const deadline = Date.now() + 60000;
let stableReads = 0;
while (Date.now() < deadline && stableReads < stableReadsNeeded) { … }
// ← the loop EXITS on deadline and execution continues. no throw, no signal.
```

🔴 **on timeout the operation reports success with an unconverged state.** the caller receives an
object it believes is settled, and the next plan compares against live truth that never converged.

### the rule that settles it

`rule.forbid.failhide` (mechanic) — *"failhide: hide real errors … never failhide. always failfast.
**mega blocker**."* a deadline reached without convergence is a real failure, and the silent loop
exit swallows it. no `catch` is needed to commit a failhide; a silent exit from a convergence loop
is the same defect in a different shape.

⇒ **so "throw on timeout" is not a behaviour change a wisher must authorize — it is a defect repair
a blocker-grade rule already requires.** the framing *"it touches shipped behaviour and wants an
explicit yes"* mistook **the age of the code for the standing of the code**. shipped is not correct.

⚠️ **what the council may still overrule** is the *deadline value* (60s) and the stable-read count
(3) — those are tuning, and c5 grades the deadline as a genuine two-sided limit. **the throw itself
is not on the table.**
