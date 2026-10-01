# inventory.of=fulcrums

design forks best-guessed mid-drive, per `rule.always.defer-fulcrums-to-last` +
`rule.always.itemize-the-fulcrums-you-best-guess`.

🟡 **F1-F18 were taken at the `1.vision` stone; F19 at `5.1.execution`; F20 at `5.3.verification`.**
one register serves the whole drive — a fulcrum is keyed to the call, never to the stage that made it.

🟡 **TWENTY entries — seventeen ruled, one retired, TWO open.** recounted off the rows below
rather than read off the prior headline, per error 7's amendment:

| | which |
|---|---|
| **ruled** (17) | F1 · F2 · F3 · F4 · F5 · F6 · F7 · F8 · F9 · F10 · F11 · F12 · F14 · F15 · **F16** · **F17** · **F18** |
| **retired** (1) | F13 — its premise was removed by the second council; see below |
| 🔴 **open** (2) | **F19** — the orphan-bucket sweep, deferred to a grant that lands in stone 5.1's own halt · **F20** — the iam audit fixture arranges via raw sdk, since the model refuses to create users and keys |

⚠️ **the headline flipped from "NONE open" to "ONE open" on F19's entry.** that is the exact
universal claim error 7 went stale on three times, so the recount ran **before** the line was
rewritten — off the rows, never off the prior count.

🟢 **F16 closed 2026-09-11, inside its window.** it carried the route's only live deadline — the
reshape was clean only until `ahbode/infrastructure#35` binds to `1.12.0`, after which it costs a
second release that breaks source. ⇒ the fourth deadline-bound fork to close in time, after F10, F11,
and F14.

🔴 **F3 is RULED and SUPERSEDED in one line, and the two halves part cleanly.** its *reason* survives
— `rule.forbid.ambiguous-labels` graded `expireAfterDays` ambiguous about **which** subject expires.
its *target name* does not: F16 answers the same ambiguity by a **nest** rather than by a longer
name, so `expireCurrentVersionsAfterDays` becomes `lifecycle.objects.expire`. ⇒ *a rule that forces a
rename does not also pick the shape that satisfies it.*

🟡 **F17 is filed as a fulcrum and is not one** — a blocker-grade house rule (`rule.forbid.any-time`)
already decided it, and the drive wrote `number` anyway. it is recorded so the council sees that a
rule was missed, never merely the corrected field list.

## .the axes the wish handed over

the wish states outright: *"the HOW is yours — advisory only"*, and names two shapes as undecided
(`versions`, public-access block). F1 and F2 answer those two. the rest surfaced from the walk.

## .the summary

