# F15 — `access.public` takes `'blocked'`, never `null`

**rework** clean · **status** 🟢 **RULED — `'blocked'`, 2026-09-10** · **where**
`DeclaredAwsS3Bucket.access.public`

🔴 **raised and ruled in one turn, by the wisher**, immediately after F14 settled the name. F14 chose
the *word*; this chooses the *token for the secure posture*, and the wisher named its criterion:

> **"less surprise defaults"**

⇒ that is `rule.forbid.surprises` — the **principle of least astonishment** — and it is a sharper
criterion than the *"less nulls"* that opened the exchange. **less nulls is a syntax preference;
least astonishment is a rule**, and it decides more than the wisher's own token does.

## .the shape

```ts
access: { public: 'blocked' }                              // not public — all four blocked
access: { public: s3BucketAccessPublicBlocked }            // the same posture, stated
access: { public: { acls:     { block: true, ignore: true },         // a deliberate opt-out
                    policies: { block: true, restrict: false } } }
```

**`access` is REQUIRED and non-nullable. `public` is REQUIRED**, typed
`'blocked' | DeclaredAwsS3BucketAccessPublic`. no `null` occurs in this subtree.

## .why — the criterion, applied

`null` is a **surprise default of the worst kind**: it is the token that looks like *absence* and
means *a value*. under **F11**, `access: { public: null }` silently expands to four `true`s. a reader
who has not read F11 reads *"no value set"* and gets a fully-blocked bucket — correct behaviour,
astonishing spelling.

| house rule | how it reaches this |
|---|---|
| `rule.forbid.surprises` | the wisher's own words. `null` → four `true`s astonishes |
| `rule.forbid.nullable-without-reason` | *"require a clear domain reason for null; if no reason, declare a clear type"* — under F11 `null` encodes a **value**, which is the shape that rule is skeptical of |
| `rule.forbid.ambiguous-labels` | `public: null` reads two ways (*absent* / *secure*); an explicit token reads one |

## 🔴 .the criterion cut ONE NOTCH DEEPER than `false` — the polarity flip

⚠️ **the drive raised this because the wisher's own stated criterion argued against the wisher's own
first token, and that is exactly the case a fulcrum exists to surface.** 🟢 **the wisher then took
`'blocked'`** — so the section below records the argument that moved it, not an open dispute.

`false` removes the *null* surprise and leaves a **second** one in place:

| the line | its sense | the expansion |
|---|---|---|
| `public: false` | not public → **secure** | → `acls: { block: **true**, … }` |
| `acls.block: false` | do not block → **insecure** | — |

⇒ 🔴 **`false` expands to four `true`s, and the same token means opposite postures one line apart.**
`public` is a *noun* predicate; the four sub-fields are *operation* predicates. a reader who carries
the sense down one level reads it backwards. **that is a surprise default by the wisher's own test.**

### the token that has no flip

```ts
access: { public: 'blocked' }     // → acls: { block: true, ignore: true }, policies: { … }
```

`'blocked'` shares the polarity of the two `block` keys, so **the expansion is dull** — which
is the whole aim of least astonishment.

⚠️ **it is NOT F2's rejected two-token literal.** F2 killed `'blocked' | null` because *neither* arm
could hold a partial block. here the **object arm survives**, so round-trip fidelity is identical and
F2's blocker does not reach it. it costs a string where a bool would do.

