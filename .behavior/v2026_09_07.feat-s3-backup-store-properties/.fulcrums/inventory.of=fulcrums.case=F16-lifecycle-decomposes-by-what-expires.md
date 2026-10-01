# F16 — the lifecycle fields reshape around **what expires**, not around aws's key names

**rework** clean until `#35` binds · **status** 🟢 **RULED 2026-09-11 — the shape is taken** ·
**where** `DeclaredAwsS3Bucket.{lifecycle, versions}`

> **"this looks good"** — the wisher, on the drive's recommended shape, verbatim

```ts
lifecycle: {
  objects:    { expire: IsoDurationInDays | null, transitions: [ … ] },   // ANY bucket
  versions:   false | { status: 'enabled' | 'suspended',
                        expire: IsoDurationInDays | null },               // only if versioned
  multiparts: { expire: IsoDurationInDays | null },
},
```

⇒ every recommendation in this entry is taken: proposal 5's forced key, `objects.expire` split out,
`multiparts` under `lifecycle`, `'disabled'` and `revocations` refused, the `versions: false` guard.

## 🔴 .the THREE sub-calls the shape carries

⚠️ **each is a consequence of the shape rather than a fresh fork**, and each changes a RULED entry.
the drive states them rather than acts on them silently. sub-call 3 was raised **by the wisher**,
who asked the drive to *"double check"* it.

### 1. `status: 'enabled' | 'suspended'` is LOWERCASE, and F1 ruled the aws letters

F1 took `versions: 'Enabled' | 'Suspended' | null` — **aws's own letters** — and the yield's
ownership table records it as ours-renamed / aws-verbatim.

🟢 **the drive reads the lowercase as CORRECT, and as a completion of F1 rather than a reversal.**

- F1's subject was the **shape** — a union over a boolean, which is the fork it settled
- the letter-form rode along unexamined, and `'Enabled'` is an aws **value**, not an aws symbol
- ⇒ the ownership rule says our declared fields use house words; a capitalized value is neither a
  command name nor an iam action, so it is **ours to spell**
- `rule.forbid.shouts` and `rule.prefer.lowercase` both point the same way

⚠️ **and the cast layer absorbs it in one line**, exactly as it already does for every other aws
value this package renames.

### 2. `versions` MOVES from the bucket into `lifecycle`, and it straddles two api calls

F10 put `versions` on the bucket. under this shape its `status` is written by
`PutBucketVersioning` and its `expire` by `PutBucketLifecycleConfiguration` ⇒ **one declared field,
two api calls.**

