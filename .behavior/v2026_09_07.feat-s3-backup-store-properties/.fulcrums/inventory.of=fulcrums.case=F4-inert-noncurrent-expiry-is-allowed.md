# F4 — an inert noncurrent expiry is allowed

**rework** clean · **status** 🟢 **RULED — CONFIRMED by the drive** (2026-09-09) · **confidence** ~~85%~~ → settled · **where** invariant I-2

🔴 **the gerund exemption this line claimed was RETIRED by the council, 2026-09-09** — aws's own
symbols keep the api's letters; **our field is `versions`**. the axis-B
coordinate below is renamed to match — the council overruled F12 on 2026-09-09.

## .the fork, stated fairly

what happens when a consumer declares `expireNoncurrentVersionsAfterDays: 30` on a bucket whose
`versions` is `null`? aws accepts the rule; it simply never fires, because an unversioned bucket
holds no noncurrent versions.

| option | |
|--------|---|
| **(a)** allow it, inert | matches aws; a consumer can pre-declare before an enable |
| **(b)** reject at plan | catches a probable typo; blocks a legitimate two-step rollout |
| **(c)** warn at plan | catches it without a block; adds a log line every plan, forever |

## .taken — (a), allow, inert

## .why, at the time

1. **the mistake is barely reachable.** both fields sit in **one object literal, in one file, in
   view of each other**. `rule.forbid.undefined-inputs` forces `versions: null` to be typed out
   two lines above. a consumer who writes both has already looked at both.
2. **(b) forbids a legitimate move.** "declare the lifecycle now, enable versioning next sprint"
   is a normal rollout. a reject would make the tool wrong about aws.
3. **(c) costs a warn on every plan of every unversioned bucket that pre-declares** — and a warn
   nobody can silence becomes a warn nobody reads (`rule.forbid.surprises`, in the noise sense).
4. `freq × cost`: low frequency (the fields are adjacent), low cost (an inert rule bills no money
   and blocks no path) → **alterpath**, per `define.experience._.axis=care`.

## .the counter, honestly

(b) would be right if the two fields were far apart — different files, different objects. if the
model ever splits the lifecycle into its own declarable resource, revisit this.

## .rework, and why it is clean

a guard added later is additive: no shape changes, no consumer breaks. the only cost of the wrong
call today is an inert rule in someone's bucket.

## .the verdict

🟢 **CLOSED BY THE DRIVE 2026-09-09 — CONFIRMED (a), allow it, inert.**

⚠️ **it was put to the wisher and should not have been. F5 had already ruled both of its
alternatives, on the same reasoning, one file away.**

### the two rejected options were rejected in F5, verbatim

F5 faced the identical shape — *"a legal-but-suspicious combination of two lifecycle fields"* — and
its closure struck (c) *forbid* and (b) *warn* with reasons that transfer with no change:

| option here | F5's ruling on its twin |
|---|---|
| **(b)** reject at plan | *"a forbid would make the tool refuse a real, correct configuration"* |
| **(c)** warn at plan | *"a warn that fires on a legitimate config, every plan, is a warn that trains people to skim"* |

⇒ **so the only live question was whether pre-declared expiry is a legitimate config, and aws
settles it: aws accepts the rule.** a declarative mirror that refuses what aws accepts is not
stricter than aws — it is **wrong about aws**, and it cannot converge, because the consumer's
declared state is legal and the tool will not plan it.

### the rule that settles it

`rule.forbid.surprises` (ergonomist) — a reject on a configuration the provider accepts is the
exact astonishment the rule names. and the shape here is the one the same house rule already
sanctions: **the type forces both fields to be typed out in one literal, in view of each other**
(`rule.forbid.undefined-inputs`), which is `rule.prefer.prevent-over-correct` rung 1 — the
combination is *seen* by construction, so there is nothing left to police at rung 3.

⇒ **F4 and F5 are one call applied to two fields.** to rule them apart would put two different
answers on one question in one release.

### 🟢 the adjacency reason — moved, then moved back

the entry's own counter holds: *"(b) would be right if the two fields were far apart."* 🟢 **F10's
final verdict keeps them adjacent.** `versions` and `lifecycle` are both nested fields on
`DeclaredAwsS3Bucket`, one literal apart, so reason 1 stands exactly as written.

⚠️ **it was briefly false.** the first council split the two bucket properties into separate declared
resources and the adjacency argument went with them; the second council restored the nested shape,
and the argument returned. ⇒ 🔴 *a verdict re-grades its neighbours' REASONS, and a reversal
re-grades them back* — **neither move shows in a `status` column**, which is why the inventory carries
the sweep as a through-line rather than a one-off.

⇒ the entry's own trigger — *"if the model ever splits the lifecycle into its own declarable
resource, revisit this"* — **is unfired.** the revisit at `2.1.criteria` is now a confirmation, not a
re-open.
