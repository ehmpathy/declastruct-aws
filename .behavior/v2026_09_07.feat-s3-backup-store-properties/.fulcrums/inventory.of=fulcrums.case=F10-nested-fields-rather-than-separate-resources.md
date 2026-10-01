# F10 — nested fields on the bucket, rather than separate declared resources

**rework** clean **now**, dirty **after ship** · **status** 🟢 **RULED 2026-09-09 — NESTED FIELDS** ·
**confidence** ~~74%~~ → settled
**where** F1 + F2's placement — `DeclaredAwsS3Bucket`'s field list

🔴 **this fork was walked three times and the third answer is the first one.** the drive best-guessed
nested; the first council overruled to separate resources; the second council restored nested. the
sequence is the evidence for why the final answer is right rather than merely last —
`../appendix/how-the-shape-was-reached.md`.

## .the fork, stated fairly

both bucket-level properties are added as **fields on `DeclaredAwsS3Bucket`**. the alternative — a
**separate declared resource per property**, each with its own DAO:

```
DeclaredAwsS3BucketVersions          + Dao   # Put/GetBucketVersioning
DeclaredAwsS3BucketPublicAccessBlock + Dao   # Put/GetPublicAccessBlock
```

🔴 **this repo holds BOTH patterns for bucket-scoped config with its own `Put`/`Get` api pair**, and
no brief stated which one a new property should take:

| dobj | own DAO? | aws api | modeled as |
|------|----------|---------|-----------|
| `DeclaredAwsS3BucketPolicy` | ✅ `DeclaredAwsS3BucketPolicyDao.ts` | `Put/GetBucketPolicy` | **a separate resource**, holds `bucket: RefByUnique<…>` |
| `DeclaredAwsS3BucketLifecycle` | ❌ none | `Put/GetBucketLifecycleConfiguration` | **a nested literal** on the bucket |
| `DeclaredAwsEc2InstanceMetadataOptions` | ❌ none | (part of the launch template) | **a nested literal** on `DeclaredAwsEc2LaunchTemplate` |

⚠️ **the vision decided this by omission.** F1 and F2 argued the *shape* of each property carefully
and **neither asked where the property should live.** the wish's table lists `DeclaredAwsS3Bucket` in
its "on" column, and that was read as settled.

## .the options

| option | |
|--------|---|
| **(a)** nested fields on `DeclaredAwsS3Bucket` | one resource per bucket; one plan line; one declaration for a consumer |
| **(b)** a separate `DeclaredAwsX` + DAO per property | symmetry with `DeclaredAwsS3BucketPolicy`; independent plan lines, IAM surfaces, failure isolation |

## 🟢 .taken — (a), nested fields

```ts
DeclaredAwsS3Bucket.as({
  name: 'ahbode-camp-git-backup',
  versions: 'Enabled',
  publicAccessBlock: null,   // null = the secure default — F11
  lifecycle: { … },
  tags: { … },
});
```

⚠️ the two **lifecycle** sub-rules are untouched by this fork — they ride
`DeclaredAwsS3BucketLifecycle`. F10 governs only the two bucket-level properties.

## 🔴 .the peer that settled it, and why the first audit missed it

`DeclaredAwsEc2LaunchTemplate.ts:84` carries `metadataOptions` as a **nested field**, canonicalized
at construction (`:126`), whose own doc states *"a launch template with a null metadataOptions is
created with the secure default"* (`DeclaredAwsEc2InstanceMetadataOptions.ts:9-10`).

⇒ **imdsv2 is the same problem shape as the public-access block** — a security posture, aws-default
insecure, `null` must mean secure — and this repo had already solved it as a nested field.

🔴 **F2 cited that very file for its SHAPE and stopped there.** the citation audit that produced the
first council's reversal read the policy peer and not this one.

⇒ **two peers, opposite answers, and the discriminator is what the property IS**: a bucket policy is
a document with its own lifecycle, so it earns a resource. a security posture is an attribute of the
resource it protects, so it earns a field. `rule.require.symmetry-with-peer-resources` reaches both
and points where the analogy is closest.

## .what the verdict binds

| | |
|---|---|
| 🟢 **two new fields** | `versions` and `publicAccessBlock` on `DeclaredAwsS3Bucket`, both required-nullable, both in `static nested` where the value is a dobj |
| 🟢 **no new dobjs, DAOs, provider registrations, or sdk exports** | `DeclaredAwsS3BucketDao.ts` delegates field-agnostically — **no DAO work at all** |
| 🟢 **F11's `null` = the secure default binds again** | the field exists, so the semantic has a site. **F13 retires** |
| 🟢 **the write order (I-1) is OURS** | *the versions put last, because it is the one irreversible write* stays a statement order inside `setS3Bucket` — a code obligation, not a release-note one |
| 🔴 **A-8 returns** | `getOneS3Bucket` reads both properties to populate the fields, so every consumer needs two new `Get` grants |
| 🔴 **A-1 is four required-nullable fields**, not two | the source break the rename already pays widens |

**the decisive argument is the failure mode of the two costs.** A-8 fails **loud** — an IAM denial
that names the action, on the first plan after upgrade. F13 failed **silent forever** — a public
backup store nobody is told about. **a loud cost with a documented remedy outranks a silent one with
none.**

## .the rework, and why its deadline matters

**clean now, dirty after ship.**

- **now**: no consumer has bound to either shape. a switch is a re-author of one interface.
- **after ship**: a consumer's wish declares `versions: 'Enabled'` inline. to move it to a separate
  resource is **a break to every consumer's wish**, on top of the source break A-1 already carries.

🟢 **the window held.** both reversals landed before any consumer imported either shape.

⇒ 🔴 **F14 inherits this window** — the field's *name* is still open, and it goes dirty at the same
moment for the same reason.

## .the verdict

🟢 **RULED 2026-09-09 — NESTED FIELDS on `DeclaredAwsS3Bucket`.**

⇒ **the lesson is not about the answer.** it is that a fork decided by **omission** cannot be flagged
as low-confidence — this went nine rounds unnoticed while lower-confidence forks were re-examined
repeatedly, and then moved twice in one day once it was framed.

## .see also

- `F14` — the field's NAME, open, and deadline-bound to this fork
- `F11` — the `null` semantic this verdict gave a site back to · `F13` — retired by this verdict
- `F2` — the *shape* decision this *placement* question sits beside
- `../appendix/how-the-shape-was-reached.md` — the three walks, and the verified declastruct mechanics
- `rule.require.symmetry-with-peer-resources` · `rule.require.dao-and-acceptance-per-declared-resource`
