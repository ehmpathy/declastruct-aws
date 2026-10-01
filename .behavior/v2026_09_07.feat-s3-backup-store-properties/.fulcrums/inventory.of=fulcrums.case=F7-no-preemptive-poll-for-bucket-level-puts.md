# F7 — no pre-emptive poll for the two bucket-level puts

**rework** clean · **status** 🟢 **RULED — CONFIRMED by the drive** (2026-09-09) · **confidence** ~~88%~~ → settled · **where** `setS3Bucket`

⚠️ **the premise this fulcrum was blocked on has been FETCHED.** it was recorded at 70% with the
reason *"we did not check"* — and the check has now been made. the answer **splits the two puts**,
which is why the taken option changed.

🔴 **the gerund exemption this line claimed was RETIRED by the council, 2026-09-09** — aws's own
symbols keep the api's letters; **our field is `versions`**. the axis-B
coordinate below is renamed to match — the council overruled F12 on 2026-09-09.

## .the fork, stated fairly

`PutBucketLifecycleConfiguration` demonstrably has a read-after-write window — the extant poll
loop and its comment are the evidence. **do `PutBucketVersioning` and `PutPublicAccessBlock` have
one too?**

| option | |
|--------|---|
| **(a)** assume no window; read back directly. add a poll later if ci flakes | least code; risks the exact phantom-UPDATE this vision spent a case on |
| **(b)** poll all three writes for stability, pre-emptively | uniform; costs seconds per apply on a window that may not exist |
| **(c)** verify against aws first, then decide | correct; costs a research round now |

## .taken — (c), then (b) for versioning and (a) for the block

**the research round was taken.** it cost two doc reads and it changed the answer, so the round
paid for itself. the two puts are **not symmetric**, and a uniform call in either direction would
have been wrong for one of them.

| put | aws's documented consistency | taken |
|-----|------------------------------|-------|
| `PutBucketVersioning` | ⚠️ **a window is documented** — see the quote below | **(b)** poll for stability |
| `PutPublicAccessBlock` (bucket-level) | **no window documented** on either the Put or the Get reference page | **(a)** read back directly |

## .the evidence — fetched, quoted, cited

### `PutBucketVersioning` — a window, stated by aws in its own words

> *"When you enable versioning on a bucket for the first time, it might take a short amount of time
> for the change to be fully propagated. While this change is propagating, you might encounter
> intermittent HTTP 404 NoSuchKey errors for requests to objects created or updated after enabling
> versioning. We recommend that you wait for 15 minutes after enabling versioning before issuing
> write operations (PUT or DELETE) on objects in the bucket."*
>
> — `docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketVersioning.html`

**this falsifies assumption A-2 as it was written.** the vision assumed no meaningful window on
either bucket-level put; aws documents one on this one.

⚠️ **note the scope of that quote — it is narrower than it first appears, and the narrowness is the
whole reason (b) is cheap rather than catastrophic.** the documented symptom is `404 NoSuchKey` on
**object** reads, and the 15-minute recommendation is a wait before **object writes**. it says a
versioning change propagates non-instantly; it does **not** say `GetBucketVersioning` reads back
stale, and it does **not** oblige a 15-minute apply.

so the honest read is: **a propagation window provably exists for this subsystem, and aws does not
bound how it manifests on the metadata read.** that is exactly the condition under which `case=5`'s
phantom UPDATE is possible, and it is no longer speculative.

### `PutPublicAccessBlock` — no window, at the grain we use

both reference pages were read in full. neither the Put nor the Get page contains any sentence
about propagation, consistency, delay, or "take effect".

the **one** propagation statement in the whole block-public-access user guide is scoped to a level
we do not declare:

> *"When you apply block public access settings to an **account**, the settings apply to all AWS
> Regions globally. The settings might not take effect in all Regions immediately or
> simultaneously, but they eventually propagate to all Regions."*
>
> — `docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html`

🔴 **that is an ACCOUNT-level, cross-region claim. we declare a BUCKET-level block.** the
distinction is the find: had the sentence been read carelessly it would have argued for (b) on both
puts, and the second poll would have been latency spent on a window that the docs do not claim
exists at our grain.

## .why the confidence is 88% and no higher

| settled | still open |
|---------|-----------|
| a versioning propagation window **exists** — aws says so, cited above | aws does not state whether it manifests on `GetBucketVersioning` specifically, only on object reads |
| the public-access block has **no** documented window at bucket grain | absence of a documented window is not proof of absence — it is merely the best evidence available |
| the taken option is now **evidence-led** rather than assumed | the poll's exact predicate + deadline for versioning is an execution detail, not settled here |