🔴 **this was flagged before the shape was taken** (*"the price of the forced-key win, and it is
yours to weigh"*) and the wisher took the shape with it stated. ⇒ recorded as a **priced cost**,
never a discovered one.

**what it obliges at `2.1.criteria`:**

- `setS3Bucket`'s write-order obligation now spans **one field's two halves** rather than two fields
- the read must **assemble** `versions` from two gets, and the cast must produce `false` where the
  version-state get returns no `Status`
- 🟡 a partial failure — `PutBucketVersioning` succeeds, the lifecycle put fails — leaves the field
  half-applied. the extant per-call loud-fail covers it; **the plan's next read shows the true split
  state**, so it converges. carried as a criterion, not a fork.

#### 🔴 three consequences the PROPAGATION found, which this sub-call's first draft did not name

the propagation sweep (2026-09-11) walked every demo against the shape as ruled. three obligations
fell out of *"one field, two api calls"* that the sub-call's own prose did not reach — each recorded
here so `2.1.criteria` inherits them rather than re-derives them:

| # | what it is | where it landed |
|---|---|---|
| **a** | 🔴 **`case=8`'s fix line became destructive in one cell.** the guard's trigger is the whole `lifecycle` FIELD; its subject is the lifecycle RULE — and F16 made those different. a lifecycle that is inert as a rule can still carry `versions: { status: 'suspended' }`, a real declaration. to advise `lifecycle: null` there **retracts a state the consumer meant.** ⇒ the predicate's fourth term is `versions === false`, never *"versions has no expiry"* | `case=8` `[t3b]` |
| **b** | 🔴 **the stability poll must be keyed per-KEY, not per-OBJECT.** a change to `versions.status` alone must enter the version-state poll and **not** the lifecycle poll — a poll triggered by *"the lifecycle object changed"* fires on a config nobody wrote and times out | `case=5` `[t5b]` |
| **c** | 🔴 **an omitted `NoncurrentVersionExpiration` on a `versions: false` read is an ABSENT SLOT, not an absent value.** the cast must not synthesize a `versions` object to hold it; and the converse pair — a lifecycle rule that *does* carry the expiry while the version-state get reads absent — is **unrepresentable** under the forced key, so it must fail loud rather than be silently dropped | `case=2` `[t2]`, `[t2b]` |

⇒ **(a) is the one worth a second read.** it is no defect in the call — the call is right — it is a
place where the *obvious* implementation of a pre-F16 guard becomes actively harmful under the new
shape, and where the harm is a **silent retract** rather than a loud failure.

### 3. `multiparts.expire` drops the word **incomplete** — the disjointness holds, the LABEL is the residual

> **"is it clear that `multiparts.expire` only impacts incomplete objects? … so i feel like thats
> fine … but double check"** — the wisher, verbatim

🟢 **the disjointness is REAL, and it is verified rather than reasoned.** three reads of
`@aws-sdk/client-s3@3.943.0`, each quoted:

| key | aws field | what it reaches, in aws's own words |
|-----|-----------|--------------------------------------|
| `objects.expire` | `LifecycleExpiration.Days` (`models_0.d.ts:6423`, field `:6439`) | *"the lifetime, in days, of **the objects** that are subject to the rule"* — no exclusion by upload method |
| `versions.expire` | `NoncurrentVersionExpiration` (`:6710`) | *"when **noncurrent object versions** expire"* |
| `multiparts.expire` | `AbortIncompleteMultipartUpload.DaysAfterInitiation` (`:21`, field `:26`) | *"the days since the initiation of an **incomplete** multipart upload that Amazon S3 will wait before permanently removing **all parts of the upload**"* |

🔴 **the third row's noun is *parts of the upload*, never *the object*** — and parts cease to exist
the moment the upload completes, since s3 assembles them into one object and discards the part list.

⚠️ **and the clock is confirmed to start at INITIATION, not at completion**: `CreateMultipartUploadOutput`
(`:1966-1975`) returns a header that *"indicates when the initiated multipart upload becomes eligible
for an abort operation"*. ⇒ a **completed** multipart upload is an ordinary object, governed by
`objects.expire` like any other. **the wisher's read is correct on every count.**

#### 🟡 the residual — the label, not the behaviour

the extant field says *incomplete* outright — `abortIncompleteMultipartUploadAfterDays`. the new one
does not, and `rule.forbid.ambiguous-labels` (blocker) tests *"can a human read this label exactly
one way, **without context**?"*

- a reader who knows s3 reads it right — aws's own `ListMultipartUploads` returns **in-progress**
  uploads only, so *a multipart upload* denotes an unfinished thing in the api's own usage
- a reader who does not could take `multiparts.expire` as *"expire the objects that were uploaded in
  parts"* — a read that is **redundant** with `objects.expire`, so it is self-resolving
- ⇒ but the resolution is an **inference chain**, and that rule's bar is *without context*

**two fixes, and the drive recommends the first:**

| # | the fix | rung (`rule.prefer.prevent-over-correct`) | cost |
|---|---------|---------------------------------------------|------|
| **a** | a field `.note` at `multiparts.expire` that names the aws symbol, says *in-progress parts only*, and points a completed upload at `objects.expire` | 4 — report it well | one comment, and the repo **already** carries this exact convention on every roundtrip field (`DeclaredAwsS3Bucket.ts:29-40`) |
| b | rename the verb to `abort` — `multiparts: { abort: … }` | 1 — make the misread impossible, since one cannot abort a finished thing | breaks the one-verb symmetry across the three keys |

🟡 **(b) is the higher rung and the drive does not take it.** `expire` names the **motive** the three
keys share — *remove it after N days so it stops billing* — where `abort` names the **mechanism** of
one of them, and `def.domain-discovery` prefers the motive. the symmetry is also what makes the trio
legible as a partition at a glance.

⇒ **the `.note` is carried to `2.1.criteria` as an obligation**, not left to an implementer's taste.
if a reviewer grades the label a blocker anyway, (b) is the ready answer and costs one rename.

🔴 **raised 2026-09-10, by the wisher, in a rapid series of proposals** — five of them, each a
refinement of the last, closed with *"what do you think?"* and *"under lifecycle? or own
toplevel?"* ⇒ **the wisher asked for a recommendation, so this entry states one.**

## 🔴 .the ground truth the drive got wrong on its first pass, and had to read to fix

⚠️ **two of the wisher's "proposals" are not proposals — they already exist**, and a recommendation
that misses that is a recommendation about the wrong artifact. read verbatim from
`DeclaredAwsS3BucketLifecycle.ts:18-29`:

```ts
export interface DeclaredAwsS3BucketLifecycle {
  transitions: DeclaredAwsS3BucketLifecycleTransition[];   // 🔴 ALREADY SHIPPED
  expireAfterDays: number | null;                          // 🔴 ALREADY SHIPPED
}
```

| the drive first wrote | the truth |
|---|---|
| *"`lifecycle` should probably dissolve"* — as though it were a proposed key | 🔴 `lifecycle` is an **extant shipped nested dobj**. to dissolve it is a far larger call than to decline a new one |
| *"`transitions` is a new capability, out of scope"* | 🔴 **`transitions` is shipped.** the wisher's proposal 2 renames an extant field, never adds one |

⇒ **the drive priced a reshape of a shipped container as though it were a greenfield name call.**
the same error F14 recorded — a change priced as cosmetic that was not — recurred one entry later,
and one file read settled it both times. `rule.require.trust-but-verify`.

## .the proposals, in the order they arrived

| # | the wisher wrote | what it changes |
|---|---|---|
| 1 | `{ expire: { versions: { current: { after: IsoDuration }, previous: { after: IsoDuration } } } }` | groups the two expiries under one key, and swaps days for a duration |
| 2 | `{ transitions, expirations }` | pluralizes, and adds a transitions peer |
| 3 | `{ expirations, transitions, revocations }` under a `lifecycle` key | a three-way group under aws's own word |
| 4 | `versions: 'enabled' \| 'disabled'` | a token where F1 took the aws union |
| 5 | `versions: false \| { status: 'enabled', expire: { current, previous } }` | 🟢 **the strongest.** see below |
| 6 | `multiparts: { expire: IsoDuration \| null }` — *"under lifecycle? or own toplevel?"* | the third expiry, symmetric with the other two |

## 🟢 .the drive's read — proposal 5 is the one to take, with ONE correction

the wisher stated its own criterion, and it is a rule rather than a taste:

> **"that way if versions are enabled, expire must be set"**

⇒ that is `rule.prefer.prevent-over-correct` **rung 1** — *"make it impossible: a type, an enum, or
a shape that cannot express the wrong value."* the extant shape sits at rung 3 (validate at the
boundary); proposal 5 lifts it to rung 1.

