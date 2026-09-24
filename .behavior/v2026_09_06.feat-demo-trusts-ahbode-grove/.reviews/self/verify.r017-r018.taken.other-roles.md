# 1.vision — .taken.by_self · the OTHER-ROLES round · i006 r017–r018

**verdict: the architect returned 2 blockers · 3 nitpicks. the ergonomist returned 2 blockers ·
3 nitpicks. sixteen behaver-lane reads had returned none of them.**

## 🔴 why this round exists — I invoked the right rule and executed it wrong

`rule.always.get-a-second-opinion-before-foreman` says **phone the RIGHT friend**, and it gives a
table of **roles**. my prior round varied the **rubric** and the **brain** and stayed inside **one
role** the whole time.

⇒ **behaver grades coverage and decomposition. it does not grade prose, and it does not grade the
surface a human touches.** so a whole class of defect was structurally unreachable by every read I
had run — not because the reads were shallow, but because **no lens I had pointed at it.**

| role | its question | what it found |
|---|---|---|
| behaver ×16 | is the space walked, is every critipath demoed? | ✅ clean |
| 🔴 **architect** | is this prose, or is it archaeology? | **2 blockers** |
| 🔴 **ergonomist** | does the human at the failure know what to do? | **2 blockers** |

## architect blocker.1 — chronological accretion · **[REPAIR], and it is a rule I am bound by**

`rule.forbid.chronological-accretion`: *"prose states current truth, not the time-order of how it
got there."* ⇒ and `rule.always.yield-the-output-not-the-archaeology` binds **me**, as driver, with
the same demand and a list of tells that reads as a description of this document:

> *"an earlier draft"* · *a section on why a previous version of the same doc was wrong* · **a yield
> that grew on a round where no decision changed**

🔴 **all three were present, and the third is the diagnosis.** the yield grew every round. that is
the tell, and I had read it as diligence.

**the repair, and its bound.** the rule keeps *"a reversal a reader must ACT on"*, so this is a
**reframe, never a purge**:

| stays | goes |
|---|---|
| the wish-contradictions table — six falsified premises a wisher must act on | the round ordinals that dated them |
| the three fail-safes, restated as **design facts** | the narration of the round that named them |
| the durable lesson (*a fail-safe you have not named reads as one you have not built*) | *"what peer review found at round 6"* as a section |
| axis C's fourth value + its byte-identical tell | *"36 → 48 at review round 5"* |

⇒ **30 accretion sites → 14.** the archaeology already had a home: these `.taken` files. the yield
now states the outcome and the `.taken` holds the path to it, which is the split the rule asks for.

⚠️ **and the accretion had done structural damage no one had seen.** the *"36 → 48"* paragraph had
been inserted **into the middle of the artifact table**, orphaning its last row from its header. ⇒
**accretion does not merely add words; it lands them wherever the author was, and that is not always
a place a paragraph can go.**

## architect blocker.2 + nitpicks — **[REPAIR]**

the cross-repo lead-in packed a wind-up, a five-item parenthetical, and a restated punchline into
one sentence. cut to three short ones. the fused revoke sentence (`two acts, in this order: X (it
stops the bleed), then Y (it stops re-entry)`) split into three. ⇒ **the ramble was itself an
artifact of accretion** — each round appended a clause to a sentence that was already whole.

## 🔴 ergonomist blocker.1 — and it hands F2 a criterion F2 never weighed

**the point:** the `AccessDenied` that cuts the clone *"states only the symptom"*, and the designed
compensation — the role's `description` — **needs `iam:GetRole` in demo, the very access the cut
clone does not hold.** so at the moment of failure the human has no fix in reach.

**`[REFUTE]` in part:** `rule.require.errors-name-the-fix` governs the errors **we emit**. this text
is **AWS's**, returned by `sts:AssumeRole`, and no artifact in this repo can alter one byte of it.

**`[REPAIR]` in substance — and the repair is a real find.** the reviewer is right that the design
must put a fix in reach, and the vision's answer was one artifact (a repo-side note, exec-owes row
3). ⇒ **there is a second channel, and the vision walked past it four rounds running:**

> **the role NAME is the one string we control that AWS places in front of the denied caller.**
> the message reads `... on resource: .../ehmpathy-demo-for-grove`.

⇒ **F2 chose the name for the reader of a declaration. it is also the only fix-pointer that reaches
an actor with zero permissions** — no `iam:GetRole`, no repo checkout, no console. that is a
**second criterion**, and it was absent from F2's entry.

⚠️ **it does not obviously change the answer** — `ehmpathy-demo-for-grove` already names the
consumer, which is the most useful thing a stranded reader could learn. **what changes is the
JUSTIFICATION**, and a right answer held for one reason is one round from being traded away for a
name that reads better in a declaration and worse in an error.

## 🔴 ergonomist blocker.2 — **[REPAIR]**, and the repair is the SAME find one road over