the residual 12% is the gap between *"aws documents a window for this subsystem"* and *"aws
documents that this specific read goes stale"*. **the call holds under either read** — (b) is
correct whether or not the window reaches the metadata read, because a poll that guards a window
which turns out not to reach it costs bounded latency, while its absence costs `case=5`.

## 🔴 .how the residual closes — with an instrument this wish already owes

⚠️ **added by the `has-questioned-requirements` self-review.** the table above says the docs are
*"the best evidence available"*. that is true **of the docs**, and the docs are not the only
instrument on the table.

`rule.require.test-coverage-by-grain` grades an absent integration test for a communicator a
**blocker**, and `putBucketVersioning` is one of the new communicators. ⇒ **this wish already owes,
at blocker severity, a live test that writes a versioning state and reads it back.** that is exactly
the observation the 12% asks for, and it costs zero extra.

so the residual is a **measurement deferred to execution**, not a permanent unknown. the specific
item for that test to record:

> after `PutBucketVersioning` returns, was an **immediate** `GetBucketVersioning` ever stale — and
> if so, how many consecutive reads did stability take?

with that on record a later drive can drop or keep the poll on **evidence** rather than on this
fulcrum's inference. ⚠️ **it does not change the taken option** — a ship without the poll on an
unmeasured window is exactly `case=5`, so (b) stands now and the measurement informs later.

⇒ this is the same shape as **Q-1**, which the vision records as *"filed as owed-externally without
a check that the tool to answer it was available"* — and the fetch, once spent, **falsified A-2**. an
open question worth a file entry is worth one look at whether an instrument to close it is already
paid for.

## .why this is no longer the lowest-confidence call

it was flagged **read this one first** precisely because its reason was an unfetched premise. that
reason is retired: the fetch was spent, it split the two puts, and it falsified A-2.

🔴 **the one fork left to read is F14 — on its SHIP DEADLINE, not on confidence.** its reversal
window closes when a consumer binds the field name; every other fork here is ruled.

⇒ **the rank order that belongs in a fulcrum file is the DEADLINE order, never the confidence
order.** this file's rank line was re-derived four times as entries landed, and every one of those
re-derivations sorted on the wrong column.

## .the poll for versioning rides F6's widened shape

F6 already widens the lifecycle poll from a `transitions.length` compare to a whole-rule compare.
the versioning poll is the same shape over a smaller value — read until `Status` reads back equal
to desired, N consecutive times, then **throw on deadline** rather than return the stale read. no
new mechanism is introduced by this fulcrum.

## .rework, and why it is clean

a poll added or removed later changes no shape and breaks no consumer. the two puts are polled
independently, so a later reversal on either one is a local edit.

## .the verdict

🟢 **CLOSED BY THE DRIVE 2026-09-09 — CONFIRMED. the FETCH retired it; leaving it open was a
leftover state, not a live question.**

### its own diagnosis names why it was never a council item

this file already records the general rule, in `.why this is no longer the lowest-confidence call`:

> *a fork whose reason is "we did not check" is not a fork at all — it is unspent research wearing a
> fulcrum's coat, and the council is the wrong place for it.*

⇒ 🔴 **the drive wrote that sentence, spent the research, and then handed the entry up anyway.** the
`(open)` marker was a state the file had already invalidated three sections above it.

### the one residual the marker named — and why it is not a wisher call either

it read: *"the council's residual judgment is whether the versioning poll's cost is acceptable."*
that is settled by the wish, not by a wisher:

| | poll (b) | no poll (a) |
|---|---|---|
| cost if the window does **not** reach the metadata read | bounded latency, a few seconds per apply | none |
| cost if it **does** | none | 🔴 `case=5`'s phantom UPDATE — a **permadrift** |

the wish's decisive criterion is *"a plan → apply → plan converges to KEEP."* a permadrift violates
it outright; seconds of latency does not. **the asymmetry is total, so there is no trade to weigh.**

### what remains is a MEASUREMENT, already owed at blocker severity

`rule.require.test-coverage-by-grain` grades an absent integration test for a communicator a
**blocker**, and `putBucketVersioning` is a new communicator. so the observation that would close the
residual 12% — *was an immediate `GetBucketVersioning` ever stale, and for how many reads?* — is
**already paid for** by a test this wish cannot ship without.

⇒ ⚠️ **an open item whose instrument is already funded is not an open item; it is a scheduled
reading.** record it at execution; a later drive drops or keeps the poll on evidence.

### 🔴 the one thing this fulcrum should be re-read for, and it is not the poll

**A-2 is falsified and the yield must say so in the register a reviewer reads**, not only in this
file's prose. aws documents a propagation window for `PutBucketVersioning`; the vision assumed none
on either bucket-level put. that is the durable output of the fetch — the poll is merely what
follows from it.