### what it buys, precisely

| fulcrum | the state it left open | what proposal 5 does |
|---|---|---|
| **F4** — *may a noncurrent expiry be set on an unversioned bucket?* | ruled: allowed, and inert | 🟢 **the question stops to be representable.** no `versions` ⇒ no `expire` key to fill |
| **F5** — the cost-leak guard is a typed `null` the author must write out | ruled: a typed-out null | 🟢 **promoted from a typed null to a forced key.** the author cannot omit it |

⇒ **two ruled fulcrums are strictly improved by one shape change**, and neither verdict is
overturned — F4's answer stays *"inert is fine"*, it merely becomes unreachable; F5's guard stays
*"the author states the absence"*, it merely becomes non-optional.

## 🔴 .the ONE correction — `expire.current` must NOT sit inside `versions`

proposals 1 and 5 both place **both** expiries under the version key. that is a **functional
regression**, and it is the sharpest catch on this entry.

| aws field | applies to | what it does |
|---|---|---|
| `Expiration.Days` | 🔴 **ANY bucket** — versioned or not | the current object is deleted after N days |
| `NoncurrentVersionExpiration.NoncurrentDays` | only a **versioned** bucket | there are no noncurrent versions otherwise |

⇒ nest `current` under `versions` and **an unversioned bucket can no longer expire its objects at
all** — the single most common s3 lifecycle rule, and one this repo **already ships** as
`expireAfterDays`. that is a break to every extant caller, for a symmetry that is not real.