| case | title | rework | status | confidence |
|------|-------|--------|--------|------------|
| [F1](inventory.of=fulcrums.case=F1-versions-shape-is-the-aws-union.md) | `versions` is `'Enabled' \| 'Suspended' \| null`, not a boolean | clean | 🟢 **RULED — CONFIRMED; the WISH answers it** | settled |
| [F2](inventory.of=fulcrums.case=F2-public-access-block-models-all-four-booleans.md) | the public-access block models all four booleans + a preset const — **diverges from the wish's advisory** | clean | 🟢 **RULED — CONFIRMED; F11 emptied option (a)** | settled |
| [F3](inventory.of=fulcrums.case=F3-expire-after-days-keeps-its-name.md) | ~~`expireAfterDays` keeps its name~~ → ~~`expireCurrentVersionsAfterDays`~~ → **`lifecycle.objects.expire`** | clean now, dirty once `#35` binds | 🟡 **RULED — FLIPPED by `forbid.ambiguous-labels`, then SUPERSEDED by F16: the reason held, the target name did not** | settled |
| [F4](inventory.of=fulcrums.case=F4-inert-noncurrent-expiry-is-allowed.md) | noncurrent expiry on an unversioned bucket is allowed, inert — not forbidden | clean | 🟢 **RULED — CONFIRMED; F5 had struck both alternatives** | settled |
| [F5](inventory.of=fulcrums.case=F5-cost-leak-guard-is-the-typed-null.md) | the cost-leak guard is the forced typed-out `null`, not a new warn | clean | 🟢 **RULED — CONFIRMED; `rule.forbid.undefined-inputs`** | settled |
| [F6](inventory.of=fulcrums.case=F6-widen-the-extant-stability-poll.md) | widen the extant stability poll rather than add one per property — **and throw on deadline** | clean | 🟢 **RULED — CONFIRMED; `rule.forbid.failhide`** | settled |
| [F7](inventory.of=fulcrums.case=F7-no-preemptive-poll-for-bucket-level-puts.md) | the two bucket-level puts **split** — versions polls, the block reads back direct | clean | 🟢 **RULED — CONFIRMED; the FETCH retired it** | settled |
| [F8](inventory.of=fulcrums.case=F8-richer-errors-than-the-withassure-precedent.md) | the errors are richer than the `withAssure` precedent the wish cites | clean | 🟢 **RULED on BOTH axes — metadata confirmed, the voice axis closed on a measurement** | settled |
| [F9](inventory.of=fulcrums.case=F9-partial-block-throws-rather-than-falls-back.md) | a partial public-access block **throws**, where the peer precedent falls back per-sub-field | clean | 🟢 **RULED — overruled to (b), FALL BACK PER-SUB-FIELD** | settled |
| [F10](inventory.of=fulcrums.case=F10-nested-fields-rather-than-separate-resources.md) | the two bucket properties are **nested fields** vs **separate resources + DAOs** | 🔴 clean now, dirty after ship | 🟢 **RULED — NESTED FIELDS. reversed once, then restored by the second council** | settled |
| [F11](inventory.of=fulcrums.case=F11-public-access-block-null-means-unblocked-not-secure.md) | `publicAccessBlock: null` means **unblocked**, where the peer imdsv2 control makes `null` mean **the secure default** | clean now, dirty after ship | 🟢 **RULED — overruled to (b), the SECURE DEFAULT** | settled |
| [F12](inventory.of=fulcrums.case=F12-versions-rename-deferred-to-the-shape-rewrite.md) | the `Versions` rename **rides F10's shape rewrite** rather than lands now | clean | 🟢 **RULED — overruled: the rename LANDS NOW** | settled |
| [F13](inventory.of=fulcrums.case=F13-f10-opt-in-resource-voids-f11-safe-default.md) | F10's opt-in resource voids the safe-default F11 was flipped to secure | — | ⚫ **RETIRED — the premise is gone. nested fields give F11's `null` a site again** | — |
| [F14](inventory.of=fulcrums.case=F14-public-access-field-name.md) | the field's NAME — ~~`publicAccessBlock`~~ → **`access: { public }`**, sub-fields drop the word too | clean now, dirty after ship | 🟢 **RULED — overruled to (b); the sub-field drop spent (a)'s last argument** | settled |
| [F15](inventory.of=fulcrums.case=F15-public-takes-false-rather-than-null.md) | the secure posture's TOKEN — ~~`public: null`~~ → ~~`false`~~ → **`public: 'blocked'`**; `access` becomes required non-nullable | clean | 🟢 **RULED by the wisher — the drive ran the wisher's own criterion one notch deeper; `'blocked'` taken in one turn** | settled |
| [F16](inventory.of=fulcrums.case=F16-lifecycle-decomposes-by-what-expires.md) | the lifecycle fields reshape by **what expires** — `{ objects, versions, multiparts }`, and `versions: false \| {status, expire}` forces the guard | clean until `#35` binds | 🟢 **RULED — the drive's full recommendation taken verbatim; carries THREE sub-calls** | settled |
| [F17](inventory.of=fulcrums.case=F17-durations-take-isoduration-not-bare-days.md) | the expiry fields take **`{ days: number }`** — a narrowed `IsoDuration`; `AfterDays` stops to be a legal suffix | clean until `#35` binds | 🟢 **RULED — the type was never open (`rule.forbid.any-time`); the council then NARROWED it, which retired the canonicalizer and the throw** | settled |
| [F18](inventory.of=fulcrums.case=F18-version-expiry-takes-a-count-beside-its-age.md) | `versions.expire` takes a **COUNT beside its age** — `{ after, keep }`, as a union so *neither* is untypeable | clean | 🟢 **RULED by the wisher — `keep` over the drive's `over`; the count is a FLOOR, on aws's own word** | 71% |
| [F19](inventory.of=fulcrums.case=F19-orphan-bucket-sweep-deferred-to-the-grant.md) | the orphan-bucket sweep is **deferred** — its `s3:ListAllMyBuckets` grant lands in the same two-tree apply stone 5.1 is halted on | clean | 🔴 **OPEN — the drive's own deferral call; no council has ruled it** | 90% |
| [F20](inventory.of=fulcrums.case=F20-iam-audit-fixture-arranges-via-raw-sdk.md) | the iam audit fixture **arranges its user + key via raw sdk** — the model refuses a declared create for both | clean | 🔴 **OPEN — the drive's call against a peer blocker; no council has ruled it** | 85% |

