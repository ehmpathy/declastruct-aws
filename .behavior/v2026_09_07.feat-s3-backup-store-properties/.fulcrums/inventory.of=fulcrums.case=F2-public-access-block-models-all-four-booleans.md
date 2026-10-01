# F2 — the public-access block models all four booleans

**rework** clean · **status** 🟢 **RULED — CONFIRMED by the drive** (2026-09-09) · **confidence** ~~93%~~ → settled · **where** `DeclaredAwsS3Bucket.publicAccessBlock`

⚠️ **confidence raised 90% → 93% by the r1 self-review**, which found the peer precedent
(`DeclaredAwsEc2InstanceMetadataOptions`) that made the same call for the same reason. the *shape*
is now backed by a live precedent rather than by argument alone — so the residual doubt is only
whether the wisher prefers their advisory anyway. the **name** was corrected in the same pass.

⚠️ **this diverges from the wish's advisory.** the wish invites that (*"if you deliver the
acceptance criteria with a shape this wish did not imagine, that is a success, not a deviation.
say why in the yield"*), and the reason is below.

## .the fork, stated fairly

the wish's advisory: *"aws exposes four independent booleans … a single `'blocked' | null` literal
covers the only case we actually want and forecloses the others. we have no need for a partial
block today."*

| option | write side | read side |
|--------|-----------|-----------|
| **(a)** `'blocked' \| null` literal | ideal — one word | **cannot represent a partial block aws holds** |
| **(b)** four booleans, flat on the bucket | fine | fine, but four fields on the bucket |
| **(c)** a nested `DeclaredAwsS3BucketPublicAccessBlock` + a named preset const | one spread, same as (a) | faithful |

## .taken — (c)

```ts
publicAccessBlock: null,                               // the common case — the secure default (F11)
publicAccessBlock: s3BucketPublicAccessBlockAll,       // the same posture, stated explicitly
publicAccessBlock: { ...s3BucketPublicAccessBlockAll, restrictPublicBuckets: false },  // an opt-out
```

🟢 **the shape survived F10's three walks unchanged; only its HOME moved, and it moved back.** the
four booleans, the frozen preset const, and the spread-with-opt-out transfer verbatim under either
placement and under either name (F14).

⚠️ **which is also why F10 went unnoticed for nine rounds**: F2 reasoned the *shape* to a defensible
answer, and a defensible answer on one axis reads as a settled question on both.

### ⚠️ the shape and name were corrected by the r1 self-review

the first pass wrote `asS3PublicAccessBlockAll()` — a **factory**, grounded on `asSesReceiptRuleArn`
(which returns a **string**). the true precedent is structurally identical to this fulcrum and was
unread: `DeclaredAwsEc2InstanceMetadataOptions.ts:55-60` exports

```ts
export const ec2InstanceMetadataOptionsSecure: DeclaredAwsEc2InstanceMetadataOptions =
  Object.freeze({ httpTokens: 'required', httpPutResponseHopLimit: 1, httpEndpoint: 'enabled' });
```

a **frozen exported const**, whose own `.note` says a caller *"is meant to SPREAD it"*, and whose
`Object.freeze` exists so an accidental in-place write throws instead of a silent degrade of the
default for every later declaration. `s3BucketPublicAccessBlockAll` takes that shape verbatim.

### 🔴 `publicAccessBlock` MUST be registered in `static nested`

not for layout — **for convergence.** `serialize()` tags a DomainObject instance with a `_dobj` key
and never tags a plain literal (`DeclaredAwsEc2InstanceMetadataOptions.ts:110-117`). declastruct
decides KEEP by `serialize(desired) === serialize(remote)`, so a preset-const caller and a
bare-literal caller compare equal **only because** nested hydration instantiates both sides. drop
the registration and (c) re-opens the very permadrift it was chosen to close.

## .why, at the time

1. **(a) cannot round-trip, and round-trip is THE criterion.** a bucket with three of four blocked
   — a console click away — has no representation in `'blocked' | null`. we would read it as
   `'blocked'` (wrong, and the next put silently completes the block) or as `null` (wrong, and the
   plan reads CREATE forever). **either is the permadrift the wish exists to prevent.** the wish's
   own "the ask is not merely add the fields" clause outranks its shape advisory.
2. **wet-over-dry is satisfied at the ergonomics layer, not the model layer.** the wish cites
   `rule.prefer.wet-over-dry` for the literal. (c) honours the same intent the way
   `rule.forbid.dao-for-narrow-usecase-resource` prescribes: **the generic resource plus a named
   preset for the common usecase**. the consumer still writes one word.
4. **the repo already made this exact call, for the same reason.**
   `DeclaredAwsEc2InstanceMetadataOptions` models **all three** of an optional aws sub-block's
   independently-optional sub-fields rather than collapse them to a posture literal — and the
   convergence machinery written around it (`asCanonicalEc2InstanceMetadataOptions`) exists
   precisely because the collapse-to-a-literal shape could not round-trip. (c) is not a novel
   divergence; it is **symmetry with the closest peer in the package**
   (`rule.require.symmetry-with-peer-resources`).