### 🟢 the shape that keeps the win and drops the regression

```ts
lifecycle: {
  objects:    { expire: IsoDuration | null,           // the current version — ANY bucket
                transitions: [ … ] },                  // shipped, renamed from the bare `transitions`
  versions:   false | {                                // only where versions are kept
                status: 'enabled' | 'suspended',
                expire: IsoDuration | null },          // the noncurrent versions
  multiparts: { expire: IsoDuration | null },         // the aborted upload parts
},
```

**the split is not a compromise — it is the domain.** the discriminator is *"does this expiry
require a versioned bucket?"*, and the answer parts the three cleanly: `objects` no, `versions`
yes, `multiparts` no.

⚠️ **`versions` moves INSIDE `lifecycle` under this shape, and it does not live there today** — the
vision puts it on the bucket (F10). that is a real tension and this entry does not hide it:

| where `versions` sits | the argument |
|---|---|
| on the **bucket** (F10, extant) | it is written by `PutBucketVersioning`, a **separate api call** from the lifecycle put |
| inside **`lifecycle`** (proposal 5) | its `expire` sub-field is written by the lifecycle put, so the object would **straddle two api calls** |

⇒ 🔴 **proposal 5's forced-key win requires the straddle**, because the whole point is that
`status` and `expire` live in one shape. the write-order obligation the vision already carries
(*"`PutBucketVersioning` is the …"*) becomes an obligation **inside one declared field**, which is
new. **this is the sharpest cost of proposal 5 and the council should price it deliberately.**

## 🔴 .the `false` arm is an OBSERVATION, not a settable state — the guard the wisher took

⚠️ **raised by the wisher's own question — *"what does suspend mean?"*** — and the answer voids a
premise proposal 5 rests on. 🟢 **the wisher took the guard in one turn**: *"yes, i completely agree
with your idea."*

`Suspended` is not *off*. it is **versions were on, you stopped new ones, and the history stays**:

| | unversioned (never on) | `Enabled` | `Suspended` |
|---|---|---|---|
| a new PUT gets | no version id | a fresh version id | version id **`null`** |
| old versions | none exist | accumulate | 🔴 **kept, until a lifecycle rule prunes them** |

🔴 **and it is a ONE-WAY DOOR.** aws allows `unversioned → enabled`, then `enabled ↔ suspended`.
**there is no path back to unversioned.** that is why the enum holds two members rather than three —
`Suspended` IS the off state, and *never on* has no token at all.

### what that does to `versions: false`

```ts
versions: false   // on a bucket that was ever enabled → aws CANNOT converge to this
```

⇒ **permadrift.** plan reads UPDATE forever, and **the type cannot prevent it** — the type does not
know the bucket's history. so the `false` arm is sound as a **read** and unsound as a **desire**.

### 🟢 the guard — fail loud at `set`, with the fix named