## 🔴 .F10 walked three times, and the third answer is the first one

| round | shape | what moved it |
|---|---|---|
| the first walk | nested fields | the wish's table implied it. **taken by omission** |
| the first council | separate resources | a citation audit found `DeclaredAwsS3BucketPolicy` is a separate resource + DAO |
| 🟢 **the second council** | **nested fields, restored** | a second peer — `DeclaredAwsEc2LaunchTemplate.metadataOptions` — is a nested field for the same problem shape, and the wisher proposed the same |

⇒ **the discriminator is what the property IS**: a bucket policy is a document with its own
lifecycle, so it earns a resource. a security posture is an attribute of the resource it protects,
so it earns a field. `rule.require.symmetry-with-peer-resources` reaches both peers and points where
the analogy is closest.

⇒ 🔴 **F13 retires with it.** it existed only because F10 removed the field F11's `null`-means-secure
semantic binds to. the field is back, so the collision is gone — **no detection mechanism, no
reserved tag key, no release-note obligation.**

⇒ the road, and what the reversal costs (A-8 returns, A-1 returns to four fields):
`../appendix/how-the-shape-was-reached.md`.

## .who ruled them

| ruled by | count | which |
|---|---|---|
| the **council** — a wisher's call | 9 | F8 (metadata axis), F9, F10, F11, F12, F14, **F15**, **F16**, **F18** |
| the **drive** — closed on evidence it already held | 9 | F1, F2, F3, F4, F5, F6, F7, F8 (voice axis), **F17** |
| **retired**, never ruled | 1 | F13 |
| 🔴 **nobody yet** | **2** | **F19**, **F20** |

⚠️ **21 items over 20 entries — F8 is counted twice, once per axis.** the arithmetic is stated
because it does not self-evidently balance.

🟡 **F16 is filed under the council and the drive wrote every word it decided.** the wisher's ruling
was *"this looks good"* on a shape the drive recommended — so **authorship and authority are
different axes**, and this column tracks authority. ⇒ the mirror of F14, where the wisher supplied
the frame the drive could not.

🟡 **F15 was absent from this table for a full round**, ruled in the summary row and uncredited
here. ⇒ the table is a second enumeration of the same set, so it drifts from the first whenever an
entry lands — `rule.forbid.itemization-without-coordinates`'s exact hazard, and the reason a census
is a `Glob` rather than a read.

🔴 **seven of the drive-closed entries were first handed UP as wisher questions**, and a wisher sent
them back:

> *"why did you ask me these? most of these you should have been able to research away"*