| token | null surprise | polarity surprise |
|---|---|---|
| `null` (F11, superseded) | 🔴 yes | 🟢 none |
| `false` (the wisher's first) | 🟢 removed | 🔴 **yes** |
| 🟢 **`'blocked'` — TAKEN** | 🟢 removed | 🟢 **none** |

## 🟢 .the verdict — RULED 2026-09-10: `access: { public: 'blocked' }`

the wisher opened with `false`, the drive surfaced the polarity flip, **and the wisher took
`'blocked'` in the same turn.** both surprises are gone:

```ts
access: { public: 'blocked' }                              // → acls: { block: true, … }, policies: { … }
access: { public: s3BucketAccessPublicBlocked }            // the same posture, stated
access: { public: { acls:     { block: true, ignore: true },         // a deliberate opt-out
                    policies: { block: true, restrict: false } } }
```

⇒ **the expansion is dull, which is the whole aim of least astonishment.** `'blocked'` shares the
polarity of the two `block` keys, so a reader who carries the sense down one level reads it
**correctly**.

🟢 **the 2×2 (F14 sub-call 2) makes this asymmetry STRONGER, not weaker.** the secure posture still
costs one token; the public-capable posture now costs **four booleans in two groups**, and a partial
override can no longer hide inside a spread. ⇒ the gap between the cheap path and the exposed one
widened, which is exactly what `rule.require.safe-by-default` asks of it.

🔴 **the type is `'blocked' | DeclaredAwsS3BucketAccessPublic`, and `'unblocked'` must NOT join it** —
see the asymmetry section below. the union's string arm holds exactly one member.

### 🟡 how the fork was actually settled, because the mechanism is worth the record

the drive did **not** pick between two options the wisher offered. it took the wisher's *stated
criterion* — **"less surprise defaults"** — and ran it one notch further than the wisher's own token
did, which surfaced a second surprise the token left in place.

⇒ *a criterion outranks the token that carried it.* the wisher named the test; the test then selected
against the wisher's first answer, and the wisher took the result in one word.

⚠️ **this is the mirror of F14's lesson.** there, *a wisher can change the frame a driver reasoned
inside*. here, **a driver can apply the wisher's own frame past where the wisher applied it.** both
are cheap, and both need the frame stated out loud to happen at all.

## 🔴 .and `public: true` must NOT be legal — a symmetric token is a surprise default too

the symmetric completion invites itself: `true` = all four false = fully public. **refuse it.**

| posture | what it should cost |
|---|---|
| secure | 🟢 **one token** |
| public-capable | 🔴 **four booleans, typed out** |

⇒ `rule.require.safe-by-default`: *"the easiest way to call it is the correct way; a destructive
action takes a deliberate extra step."* a one-word `true` makes the exposed posture exactly as cheap
as the safe one — **the outcome F11 was overruled to prevent, re-introduced through the back door of
symmetry.** the asymmetry IS the pit of success, and c2 already states it in prose.

## 🟡 .the arithmetic — it removes ONE written form, not all of them

⚠️ **stated precisely, because the overclaim invites itself: *"zero nulls, canonicalizer retired."*
that is false.**

| | written forms of *blocked* |
|---|---|
| **before** — nullable `access`, `public: null` | `access: null` · `access: { public: null }` · `…{ public: s3BucketAccessPublicBlocked }` · `…{ public: {four true} }` = **4** |
| 🟢 **after** | `…{ public: false }` · `…{ public: s3BucketAccessPublicBlocked }` · `…{ public: {four true} }` = **3** |

⇒ **the canonicalizer is still owed** — the preset-const arm and the bare-literal arm still serialize
differently without F2's `static nested` clause, and the token arm never enters hydration at all.

🟢 **what it retires is the form F14 introduced**: the outer `access: null`. that was the permadrift
generator flagged on F14's own entry, and this closes it **at the type** rather than in the
canonicalizer — strictly better, since a type cannot be forgotten.

## .the bound — this does NOT generalize to the other three fields

⚠️ *"less nulls"* is right **here** and wrong on the peers. the discriminator is the one this entry
turns on: **does `null` encode a VALUE, or a genuine ABSENCE?**

| field | `null` means | verdict |
|---|---|---|
| `access.public` | 🔴 *the secure default* — a **value** | **replaced by an explicit token** |
| `versions` | never configured — aws returns **no Status at all** (F1) | 🟢 a true absence. keep |
| `abortIncompleteMultipartUploadAfterDays` | no such sub-rule — aws **omits** the key | 🟢 a true absence. keep |
| `expireNoncurrentVersionsAfterDays` | same | 🟢 a true absence. keep |

⇒ **one field changes, three do not.** a blanket null sweep would replace three honest absences with
invented sentinel values — **the same defect this entry fixes, run backwards**, and a louder
violation of the wisher's own criterion.

## .rework — clean

a type change on one field, before any consumer binds. the canonicalizer clause it edits is one this
wish already owed.

## .see also

- `F11` — the `null`-means-secure verdict this converts into an explicit token
- `F14` — the name verdict, and the outer-`null` form this retires
- `F2` — the four-boolean shape; ⚠️ its *"no two-token literal"* clause does **not** reach this,
  because the object arm survives
- `F1` — `versions`, the peer whose `null` is a genuine absence and stays
- `rule.forbid.surprises` · `rule.forbid.nullable-without-reason` · `rule.require.safe-by-default`