3. **the sdk types all four as independently optional** (`PublicAccessBlockConfiguration`,
   models_0.d.ts:10155-10182), so "partial" is representable on the wire whether or not we model
   it. a model narrower than the wire is a read we cannot make honestly (see `case=4`, `[t2]`).

## 🔴 .the field name — F2's objection here is INVERTED by F11, and the question is now F14

F2 rejected `publicAccess` on `rule.forbid.ambiguous-labels`: *"`publicAccess: null` reads as 'no
public access' — the exact opposite of its sense ('no block configured')."*

⚠️ **F11 then made that the sense.** `null` = the secure default = all four blocked = *no public
access*. ⇒ **the blocker-grade citation against the shorter name is spent**, and the residual
argument is a readability one: `publicAccessBlock.blockPublicAcls` says *public* twice in aws's own
letters, where `access.public.blockPublicAcls` says it three times.

⇒ that is an ergonomics call on the wisher's own call site, so it is not F2's to close. **`F14`.**

## .rework, and why it is clean

a dobj + a factory + a field rename, before any consumer binds. if the wisher prefers (a), the
collapse is mechanical — and the permadrift it re-opens is a documented tradeoff, not a surprise.

## 🔴 .F11's verdict COLLAPSES option (a)'s value space — found 2026-09-09, on a wisher's question

F11 ruled that **`publicAccessBlock: null` means the SECURE DEFAULT** — all four booleans true.
that verdict is about the property's *semantics* and binds under **any** shape. apply it to option
(a) and the two tokens converge:

| under option (a), a consumer writes | before F11 | 🔴 after F11's verdict |
|---|---|---|
| `publicAccessBlock: 'blocked'` | blocked | blocked |
| `publicAccessBlock: null` | **unblocked** — "no block configured" | **blocked** — the secure default |

⇒ 🔴 **both tokens now mean the same thing, and option (a) has no way left to say "unblocked".**
a consumer who genuinely wants a public bucket cannot express it. (a) would have to grow a third
token — `'blocked' | 'unblocked' | null` — at which point it is a hand-rolled enum over a subset of
a space aws already models, and its one advantage over (c) (brevity) is spent.

⚠️ **F11's own verdict table half-saw this** — it records that (b) *"makes the four-boolean shape
partly decorative"*, which is the cost to **(c)**. what it did not state is the larger effect on
**(a)**: (c) loses some expressiveness it keeps in reserve; (a) loses a value it cannot do without.

⇒ 🔴 **this is the FOURTH time on this drive that one verdict silently re-graded another fulcrum's
argument**, and F9's entry already named the class: *a fulcrum's REASONS are as revisable as its
verdict, and only the verdict is tracked.* it was found by a wisher's question, not by a sweep —
which is the honest record of how thin the tracking still is.

## .the verdict

🟢 **CLOSED BY THE DRIVE 2026-09-09 — CONFIRMED (c). option (a) no longer has a value space to
occupy.**

⚠️ **this is the one entry here where a hand-up was defensible** — it diverges from a shape the wish
names — **and it is still closeable**, because the wish authorizes the divergence in advance and a
later verdict emptied the alternative.

### the wish pre-authorizes it, in its own words

> *"if you deliver the acceptance criteria with a shape this wish did not imagine, that is a
> success, not a deviation. **say why in the yield**."*

⇒ the wish asks for a **stated reason**, not for permission. a reason is written, cited, and in the
yield. **the ask is discharged; the divergence needs no second grant.**

### F11 removed the alternative — the section above carries the table

after F11, `publicAccessBlock: null` means the secure default. under option (a) both of its tokens
then mean *blocked*, and **a consumer who wants a public bucket cannot say so**. (a) would have to
grow a third token to stay usable, at which point it is a hand-rolled enum over a space aws already
models, and its sole advantage over (c) — brevity — is spent.

### and the wish's own decisive criterion forbids (a) independently

*"a plan → apply → plan converges to KEEP."* a bucket with three of four sub-fields blocked is one
console click away and has **no representation** in a two-token literal:

| the read under (a) | what the plan then does |
|---|---|
| `'blocked'` | KEEP, and the bucket is **not** wholly blocked — a **false KEEP** on a security control |
| `null` | 🔴 after F11, also *blocked* — same false KEEP, by a second route |

⇒ **both readings now fail the criterion, and one of them fails it on the security posture itself.**
`howto.navigate-fulcrum-choices`: *impliedly answered by the wish — take that answer.*

### what a wisher may still overrule, honestly stated

the **ergonomics**, never the model. a wisher who wants one word at the call site already has it —
`s3BucketPublicAccessBlockAll` is a frozen exported const spread in one line. if the preferred word
is different, that is a rename of a const, and the rework stays clean forever.

🔴 **what is NOT on the table is the collapse to a two-token literal**, because the shape it would
produce cannot round-trip a state aws can hold.