each closed on a **file read, a house rule, or the wish's own decisive criterion** — every one of
which was in hand when the question was written. `howto.navigate-fulcrum-choices` states the test:
*a fulcrum impliedly answered by the wish or a rule — take that answer, it was never a fulcrum.*

| what settled each drive-closed entry | which |
|---|---|
| a **house rule**, blocker-grade | F3 (`forbid.ambiguous-labels`), F5 (`forbid.undefined-inputs`), F6 (`forbid.failhide`) |
| the **wish's own acceptance criterion** | F1, F2 |
| **another fulcrum's verdict**, already issued | F2 (via F11), F4 (via F5) |
| a **fetch already spent** | F7 |
| a **measurement of the extant package** | F8's voice axis |

⇒ **the mirror**: seven forks a rule already answered were handed up; F8's voice axis, which a wisher
genuinely owned, was not. **the defect was never *asked too much* — it was asked the WRONG SET.**

## 🟢 .F8's voice axis — closed 2026-09-09, on a measurement

the demos rendered thrown TypeScript errors in the voice of bash-skill stdout. the drive measured
the package rather than ask:

| measured in `src/` | count |
|---|---|
| `🐢` / a bash-skill voice in a thrown error | **0** |
| `helpful-errors` throws | **23 across 10 files** |

⇒ `rule.require.symmetry-with-peer-resources` reaches it unopposed. **taken: v1 — message plus
serialized metadata**, which keeps the richness F8's metadata axis won at no new formatter.

## 🔴 .the naming verdict — `Versions`, never the gerund

> *"except Versions ; instead of 'Versioning'"*

| what | the word | why |
|------|----------|-----|
| **aws's sdk commands** — `GetBucketVersioning`, `PutBucketVersioning` | ⚠️ unchanged | we do not own them; they are the api's own symbols |
| **our declared field + its status union** | 🟢 `versions` / `DeclaredAwsS3BucketVersionsStatus` | we own them, so the house rule applies — no gerund, no exemption |

🟢 **the conform is APPLIED** across every live route artifact.

⚠️ **the lesson is sharper than the rename.** the vision claimed an *exemption* to a house rule in
the first line of its first artifact, repeated it across three files, and never asked whether a
non-gerund noun existed. **`Versions` was available the whole time.** ⇒ *an exemption claimed for a
name you own is a question you failed to ask.*

## .the confidence column, re-derived off the rows

- 🟢 **no entry at 88% or above was reversed** — F7 (88), F6 (90), F2 (93), F1 (95) all confirmed.
  ⚠️ **F19 (90) sits in this band and is neither** — it is unruled, so it is evidence for nothing
  here. ⇒ the band's claim is about entries a council **read**; an open entry cannot confirm it
- 🔴 **three of the four at 74% or below were** — F11 (68), F9 (72), F10 (74); F8 (72) held
- the two reversals in the middle band are **F3 (80)** and **F12 (85)**

⇒ **the column sorted the design forks correctly.** it could not sort **F12**, whose subject was the
driver's own conduct rather than the product's shape — its figure graded a *judgment about cost*,
and the cost estimate was the part that was wrong.

🟡 **F18 enters at 71%, the second-lowest figure on the table, and its reason is NAMED rather than
vague**: the shape's `{ days: null, keep: number }` arm rests on an aws behaviour no held source
states, and **A-10 is the exact observation that would settle it**. 🟢 **A-10 was settled 2026-09-21
and the arm holds** — so the figure would now read higher. ⚠️ it is left at 71 deliberately: the
column records confidence **at the moment of the call**, and to raise it after the evidence landed
would erase the very signal this section derives. ⇒ *a low figure with a named settler is a research
item; a low figure with no settler is a guess.* the band that got reversed (≤74) is populated
entirely by the second kind.

🟢 **and A-10's closure is the strongest evidence for that line yet** — the named settler was reached
in one fetch, at `5.1.execution`, and it **confirmed** the arm. ⚠️ with a sharper edge than the line
states: the settler had been filed as *unreachable* by the very instrument that closed it, so the
figure was low for a reason that was itself a mis-measurement. ⇒ *a named settler earns a low figure
its patience; it does not excuse a failure to reach for it.*