`setS3Bucket` throws on a desired `false` against a live `Enabled`/`Suspended` bucket:

> *"aws cannot un-version a bucket. use `{ status: 'suspended', expire }` to stop new versions and
> drain the old."*

⇒ `rule.prefer.prevent-over-correct` **rung 4**, because rungs 1–3 are unreachable — the constraint
is a fact about the live resource, not about the value. the shape matches F6's deadline throw and
F9's loud partial, so it adds no new mechanism.

### 🟢 and `suspended` is exactly the backup-store's DRAIN mode

```ts
// stop new versions, prune the old
versions: { status: 'suspended', expire: { after: { days: 30 }, keep: null } }
```

⇒ **the forced `expire` key earns its keep most in the `suspended` arm**, not the `enabled` one. a
suspended bucket with no expiry bills for version history that will never grow and never leave —
the wish's second silent-bill failure mode, made unwritable.

🟡 **F18 later widened `expire` to `{ after, keep }`** — an age axis, a count axis, or both, never
neither. the forced-key argument above is untouched: what F16 forces is that the key be **present**,
and what F18 adds is that whatever is present must **expire something**.

## 🔴 .`'disabled'` must be refused — aws has no such state

proposal 4 offers `versions: 'enabled' | 'disabled'`. aws's own enum holds exactly two members:

```ts
// @aws-sdk/client-s3 — enums.d.ts:726-728
export declare const BucketVersioningStatus: {
  readonly Enabled: "Enabled";
  readonly Suspended: "Suspended";
};
```

