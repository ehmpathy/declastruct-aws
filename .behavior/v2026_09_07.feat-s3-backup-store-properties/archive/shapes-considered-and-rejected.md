# archive — shapes considered and rejected

shapes weighed at `1.vision` and **not taken**. kept so a later drive does not re-derive them, and
so a reader can see what the taken shape was chosen against.

⚠️ **no entry here is live.** every one is superseded by `../1.vision.yield.md`.

## .placement — separate declared resources

```ts
return [
  bucket,
  DeclaredAwsS3BucketPublicAccessBlock.as({ bucket, ...s3BucketPublicAccessBlockAll }),
  DeclaredAwsS3BucketVersions.as({ bucket, status: 'Enabled' }),
];
```

**taken at the first council (F10), reversed at the second.** it added two dobjs, two DAOs, two
provider registrations, two sdk exports and their acceptance coverage.

| it bought | it cost |
|---|---|
| symmetry with `DeclaredAwsS3BucketPolicy` | 🔴 **F13** — the bucket carried no `publicAccessBlock` field, so F11's `null`-means-secure had nowhere to bind, and *declare no block at all* became the cheapest path to a public backup store |
| A-8 collapsed — an undeclared resource issues no read | the write order for the one irreversible put (I-1) moved from `setS3Bucket` onto the consumer's `getResources()` array — a release-note obligation rather than a code one |
| A-1 halved — two required-nullable fields, not four | |

⇒ the reversal argument is in `../appendix/how-the-shape-was-reached.md`.

## .`publicAccessBlock` — the two rejected shapes

### `'blocked' | null`, the wish's own advisory

rejected by **F2**. it cannot round-trip a bucket with three of four sub-fields blocked — a console
click away — so the plan reads a false KEEP or a permadrift, both of which fail the wish's decisive
criterion.

🔴 **and F11 later emptied it entirely**: once `null` means the secure default, both tokens mean
*blocked*, and a consumer who wants a public bucket cannot say so. it would need a third token, at
which point it is a hand-rolled enum over a space aws already models.

### four booleans flat on the bucket

rejected by **F2** in favour of the nested dobj + a frozen preset const. flat would put four fields
on the bucket for one concept, and the preset const (`s3BucketPublicAccessBlockAll`) gives the
common case one word either way.

## .`publicAccessBlock: null` = "no block configured"

**taken as the best guess, overruled at the first council (F11).**

it mirrored aws's own 404 faithfully. the council took the secure default instead, on
`rule.require.safe-by-default`'s test — *"if a hurried human does the most obvious move, is the
result safe?"* — which the faithful mirror failed: the cheapest path left a **backup store**
public-capable, so the feature's own default defeated the feature's own purpose.

⇒ its retirement removed `delPublicAccessBlock`, that communicator's blocker-grade integration
test, assumption **A-7**, and case **c9**.

## .`publicAccess: 'blocked-if-unset' | 'unmanaged'` — a posture field

proposed once, **rejected by the wisher as not seamless.** the objection: it makes the consumer type
a posture token for a property that should simply be secure by default.

it also could not guarantee *blocked* — `'blocked-if-unset'` says only that we seed the default when
none exists.

## .detect-the-override, with no field at all

worked and discarded. `setS3Bucket` would read the live block on its write path and seed the secure
default only when absent.

⇒ **its verification is what settled the placement question**, so the mechanics are recorded in
`../appendix/how-the-shape-was-reached.md` rather than here. the short form: with no field on the
bucket there is no diff, with no diff there is no `set`, and an extant bucket sits at KEEP forever.

## .a bucket tag as the ownership marker

considered as the seam that would make detect-the-override work on extant buckets: tags are already
a diffed field, so a `declastruct:publicAccessBlock` marker could drive an UPDATE with no new key a
consumer must type, and could tell our own prior write from a foreign one.

**not pursued** — the nested field delivers the same guarantee with no reserved tag key and no
elevation of A-5's stakes.

## .`expireAfterDays` keeps its name

**taken as the best guess, flipped by the drive (F3).** with `expireNoncurrentVersionsAfterDays`
present, the old name reads two ways, which `rule.forbid.ambiguous-labels` grades a blocker. its
sole objection — a source break — is a cost **A-1 already pays**.

## .the gerund exemption for aws's api word

every artifact opened with a claim that aws's api word was exempt from `rule.forbid.gerunds`. the
council retired it: **our** resource is `Versions`; only aws's own symbols keep the api's letters.

⇒ *an exemption claimed for a name you own is a question you failed to ask.*

## .the `🐢 bummer dude` error voice

the demos rendered thrown TypeScript errors in the voice of bash-skill stdout. measured: `🐢` in
`src/` = **0**; `helpful-errors` throws = **23 across 10 files**.

⇒ rejected on `rule.require.symmetry-with-peer-resources`. the richness F8 won lives in the
metadata, which costs no new formatter.

## .see also

- `../1.vision.yield.md` — the shapes that were taken
- `../appendix/how-the-shape-was-reached.md` — the road
- `../.fulcrums/inventory.of=fulcrums._.md` — the forks, with their verdicts