## .what is still owed

🟡 **TWO fulcrums are owed — F19 and F20, and no other.** every vision-stage fork is ruled; F19 was
raised at `5.1.execution`, F20 at `5.3.verification`. what sits beside them is propagation and
execution work, none of it a fork:

| owed | who closes it | when |
|---|---|---|
| 🔴 **F19's verdict** — the orphan-bucket sweep, deferred to an `s3:ListAllMyBuckets` grant that lands in the **same two-tree apply stone 5.1 is already halted on**. ⚠️ the cheap read that would size the leak first is one the drive cannot run — the enumeration IS the ungranted action | a **human** with demo creds: `aws s3api list-buckets --query "Buckets[?starts_with(Name, 'declastruct-test-s3-')].Name"` | after the grove merge + the `account=demo` apply |
| 🔴 **F20's verdict** — keep the raw-sdk arrange for the iam audit tests, or extend the model with a declared user + key create the library currently refuses | a **wisher** — it turns on a product stance, not a code fact | the fulcrum council |
| 🟢 ~~**F16's propagation**~~ | 🟢 **DONE 2026-09-11** — every demo, the census, the dimensions. 🔴 **it found five things the verdict did not name**, two of them costs: `c8`'s fix line is destructive in one cell, and the stability poll must key per-KEY | — |
| 🟢 ~~**F17's propagation**~~ | 🟢 **DONE 2026-09-11** — swept with F16, as one pass. 🟡 **it narrowed the input-limit edge without a close**: the unit is fixed, `{ days: 0 }` and `{ days: -1 }` still type-check, so the guard is owed at **three** sites rather than two | — |
| 🟢 ~~**F16 sub-call 3's `.note`**~~ | 🟢 **DONE at execution** — `DeclaredAwsS3BucketLifecycleMultiparts.ts` carries it at **both** grains: the class `.note` (`:10-14`) and the field `.note` (`:17-21`). all three obligations met — it names `AbortIncompleteMultipartUpload`, scopes to *in-progress parts only*, and points a completed upload at `objects.expire` | — |
| 🟢 ~~**F15's propagation**~~ | 🟢 **DONE** — `public: null` → `'blocked'` swept across every live artifact 2026-09-10 | — |
| 🟢 ~~**a dream** — `NoncurrentVersionTransitions`, the fourth cell of F16's 2×2~~ | 🟢 **CAUGHT** — `.dream/v2026_09_10.feat.model-noncurrent-version-transitions.md`, symlinked at `dreams/` | — |
| 🟢 ~~**F14's THREE-LEVEL hydration**~~ | 🟢 **DONE at execution, with ONE half of the ask deliberately not built.** `static nested` holds at every depth — `DeclaredAwsS3Bucket` → `…Access` → `…PublicAccess` → `…PublicAccessAcls`/`…Policies`. ⚠️ **no `.strict()` schema was added, and none is owed**: `howto.domain-objects-nested-unions` requires one only for a **multi-option** nested (`key: [ClassA, ClassB]`), and every key here maps to exactly one class — `'blocked'` and `false` are bare scalars domain-objects skips, never rival dobj arms. ⇒ *the vision over-specified the remedy from the shape of the union, and the union was never the disambiguation kind.* clamped by `DeclaredAwsS3Bucket.serialize.test.ts`, which goes **red** without the nested declarations | — |
| 🟢 ~~**F18's A-10**~~ | 🟢 **CLOSED 2026-09-21 by a DOC READ — and the row's own premise was wrong.** it read *"not closable by a doc read, same class as A-5 and A-6"*; the s3 user guide states the constraint outright. ⚠️ **and the constraint is not the one A-10 asked about**: a `keep`-only rule is accepted, **provided a `<Filter>` element is present** — *"you must also provide a `<Filter>` element … Amazon S3 generates an `InvalidRequest` error"*. ✅ `putBucketLifecycle.ts:84` sends `Filter: { Prefix: '' }` unconditionally, so this holds today. a `.note` now pins it at that line, since a future edit that makes the Filter conditional would break every `keep` declaration | — |
| 🟢 ~~**F18's combined semantics**~~ | 🟢 **SETTLED 2026-09-21** — an **AND**, never independent axes: *"For the deletion to occur, both the `<NoncurrentDays>` **and** the `<NewerNoncurrentVersions>` values must be exceeded."* ⇒ `keep` IS a floor `after` cannot cross. the `.note` landed on `DeclaredAwsS3BucketLifecycleVersions`, and it corrects a **misread the doc-comment invited**: `{ after: {days:30}, keep: 5 }` reads as two rules, so a reader expects a 40-day version deleted — it is **retained** if it is among the 5 newest | — |
| **F7's measurement** — was an immediate `GetBucketVersioning` ever stale, and for how many reads? | an integration test `rule.require.test-coverage-by-grain` already grades a **blocker** | execution |
| ~~**F4's revisit**~~ | 🟢 **subsumed by F16** — proposal 5 makes F4's question unrepresentable | — |

