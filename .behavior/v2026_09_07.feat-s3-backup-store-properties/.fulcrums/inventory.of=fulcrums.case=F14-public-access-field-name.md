# F14 — the nested field's name: `publicAccessBlock` or `access: { public }`

**rework** 🔴 **clean now, dirty after ship** · **status** 🟢 **RULED — overruled to (b)** ·
**confidence at the guess** 76% · **where** `DeclaredAwsS3Bucket.access.public`

🔴 **raised 2026-09-09, by the wisher's own proposal.** the second council reversed F10 to nested
fields and the wisher wrote the shape as `{ versions, access: { public } }`. the *placement* is
ruled; the *name* is a separate call, and it is the one open fork on this route.

## .the fork, stated fairly

| option | at the call site | at the sub-field |
|--------|------------------|------------------|
| **(a)** `publicAccessBlock` — taken | `publicAccessBlock: null` | `publicAccessBlock.blockPublicAcls` |
| **(b)** `access: { public }` — the wisher's | `access: { public: null }` | `access.public.blockPublicAcls` |

## .taken — (a), and the reason it is a best-guess rather than a verdict

1. **it is aws's own word.** `PublicAccessBlockConfiguration` is the sdk type, `PutPublicAccessBlock`
   the command, `s3:PutBucketPublicAccessBlock` the iam action. `rule.require.ubiqlang` prefers the
   word the domain already says.
2. **the sub-field reads once, not three times.** aws names the four booleans `blockPublicAcls`,
   `ignorePublicAcls`, `blockPublicPolicy`, `restrictPublicBuckets` — every one already carries
   *public*. under (b) the path reads `access.public.blockPublicAcls`: **three utterances of the same
   concept in one expression.** under (a) it reads twice, in aws's own letters.
3. **symmetry with the peer that settled the placement.** `DeclaredAwsEc2LaunchTemplate` carries
   `metadataOptions` — aws's own noun for the sub-block, flat, with no invented grouping key.

## 🔴 .F2's objection to `publicAccess` is INVERTED by F11, so it no longer counts against (b)

F2 rejected `publicAccess` on `rule.forbid.ambiguous-labels`:

> *"`publicAccess: null` reads as 'no public access' — the exact opposite of its sense ('no block
> configured')."*

**F11 then made that the sense.** `null` = the secure default = all four blocked = *no public
access*. ⇒ the objection that killed the name now argues **for** it: under F11, `access: { public: null }`
reads correctly.

⚠️ **so the one blocker-grade citation against (b) is spent**, and what remains is the triple-word
cost in row 2 above — a readability argument, never a rule violation. that is why this is 76% and
not settled.

## .what a wisher may weigh that the drive cannot

- **a grouping key buys room.** `access: { public, ... }` reserves a home for a later access concern
  (a bucket policy field, an ownership control). `rule.prefer.wet-over-dry` says do not build that
  room before a second occupant exists — but the wisher knows the roadmap and the drive does not.
- **the wisher wrote (b) themselves**, which is evidence about the ergonomics of their own call site.

## .rework — clean now, dirty after ship

identical in kind to F10's: a field rename before any consumer imports it is a re-author of one
interface; after ship it is a break to every consumer's wish. ⇒ **it inherits F10's window, and it is
the only entry on this inventory that still has one open.**

## 🟢 .the verdict — RULED 2026-09-10: **(b) `access: { public }`**, best-guess OVERRULED

the wisher took their own proposal, and then **closed the one argument that had held (a) up** —
row 2's triple-utterance cost — by a drop of `Public` from the sub-fields too:

```ts
access: {
  public: {
    blockAcls: true,      // aws BlockPublicAcls
    ignoreAcls: true,     // aws IgnorePublicAcls
    blockPolicy: true,    // aws BlockPublicPolicy
    restrictBuckets: true // aws RestrictPublicBuckets
  },
}
```

⇒ **the whole case for (a) was that (b) said *public* three times. it now says it once.** with F2's
objection already spent by F11, **no argument for (a) survives**, and the entry closes at a verdict
rather than at a preference.

### 🔴 the sub-field drop is F14's sub-call, and three of four are clean

| aws | ours | reads |
|---|---|---|
| `BlockPublicAcls` | `blockAcls` | ✅ |
| `IgnorePublicAcls` | `ignoreAcls` | ✅ |
| `BlockPublicPolicy` | `blockPolicy` | ✅ |
| `RestrictPublicBuckets` | `restrictBuckets` | ⚠️ **odd** — the plural on a single-bucket dobj |

⚠️ **the fourth cannot be repaired by a better word, and cannot fold into `blockPolicy`.** aws
distinguishes them: `BlockPublicPolicy` rejects a public policy at **PUT**; `RestrictPublicBuckets`
restricts access when one **already exists**. two behaviours, two fields.

🟢 **taken: drop the word on all four.** a mixed set — three short, one long — is worse than one
awkward name, per the no-mass-rewrite clause of `rule.forbid.domain-term-synonyms`. the awkwardness
is aws's own and is inherited either way.

### ⚠️ the structural cost the name change carries — TWO nested levels

`access: { public: {...} }` nests **twice** where the peer `metadataOptions` nests once. both levels
need `static nested` + a `.strict()` schema, and **c1's hydration obligation now has to hold across
two hops rather than one** — the preset-const caller and the bare-literal caller must serialize equal
at *both* depths, or the `_dobj` tag mismatch returns one level down.

✅ **supported, with precedent** — `DeclaredAwsIamPolicyStatement`'s scope wrappers nest this way
(`howto.domain-objects-nested-unions`). but it is new ground for the s3 family, and it is the price
of the room the group key buys.

