# F5 — the cost-leak guard is the typed-out null

**rework** clean · **status** 🟢 **RULED — CONFIRMED by the drive** (2026-09-09) · **confidence** ~~82%~~ → settled · **where** invariant I-3, cell 22,
🔴 **demoed by [c11](../1.vision.experience.case=11.typed-out-null-keeps-all-versions.md)**

🔴 **the gerund exemption this line claimed was RETIRED by the council, 2026-09-09** — aws's own
symbols keep the api's letters; **our field is `versions`**. the axis-B coordinate below is renamed
to match — the council overruled F12 on 2026-09-09.

## .the fork, stated fairly

this is the wish's **headline `.why`**: *"to ship versioning without noncurrent expiry is to ship a
cost leak, and a consumer who declares the first will not discover the second until the bill."*

so: what guards it?

| option | |
|--------|---|
| **(a)** the type already forces the choice — `rule.forbid.undefined-inputs` bars an optional field, so the consumer must write `expireNoncurrentVersionsAfterDays: null` explicitly | zero new code |
| **(b)** warn at plan when versioning is on and noncurrent expiry is null | a log line every plan, forever, on a legitimate config |
| **(c)** forbid the combination | breaks a compliance archive, where keep-all-versions is the point |
| **(d)** default the field to some N when versioning is on | a silent write the consumer never asked for |

## .taken — (a), the typed-out null

## .why, at the time

1. **the pit of success is already paid for.** the house rule
   `rule.forbid.undefined-inputs` means the field cannot be omitted. the consumer types either a
   number or the literal word `null` — a **conscious keep-all-versions decision**, made with
   `versions: 'Enabled'` visible a few lines above. this is `rule.prefer.prevent-over-correct`
   rung 1: the error is designed out by the shape, not reported after the fact.
2. **(c) is wrong on the domain.** a compliance archive genuinely wants every version kept
   forever. a forbid would make the tool refuse a real, correct configuration.
3. **(d) is a silent write.** a default that deletes a consumer's data is the worst outcome in this
   whole wish (`rule.require.safe-by-default` — the destructive act must be deliberate).
4. **(b) is the honest runner-up.** it is rejected on noise, not on principle: a warn that fires on
   a legitimate config, every plan, is a warn that trains people to skim.

## .what makes this checkable rather than a hope

the claim "the type forces it" is falsifiable, and **[c11](../1.vision.experience.case=11.typed-out-null-keeps-all-versions.md)
demonstrates the moment**: its `[t0]` is the compile error, and its `[t1]` is the consumer's answer of
`null` for a legal hold. if the field ever becomes optional, this fulcrum's whole argument collapses —
so the guard on the guard is: **the field must never be optional**.

### 🔴 this section cited the WRONG case for nine rounds, and the correction had already been made elsewhere

⚠️ **found by a pre-hand-off audit of the artifacts' own claims, after both peer lanes had approved.**
this paragraph read *"`case=1`'s narrative demonstrates the moment: vlad pauses on the line because he
cannot leave it out"*. **c1 does no such thing** — its wish declares `expireNoncurrentVersionsAfterDays: 30`,
and no `[tn]` step, narrative beat, or code line in it exercises `null`.

🔴 **and the census had ALREADY caught this exact claim and retracted it.** cell 22 was verdicted
`demoed (c1)`, a review found the demo absent, and the cell was regraded `itemized` — with the reason
written out in full. **the retraction never reached this file.** so for several rounds the census said
*"c1 does not demo this cell and never did"* while the fulcrum entry three directories away still named
c1 as its evidence.

⇒ ***a retraction propagates no better than an addition does.*** every prior instance of this drive's
repeat defect was a **true fact** that failed to reach the structure; this is a **corrected falsehood**
that failed to reach a second site. the check is the same one, and it must run in both directions:
*when a claim is withdrawn, grep for who else invoked it.*

⚠️ **the substantive point survives the correction, which is why it went unnoticed.** F5's argument was
always sound — the type does force the choice. only its *citation* was wrong, and a wrong citation
behind a correct claim is invisible to anyone who checks the claim rather than the citation.

## .rework, and why it is clean

(b) is additive — a warn can be added later with no shape change. (c)/(d) are not, and are
rejected on merit rather than on cost.

## .the verdict

🟢 **CLOSED BY THE DRIVE 2026-09-09 — CONFIRMED (a), the typed-out `null` IS the guard.**

`rule.forbid.undefined-inputs` makes every one of the four fields **required-nullable**, so a
consumer cannot omit one — they must write `null`, and that keystroke IS the conscious choice. the
guard is enforced by the compiler rather than by code we author.

⇒ **this is the same house rule that produces A-1's source break.** the break and the guard are one
mechanism seen from two sides, which is why no additional code is owed.

### 🔴 why the old ask was not a fulcrum at all

it read: *"a wisher may reasonably want more."* that is not a fork between options — it is an open
invitation to add scope, and `rule.prefer.bounded-scope` is the reason not to extend one.

⚠️ **and it inverts the burden.** a fulcrum asks *"which of these two?"*; this asked *"would you
like more?"*, which no answer can close and which the wisher never raised. **the drive manufactured
a question out of its own doubt about sufficiency.**

⇒ option (b) — a runtime warn — stays available and stays **additive**: no shape change, no
consumer break, addable in any later release if the guard proves thin in practice.
