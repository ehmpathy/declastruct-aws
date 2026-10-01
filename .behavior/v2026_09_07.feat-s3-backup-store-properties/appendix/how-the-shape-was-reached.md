# appendix — how the shape was reached

the road behind `1.vision.yield.md`'s decisions. the yield states the outcome; this states the
walk, so the yield need not (`rule.always.yield-the-output-not-the-archaeology`).

no claim here carries load. a reader who accepts the yield's decisions may skip it entirely.

## .the placement question, walked twice

**the shape moved three times before it settled**, and the sequence is the evidence for why the
final answer is right rather than merely last.

| round | shape | what moved it |
|---|---|---|
| the first walk | nested fields on `DeclaredAwsS3Bucket` | the wish's own table implied it. **taken by omission** — F1 and F2 settled each property's *shape* and nobody asked where it should *live* |
| the first council | **separate declared resources** (F10) | a citation audit found `DeclaredAwsS3BucketPolicy` is a separate resource + DAO for `Put/GetBucketPolicy`, and aws models the two new properties identically. `rule.require.symmetry-with-peer-resources` |
| the closure sweep | separate, **and a new fork opened** (F13) | F10 removed the field F11's `null`-means-secure semantic binds to. under an opt-in resource the least-effort path is *declare no block at all*, which reaches the insecure outcome F11 was flipped to prevent |
| 🟢 **the second council** | **nested fields — `versions` + `publicAccessBlock`** | a second peer settles it — see below |

### the peer that settled it, and why the first audit missed it

`DeclaredAwsEc2LaunchTemplate.ts:84` carries `metadataOptions` as a **nested field**, canonicalized
at construction (`:126`), whose own doc states *"a launch template with a null metadataOptions is
created with the secure default"* (`DeclaredAwsEc2InstanceMetadataOptions.ts:9-10`).

⇒ imdsv2 is the same problem shape as the public-access block — a security posture, aws-default
insecure, `null` must mean secure — and this repo had already solved it as a nested field.

🔴 **F2 cited that very file for its SHAPE and stopped there.** the same file settles *placement*
and `null`-*semantics*, and both were left unasked. the citation audit that found F10 read the
policy peer and not this one.

⇒ **two peers, opposite answers, and the discriminator is what the property IS**: a bucket policy is
a document with its own lifecycle, so it earns a resource. a security posture is an attribute of the
resource it protects, so it earns a field. `rule.require.symmetry-with-peer-resources` reaches both
and points where the analogy is closest.

### what the reversal restores, and what it costs

| | restored | cost |
|---|---|---|
| **F11's guarantee** | 🟢 the field exists, so `null` = the secure default binds again. **F13 retires** | — |
| **the write order (I-1)** | 🟢 ours, inside `setS3Bucket` — a code obligation, not a release-note one | — |
| **A-8** | — | 🔴 returns. `getOneS3Bucket` reads both properties to populate the fields, so every consumer needs two new `Get` grants |
| **A-1** | — | 🔴 four required-nullable fields, not two |
| **surface** | 🟢 no new dobjs, no DAOs, no provider registrations, no sdk exports | — |

**the decisive argument is the failure mode of the two costs.** A-8 fails **loud** — an IAM denial
that names the action, on the first plan after upgrade. F13 failed **silent forever** — a public
backup store nobody is told about. a loud cost with a documented remedy outranks a silent one with
none.

## .the detect-the-override design, and why it is unbuilt

between F13 and the reversal, one intermediate design was worked and discarded. it is recorded
because its *mechanics* were verified, and that verification is what settled the placement question.

the design: `setS3Bucket`'s write path reads the live block; **absent** → seed all-four-true;
**present** → treat as the consumer's own override and leave it. no new field.

### what was verified, and why it constrains any future answer

| read | fact |
|---|---|
| `plan.js:71` → `planChanges.js:29` | `getResources()` is consumed **verbatim**; the loop iterates the declared array. `providers[].hooks.beforeAll()` runs *after* the array is captured and its return is discarded |
| `applyChange.js:25-62` | CREATE → `set.findsert`, UPDATE → `set.upsert`, KEEP → **no call at all** |
| `computeChange.js:13-18` | `serialize(omitReadonly(remote)) === serialize(omitReadonly(desired))` |
| `setS3Bucket.ts:45` | `if (foundBefore && input.findsert) return foundBefore` — the write path runs on findsert-miss **and on every upsert** |

⇒ **there is no seam to synthesize an undeclared resource**, and a `readonly` field is stripped from
the compare, so it cannot drive an UPDATE either. ⇒ **with no field on the bucket, an extant bucket
sits at KEEP forever and never receives the block.**

### why it was discarded

- it could secure a bucket only at **create** time — an extant bucket is never touched
- 🔴 it raised **A-5** from blocker-grade to load-carrying: the whole design would key on a correct
  read of the block's absent-signal, so a wrong error name would mis-route the **security** decision
  rather than merely the plan
- the `setS3Bucket.ts:45` read above shows it also needed an explicit `if (!foundBefore)` gate, or a
  tag edit would silently re-block a bucket someone deliberately opened
  (`rule.forbid.hidden-side-effects`)
- the nested field delivers the same guarantee with none of that

## .the drive's one repeat defect

**a fact settled in prose that never reached the structure a rubric reads.** it produced, across the
drive: four case files added after the first walk, one whole absent axis, several stale counts, a
false claim in a diff table, and two revision-trigger predictions that were both wrong.

⇒ **every instance was caught mechanically — a grep, a row count, a glob — and none by an attentive
read.** the check that works: *glob what the artifact counts, grep what it claims, compare.*

### the two sharpest instances

| | what happened |
|---|---|
| **F10/F11 collision** | F11's verdict was propagated to two case files while F10's was forgotten — minutes after the drive wrote *"when a verdict lands, grep the other entries for the premise it just moved."* ⇒ *a defect you have just documented is not a defect you have ceased to commit* |
| **the seven withdrawn asks** | seven fulcrums were handed up that a house rule, the wish's own criterion, or a prior verdict already answered. the wisher sent them back: *"why did you ask me these? most of these you should have been able to research away"*. F7's own entry had already named the class — *unspent research in a fulcrum's coat* — and F7 was handed up regardless |

⇒ **the discriminator the drive had and did not apply is in its own inventory.** F9's entry states
it: a fork is a wisher's when the rules **conflict**, never merely because the driver feels unsure.

### the mirror

the drive handed up **seven** forks a rule already answered, and failed to hand up **one** axis a
wisher genuinely owns (F8's voice). ⇒ **the defect was never "asked too much" — it was asked the
WRONG SET**, and both halves have one cause: the ask was graded on the driver's confidence rather
than on whether a rule reached the fork.

## .questions closed by a fetch that were filed as owed

three items were filed as *"owed externally"* while the instrument to close them had been allowed
the whole time (`WebFetch`, `.claude/settings.json:11-12`):

| item | what one fetch produced |
|---|---|
| **Q-1** — the read-after-write windows | 🔴 **falsified A-2.** the versions put documents a propagation window; the block put documents none at bucket grain. F7's verdict changed |
| **Q-6** — the `ReadOnlyAccess` scope | `s3:Get*` covers both new reads, so case=6 fails at **apply**, never at plan |
| **F7's premise** | the same fetch as Q-1 |

⇒ *file a question only after you have named its instrument and found it absent.*

## .see also

- `../1.vision.yield.md` — the outcome this road reached
- `../archive/` — the shapes considered and rejected
- `../.fulcrums/inventory.of=fulcrums._.md` — the forks, with their verdicts