⇒ **there is no `Disabled`.** a bucket that was never configured returns **no `Status` field at
all** — which is F1's verdict, and why `null` there is a genuine absence rather than an encoded
value (F15's own bound section says so).

🟢 **proposal 5 already solves this correctly**: its `false` arm IS the never-configured state, and
its `status` arm carries aws's two real tokens. so the `'disabled'` token is not merely wrong — it
is **unnecessary** under the shape the wisher went on to propose.

## 🔴 .`revocations` must be refused — it names naught in s3

proposal 3 offers `{ expirations, transitions, revocations }`. the first two map to real aws
constructs; the third maps to no s3 lifecycle concept. `rule.forbid.term.addition.synonym` and
`rule.require.ubiqlang` both refuse a coined word with no referent in the domain.

## 🟢 .`multiparts` — **under `lifecycle`**, because `lifecycle` is already there

the wisher's own question: *"under lifecycle? or own toplevel?"* — and the answer flips once the
ground truth above is in hand.

| | if `lifecycle` were a PROPOSED key | 🔴 what actually holds |
|---|---|---|
| the call | decline it — `rule.prefer.wet-over-dry`, no second occupant | **it has two occupants and is shipped** |
| `multiparts` | top level, beside the others | **under `lifecycle`, beside its peers** |
| a top-level `multiparts` would be | symmetric | 🔴 **asymmetric** — one expiry outside the container that holds the other two |

⇒ **`lifecycle` earns its place empirically.** aws's `PutBucketLifecycleConfiguration` writes all
three as ONE api call, so the container is not merely the api's name — it is the **write boundary**,
and `setS3Bucket` already treats it as one (`putBucketLifecycle.ts:29`). that is a domain fact, not
a schema artifact, and it is what `def.domain-discovery` asks you to check before you call a
container a map rather than a territory.

🟡 **the one honest cost:** `lifecycle` nests to two levels once `versions.expire` lands inside it,
which is F14's registration lesson a second time — *a group key adds a nullable position, and every
nullable position on a round-tripped field is a written form the canonicalizer owes.* the cost is
real and it is already paid, since `lifecycle` is nullable today.

## 🟢 .`transitions` — the rename is IN SCOPE, because the break is already paid

proposal 2 pluralizes to `{ transitions, expirations }`. `transitions` is already shipped, so this
is a rename of an extant public field — **exactly the shape F3 already ruled on, and F3's argument
transfers whole**:

> **"if you are about to break source once, break once."** — F3, on `expireAfterDays` →
> `expireCurrentVersionsAfterDays`

⇒ **A-1 breaks consumer source this release regardless** (the four new required-nullable fields do
it, proven by this package's own `resources.acceptance.ts:826-836`). so a reshape of `lifecycle`
costs **lines in an edit the consumer is already committed to**, never a second breaking release.

🔴 **and this is the same shortest-clean-window F3 named.** `lifecycle` is clean to reshape until
`ahbode/infrastructure#35` ships against it. **if the council wants the reshape, this council is
where it says so.**

### 🔴 and the 2×2 exposes a cell the wish does not cover

| | expiry | transition |
|---|---|---|
| **current version** | 🟢 `Expiration.Days` — **shipped** as `expireAfterDays` | 🟢 `Transitions` — **shipped** as `transitions` |
| **noncurrent version** | 🟢 `NoncurrentVersionExpiration` — **this wish** | 🔴 **`NoncurrentVersionTransitions` — modeled by aws, covered by nobody** |

verified: `@aws-sdk/client-s3` models `NoncurrentVersionTransitions` (`models_0.d.ts:6573`,
`:6698`). ⇒ **three of four cells are covered, and the fourth is the only hole in the square.**

🔴 **that asymmetry is itself an argument for the reshape.** under the shipped flat names, the
absent cell is invisible — four `…AfterDays` fields in a row read as a complete set. under
`{ objects: { expire, transitions }, versions: { expire, transitions } }` the hole is a **missing
key**, which a reader sees. ⇒ a dream is owed for the cell, and the decomposition is what surfaced
it — `howto.dimensional-decomposition` at work.

## 🟡 .`IsoDuration` is a HOUSE RULE, not a preference — see F17

every proposal swaps `…AfterDays: number` for `IsoDuration`. that is not the wisher's taste; it is
`rule.forbid.any-time`, at **blocker** severity, and `iso-time` is already a dependency of this
repo. ⇒ it is split into its own entry because it applies to the extant shipped field too, and so
outlives whichever reshape is taken.

## .rework — clean, and the window closes at `ahbode/infrastructure#35`

⚠️ **the naive read is that this is dirty** — `expireAfterDays` and `transitions` are shipped public
fields. **F3 already settled that read, and settled it the other way:**

| | without the reshape | with it |
|---|---|---|
| does the consumer edit their wish this release? | **yes** — A-1 forces it | **yes** |
| how many breaking releases must they absorb? | one now, **a second later** if the council ever wants this | **one, ever** |

⇒ **the break is already paid.** the reshape's marginal cost is lines in an edit the consumer is
already committed to. it stays clean until `ahbode/infrastructure#35` ships against `1.12.0` — the
same window F3 named, and **the only deferral on this route that expires.**

## ⚠️ .the scope flag the wisher should see

**no reviewer has read this reshape.** twenty-five review rounds graded the extant four-field shape.
a reshape of this size re-opens the criteria, the blueprint's field list, and every `[tn]` that
names a field — and it does so **after** the review ladder was walked.

⇒ that is not an argument against it. it is the cost, stated so the wisher prices it.

## .see also

- `F1` — the `versions` union, and why the never-configured state is a genuine `null`
- `F4` — the inert-noncurrent-expiry verdict this shape makes unrepresentable
- `F5` — the cost-leak guard this shape promotes from typed-null to forced-key
- `F14` — the group-key lesson: a wrapper adds a nullable position, never merely a segment
- `F15` — the least-astonishment criterion, and its bound on which nulls are genuine
- `F17` — the `IsoDuration` change, split out because it reaches the shipped field too
- `rule.prefer.prevent-over-correct` (rung 1) · `rule.forbid.any-time` · `rule.require.ubiqlang` ·
  `rule.prefer.wet-over-dry` · `rule.prefer.bounded-scope` · `def.domain-discovery`