**the point:** the intuitive revoke gesture reports naught. `case=7` `[t3]` already walks it —
remove-from-wish is **silent** (`computeChange.ts:37-45` iterates resources *in* the wish, so an
absent one is never fetched). the vision's guard was `[t3''']`: state the expected plan shape, and a
mismatch becomes a stop.

⚠️ **the reviewer's sharper half is the one that lands: `[t3''']` only fires for an operator who
already knows to state a shape, and that knowledge lives in the runbook.** ⇒ **a fail-safe reachable
only through a docs fetch does not reach the actor most likely to need it** — the hurried one.

**the repair, `[t3'''']`:** a note **at the declaration site**, beside the trust statement. that is
the one surface the operator's hand is already on at the moment of the wrong move. it owes four
lines: deletion does not revoke · the role survives · the revoke is an upsert, strip then rewrite ·
the expected plan shape per apply. now **exec-owes row 16**.

🔴 **and it is the ergonomist's OWN blocker.1 find, generalized.** blocker.1 said: the stranded clone
holds only the role NAME, so the name must carry the pointer. blocker.2 says: the hurried operator
holds only the DECLARATION, so the declaration must carry it.

> **when an actor is about to err, the only channel that helps is the one already in their hand.**

⇒ **two blockers from one role, and they are one principle.** neither behaver read could have found
it, because neither grades *where a fix sits relative to the actor who needs it*.

⚠️ **the engine defect is NAMED, never fixed here.** a declarative surface that reports a removal as
silence is a `status-feedback` defect in **declastruct**, which is ehmpathy's tree and not this
wish's scope. filed beside the `delIamRole` ask that open question 3 already funds.

## ergonomist nitpick.2 — **[REPAIR]**, by the same edit

`safe-by-default`, one rung below blocker.2: the easy path is the destructive one. the vision's guard
sat at rung 3 (catch it early) and it still does — declastruct's behaviour lives in a dependency, so
rung 1 is out of reach. **what changed is that rung 3 now reaches an actor who read no runbook**,
which is the gap the nitpick names.

## ergonomist nitpick.1 — **[REFUTE]** in whole, **[REPAIR]** in its parenthetical

**the refute:** a defaulted region is a **surprise**, and `safe-by-default` outranks
`defaults-match-common-case` where the two collide. a provisioner that silently targets `us-east-1`
when the operator meant another region applies real infrastructure to the wrong place. ⇒ **the
fail-fast is correct, and `getDeclastructAwsProvider.ts:220-227` is extant behaviour this wish does
not touch.**

**the repair, and it is the reviewer's own parenthetical:** *"a fail-fast error that does not name
the region it expected."* that is `errors-name-the-fix` unmet, it is real, and it is cheap. **in this
repo's scope, out of this wish's** — recorded on exec-owes row 15 rather than absorbed.

## ergonomist nitpick.3 — **[REPAIR]**

the mid-flight `ExpiredToken` reports the **cause** and stops; it never says it left live EC2
instances behind. ⚠️ **and that is a separate defect from the leak, which is the part worth the
record:** the leak is bounded by the next run's sweep, but **the silence is not** — an operator reads
`ExpiredToken`, re-unlocks, re-runs, and never learns a cleanup was owed.

⇒ **the party that caused the harm is the one party never told of it.** and the report is cheap,
because the both-ends cleanup rules already require the run hold its created ids.

⚠️ **filed as OUT OF SCOPE and raised, never force-fit** (exec-owes row 17): the teardown lives in the
suite, never in the grant. `rule.require.experience-catalog-evolution`'s own caveat governs — a
discovery outside the wish's bounds goes to the wisher.

## 🔴 what the three out-of-scope rows have in common

rows 15 and 17 and the `[t3'''']` engine note are **one family**: three surfaces in ehmpathy's own
trees that report a symptom and name no fix. none is fixable inside this wish.

⇒ **all three are named rather than absorbed, and that is the point.** a defect a vision swallows is
a defect the next vision re-discovers.

## the lesson

🔴 **a lens finds only what it is pointed at, and a count of reads measures neither.** sixteen reads
across two rubrics and three brains returned clean; two reads from two other roles returned four
blockers. **the reads were not shallow — the aperture was narrow.**

⇒ **the honest pre-escalation test has three axes, and only the third is the one I kept skipping:**

| axis | I varied it | it found |
|---|---|---|
| the **reader** (brain) | ✅ 3 families | not one new point |
| the **rubric** within one role | ✅ 3 rubrics | not one new point |
| 🔴 the **ROLE** | ⛔ not until now | **4 blockers** |

⚠️ **and the ordering of that table is the finding.** the two axes I varied enthusiastically are the
two that yielded least, because they re-ask **the same question** with a different voice. only a
change of **role** changes the question.

## .see also

- `…r014-r016._.taken.by_self.second-opinion.md` — the round that varied brain and rubric and found
  the artifact clean, correctly, within its own aperture
- `…r010._.taken.by_self.dimensional-decomposition.md` — the behaver-lane blocker and its repair