## .the through-lines worth carrying to `2.1.criteria`

- 🔴 **a peer file cited for ONE question can settle three.** `DeclaredAwsEc2InstanceMetadataOptions`
  was cited by F2 for *shape*; the same file settles *placement* (F10) and `null`-*semantics* (F11).
  both were found late, by a read of a file the vision had already quoted.
- 🔴 **a verdict re-grades its neighbours' REASONS, and only verdicts are tracked.** counted:
  F11 → F2's option space · F11 → c9 · F10 → A-8 · F10 → F4's adjacency reason · F5 → F4's two
  alternatives · **the second council → F13's whole premise** · **F16 → F3's target name and F4's
  representability.** the check is mechanical and was run late: *when a verdict lands, grep the other
  entries for the premise it just moved.*
- 🔴 **F16 splits a verdict from its reason, and only one half travels.** F3's rule-citation
  (`forbid.ambiguous-labels`) is as live as the day it landed; F3's **answer** to it is dead. ⇒ a
  supersession check that greps for the *verdict* finds F3 and reads it as settled. **grep for the
  reason, and ask whether a newer entry answers it differently.**
- 🔴 **a fork is a wisher's when the rules CONFLICT** — never merely because the driver feels unsure.
  F9 qualified (`forbid.failhide` vs `symmetry-with-peer-resources`); F14 qualified (an ergonomics
  preference no rule reaches). seven entries had a rule that reached them unopposed and were handed
  up anyway.
- 🔴 **F14 is the case for handing a genuine preference UP.** the drive's 76% guess rested on one
  argument — that `access.public.blockPublicAcls` says *public* three times. **the wisher did not
  choose between the two options; they removed the objection**, by a drop of the word from the
  sub-fields the drive had treated as fixed because aws names them. ⇒ *a driver weighs the options
  it framed; a wisher can change the frame.* the drive had graded aws's sub-field names
  un-droppable under `require.ubiqlang` and never tested that premise.
- **F10 is the only fulcrum decided by OMISSION rather than by a weighed fork.** F1 and F2 reasoned
  about each property's *shape* and never asked where it should *live*. ⇒ **a fork you never framed
  cannot be flagged as low-confidence**, which is why it went nine rounds unnoticed while
  lower-confidence forks were re-examined repeatedly.

## .see also

- `../1.vision.yield.md` — the vision these forks sit inside
- `../appendix/how-the-shape-was-reached.md` — the road behind F10's three walks, and the drive's own defects
- `../archive/shapes-considered-and-rejected.md` — the shapes weighed and not taken
- `rule.always.defer-fulcrums-to-last` · `rule.always.itemize-the-fulcrums-you-best-guess`