### 🔴 and the second level adds a WRITTEN FORM the one-level shape could not express

found by the propagation sweep, and it is sharper than the registration cost above:

| level | the ways to write *the secure default* |
|---|---|
| one (`publicAccessBlock`) | `null` — exactly one |
| **two** (`access: { public }`) | 🔴 `access: null` **and** `access: { public: null }` — **two**, for one posture |

⇒ **that is a permadrift generator on the exact field the wish's `.why` is about**, and it is the
defect c1 exists to close, re-introduced one level up by the rename. **the canonicalizer must collapse
both to one value**, where pre-F14 it had only to handle `null` vs the spread.

⚠️ **it does not change the verdict** — the fix is one more clause in a canonicalizer c1 already
required. it does grow **c1 obligation 4** and **F2's registration clause**, and both are carried to
`2.1.criteria`.

🟡 **the general shape is worth the record**: *a group key does not merely add a path segment — it
adds a nullable position, and every nullable position on a round-tripped field is a written form the
canonicalizer owes.* the drive priced the rename as cosmetic and it is not.

## 🔴 .the SECOND sub-call — the four sub-fields factor into a 2×2 (ruled 2026-09-13)

**the verdict above kept aws's four sub-fields flat.** the wisher then asked *"why not combine on
common nouns?"* and the answer is yes — **and the flat set was concealing a dense 2×2.**

```ts
// the verdict's shape — four peers
{ blockAcls, ignoreAcls, blockPolicy, restrictBuckets }

// the factored shape — taken
{ acls:     { block, ignore },
  policies: { block, restrict } }
```

### the evidence is aws's own field docs, `models_0.d.ts:10137-10183`

each doc has two sentences — what it does, and what it explicitly does **not** touch. **the second
sentence names its own complement cell:**

| | **reject NEW** | **neutralize EXTANT** |
|---|---|---|
| **acls** | `BlockPublicAcls` — *"PUT … calls fail if the specified ACL is public"* · *"doesn't affect existing"* | `IgnorePublicAcls` — *"ignore all public ACLs"* · *"doesn't prevent new"* |
| **policies** | `BlockPublicPolicy` — *"reject calls to PUT Bucket policy"* · *"doesn't affect existing"* | `RestrictPublicBuckets` — *"restricts access … if the bucket has a public policy"* |

⇒ 🟢 **dense — four of four cells filled**, so the axes are real rather than invented.

### 🔴 the factor REPAIRS the awkward fourth name the verdict declared unrepairable

the verdict above reads: *"the fourth cannot be repaired by a better word, and cannot fold into
`blockPolicy`. the awkwardness is aws's own and is inherited either way."*

**that was wrong, and the doc says so.** `RestrictPublicBuckets` is a **policy** field — *"if the
bucket has a public policy"* — and `Buckets` is a legacy name. it lands in the policy row on its own
evidence, and the plural disappears with the noun.

⚠️ **and both halves of the verdict's argument survive intact**: the two behaviours are still
distinct, and they are still two fields. what changed is that they are now two fields **in one row**,
where the row names the subject and the key names the operation.

🟡 **the first-pass group on the literal nouns is the trap**, and it is what a reader will propose:

```ts
{ acls: { block, ignore }, policies: { block }, buckets: { restrict } }   // 👎
```

**two groups of one member**, and a policy filed under `buckets`. ⇒ *the group that emerges before
you read the docs is the group the legacy names hand you.*

### what it costs

| | |
|---|---|
| 🟢 **the `'blocked'` token is untouched** | the common case is still one token; F15's asymmetry gets **stronger**, since the public-capable posture now costs four booleans in two groups |
| 🟡 **a THIRD nest level** | `access.public.acls.block`. the two-level cost the verdict priced becomes three, and the `.strict()` schema + `static nested` obligation goes one depth further |
| 🟢 **no new written form** | the `acls` and `policies` keys are **required**, so they add no nullable position. the two-form hazard the section above names is unchanged at two |
| 🟢 **rework clean** | `ahbode/infrastructure#35` had not bound — the same window F16 closed inside |

### 🔴 the general lesson, and it is now a rule

**a flat attribute set is a product already walked and then flattened.** the dimensions that produced
it are still in the names; the flat form hides them, and hides two things beside:

1. **an absent cell** — a 2×2 with three members is a gap you can see; three flat attributes are just
   three attributes
2. **a LIE** — a mis-named subject is invisible flat and lands in the wrong row in a table

⇒ enruled as `rule.require.decompose-attributes-on-common-nouns` + `howto.factor-an-attribute-set`
(this repo), dispatched to the architect as `rhachet-roles-ehmpathy#677`.

⚠️ **the drive read these same four doc blocks while it gathered evidence for the verdict above and
recovered no axis from them.** *"doesn't affect existing"* appeared four times and read as
boilerplate. **the tell was on the page, in evidence already in hand, and went unread** — which is
what makes it worth a rule rather than a note.

## .see also

- `F2` — the shape verdict, and the `publicAccess` objection F11 inverted
- `F10` — the placement verdict this inherits its window from
- `F11` — the `null` semantic that flipped F2's objection
- `rule.require.ubiqlang` · `rule.forbid.ambiguous-labels` · `rule.forbid.domain-term-synonyms`
- `rule.require.decompose-attributes-on-common-nouns` · `howto.factor-an-attribute-set` — the rule
  the second sub-call produced
- `howto.domain-objects-nested-unions` — the nest precedent, now at three levels
