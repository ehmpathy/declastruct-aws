# F17 — the expiry fields take `IsoDuration`, not a bare `number` of days

**rework** clean · **status** 🟢 **RULED 2026-09-10 — `{ days: number } | null`, a narrowed
`IsoDuration`** · **where** every `…AfterDays: number | null` on `DeclaredAwsS3BucketLifecycle`

```ts
/**
 * .what = asserts T is assignable to U at compile time, and evaluates to T
 * .why  = makes the subtype relation a BUILD ERROR when it breaks, never a silent drift
 */
type Assert<T extends U, U> = T;

/** .what = an IsoDuration narrowed to whole days — the only form aws s3 lifecycle expresses */
export type IsoDurationInDays = Assert<{ days: number }, IsoDuration>;

expire: IsoDurationInDays | null;                   // { days: 30 }
```

🟢 **the `Assert` is the ask the wisher made explicit** — *"ensure the type satisfies `IsoDuration`
still; but narrows to `{ days: number }`"*. a bare `type X = { days: number }` would merely CLAIM
the relation; `Assert` **binds** it, so a future iso-time release that breaks it breaks the build
rather than drifts.

🟡 **it was filed as a fulcrum and never was one** — a blocker-grade house rule already decided the
type. what the council DID settle is the half no rule covered: **where the canonicalization
happens.**

🔴 **raised 2026-09-10, by the wisher**, inside every one of F16's six proposals — each wrote
`IsoDuration` where the vision wrote `number`. ⇒ **split from F16 because it reaches the SHIPPED
field too, and so survives whichever reshape F16 takes.**

## 🔴 .why this is filed as a fulcrum and is not one

a fulcrum is a call the drive best-guessed and reserved for the council. **this was never open.** a
blocker-grade house rule already decides it, and the drive wrote `number` anyway across the vision,
the criteria, and every `[tn]`.

> **`rule.forbid.any-time`** — *"do not represent a time/date/duration with an ANY-TIME shape —
> bare `Date`, **number epoch**, ad-hoc time string … as the declared/stored/passed shape"* ·
> *"`duration: number` → `IsoDuration`"* · **severity: blocker**

⇒ it is recorded here rather than repaired silently because **the drive owes the council the fact
that a rule was missed**, not merely the corrected field list.

## .the two conditions that bind it, both verified

| condition | check |
|---|---|
| `iso-time` is a dependency of this repo | 🟢 `package.json:85` — `"iso-time": "1.11.7"` |
| the rule names this exact shape | 🟢 `rule.forbid.any-time`: *"`duration: number` → `IsoDuration`"*, and *"hidden unit — is 5037 dollars or cents? an any-price number never says"* — here, **is 30 days or seconds?** |

⇒ **no exemption applies.** the rule's one carve-out is *"transient input to an `as*` cast at a
boundary"*; these are declared, stored, round-tripped domain fields, which is the case the rule
forbids by name.

## .the shape

```ts
// 👎 the vision as written
expireCurrentVersionsAfterDays:          number | null;
expireNoncurrentVersionsAfterDays:       number | null;
abortIncompleteMultipartUploadAfterDays: number | null;

// 👍 the rule's own prescribed form
expire: IsoDuration | null;   // 'P30D' | { days: 30 }
```

`IsoDuration` accepts either arm — `IsoDurationWords` (`'P30D'`) concise for input,
`IsoDurationShape` (`{ days: 30 }`) easy to manipulate.

## 🔴 .the name consequence — `AfterDays` STOPS to be a legal suffix

this is the part that reaches past a type swap, and it is why F3 is re-opened rather than merely
cited:

- `AfterDays` encodes the **unit** in the field name
- an `IsoDuration` carries its own unit, so the suffix is at best redundant and at worst **false** —
  `expireAfterDays: 'PT12H'` reads as *twelve days* to anyone who trusts the name
- ⇒ `rule.forbid.ambiguous-labels` — **a label that reads more than one way in context = blocker**

**so F3's ruled rename lands on a name this rule then invalidates.** F3 chose
`expireCurrentVersionsAfterDays` to disambiguate *expire what?*; F17 says the `Days` half must go
regardless. 🟢 **the two agree on the substance and F17 finishes the name**: `expire` under an
`objects` / `versions` / `multiparts` key says both *what* and *how long* with no unit in the label.

⇒ **that is an independent argument for F16's reshape**, arrived at from the opposite direction:
F16 reaches it from the domain, F17 from a type rule, and they land on the same field list.

## 🟢 .RULED 2026-09-10 — the type narrows to `{ days: number }`, and three headaches vanish

> **"ok, fine. `{ days: number }`"** — the wisher, after a round-into-days alternative was weighed
> and refused

### ⚫ the alternative that was weighed and refused — ROUND the input into days

the wisher proposed: *"allow full `IsoDuration` but round the value given into days."* 🔴 **refused,
and the criterion is the wisher's own** — F15's *"less surprise defaults"*.

on an EXPIRY field the surprise has a direction, and both directions are a real loss:

| written | rounds to | what happens |
|---|---|---|
| `'PT12H'` | `P1D` | 🔴 **2× the retention asked for** — a silent bill |
| `'PT36H'` | `P1D` or `P2D` | 🔴 **backups deleted early** — silent data loss on a backup store |
| `'P1M'` | `P30D` | the 28/31 ambiguity absorbed, never surfaced |
| `'P4Y'` | `P1461D` | iso-time's `365.25` approximation now treated as exact |

⇒ 🔴 **it does not avoid the headache — it hides it.** the same `toMilliseconds` call, the same
divide, the same `DAYS_PER_YEAR = 365.25` — **minus the one line that tells the caller their input
was not honored.** `rule.forbid.failhide`: a known-inexpressible input, absorbed, reported as
success.

🟡 **and it is not even cheap.** the round must land at CONSTRUCTION, never at write — else
`desired = 'PT12H'` and `remote = { days: 1 }` serialize differently and the permadrift returns. ⇒
a canonicalizer on both sides, which `{ days: number }` retires outright.

| | input | an inexpressible value | new code |
|---|---|---|---|
| 🟢 **`{ days: number }`** | one form | 🟢 unrepresentable | one `isInteger` |
| full `IsoDuration` + throw | any form | 🔴 loud, fix named | canonicalizer + 2-part test |
| ⚫ full `IsoDuration` + round | any form | 🔴 **silent, wrong** | canonicalizer + rounder |

⇒ **the round is dominated on BOTH axes** — most code, least information kept. that is what settled
it.

the wisher, after the two-part test below was described:

> **"how about we just constrain to `{ days: number }` and avoid the rest of these headaches?"**

🟢 **taken.** and it is the correct response to what the two-part test was: **a complexity signal
about the TYPE, which the drive answered with a bigger guard.**

### 🟢 it is still an `IsoDuration` — VERIFIED by compile, not by a read

`IsoDurationShape = PickAny<{years, months, weeks, days, hours, minutes, seconds, milliseconds}>`
(`IsoDurationShape.d.ts:7-16`), `PickAny`'s `days` branch is
`Required<Pick<T,'days'>> & Partial<Pick<T, rest>>` (`type-fns/PickAny.d.ts:7-9`), and
`AsOfGlossary<…, false>` adds only an **optional** `_dglo` (`domain-glossaries/AsOfGlossary.d.ts:42`).

⚠️ **that is three file reads, and a read is an inference.** so it was compiled:

```
src/probe.isodurationindays.temp.ts(27,42): error TS2353:
  'hours' does not exist in type '{ days: number; }'.
```

**one error, line 27 only** — which settles both halves at once:

| the claim | what the output shows |
|---|---|
| `{ days: number }` **is** an `IsoDuration` | 🟢 the `Assert` raised **no** error. a failed constraint reports at the alias |
| the narrow type **is** narrow | 🟢 line 27 errored, and names the resolved type as `{ days: number }` |

⇒ the full run, and the reproduction: `.agent/.notes/probe.isodurationindays-satisfies-isoduration.md`.

🔴 **that is what parts it from the shape `rule.forbid.any-time` forbids.** the rule's target is a
`{ hrs, mins }` bag **outside** the glossary; this is a subtype **inside** it, and the compiler says
so. the rule is satisfied, not evaded.

### 🔴 the false green that came first — and it is a trap for this whole repo

⚠️ **the probe first lived under `.agent/.notes/` and the suite passed WITH a deliberate error
active.** tsconfig declares `"include": ["**/*.ts"]`, and **typescript's wildcard globs skip paths
whose names begin with `.`** — so `.agent/` was never compiled.

🟡 **the trap generalizes:** any `.ts` under `.agent/`, `.behavior/`, or `.dream/` is **silently
excluded from `test:types`**, and a probe placed there always passes.

⇒ the deliberate-error step is what caught it (`rule.require.clamp-edge-cases` — *"prove the clamp
bites"*). **with no bite check, the first green would have been reported to the wisher as a
verification.**

### 🟢 what the narrow type kills — three of the four, at the type

| the headache | under `IsoDuration` | under `{ days: number }` |
|---|---|---|
| **many written forms** — `'P30D'` · `{days:30}` · `'PT720H'` · `'P4W2D'` | a canonicalizer, on both sides | 🟢 **one form. the canonicalizer for this field is not owed** |
| **calendar approximation** — `'P4Y'` = 1461 days by `DAYS_PER_YEAR = 365.25` | refuse `years`/`months` by name | 🟢 **unrepresentable** |
| **sub-day units** — `'PT12H'` | a divisibility check on four components | 🟢 **unrepresentable** |
| **a non-integer** — `{ days: 30.5 }` | a check | 🔴 **still representable. see below** |

⇒ `rule.prefer.prevent-over-correct` **rung 1** for three of four, where the prior verdict sat at
rung 4 for all four.

### 🔴 the fourth is NOT closed by the type, and the entry says so

`number` admits `30.5`. so one guard survives — and it is **one `Number.isInteger` check** in place
of a four-component divisibility test plus a two-name refusal:

```ts
export const isIsoDurationInDays = withAssure(
  (value: IsoDuration): value is IsoDurationInDays =>
    typeof (value as { days?: unknown }).days === 'number' &&
    Number.isInteger((value as { days: number }).days),
  { name: 'isIsoDurationInDays' },
);
```

⇒ `rule.require.assure-via-type-checks` — the paved pattern, and `.assure` throws with the fix named
(`rule.require.errors-name-the-fix`): *"aws expires on whole days; `{ days: 30.5 }` cannot be
expressed."*

### 🟢 and it SHRINKS the wish

| obligation | before | after |
|---|---|---|
| a canonicalizer on both sides of `expire` | owed, new | 🟢 **not owed** |
| a two-part throw (unit names + divisibility) | owed, new behavior the wish did not cover | 🟢 **one integer check** |
| c1's written-form count on this field | four | 🟢 **one** |

### 🔴 .the drive's error, recorded — it tested ONE narrow type and generalized to all

⚠️ **this entry argued, three paragraphs down, that a narrower type "does NOT reach."** that
argument tested exactly one candidate — `IsoDurationWords` — found it still many-to-one
(`'PT720H'` vs `'P4W2D'`), and concluded the whole CLASS fails. **it never tested the shape arm.**

⇒ **one falsified candidate was generalized to a class.** and the drive had F15's lesson in hand
and quoted it on the way past: *"close it at the type rather than in the canonicalizer — strictly
better, since a type cannot be forgotten."*

🔴 **the tell was on the page and the drive wrote it: a guard that needed a two-part test, a
counterexample table, and a named-unit exclusion list.** that complexity was evidence about the
TYPE, and it was answered with a bigger guard. ⇒ **when a validator grows a special case, ask
whether the type is wrong before you ask what else the validator must catch.**

## ⚫ .the prior verdict, superseded — the input is wide, the boundary canonicalizes to `P${n}D`

⚫ **kept for the argument, not the verdict.** it holds wherever a field genuinely needs sub-day or
calendar durations; s3 lifecycle does not.

the wisher's words, and they name the split precisely:

> **"plan should obviously canonicalize at the boundary, whereas the input can be anything. but we
> canonicalize iso duration into the `P${n}D`"**

⇒ **two positions, two rules, and they do not conflict:**

| position | the form | the rule |
|---|---|---|
| the **input** a caller writes | 🟢 **any `IsoDuration`** — `'P30D'` · `{ days: 30 }` · `'PT720H'` | `rule.prefer.defaults-match-common-case` — the ergonomic arm stays available |
| the value **at rest**, which plan compares | 🔴 **exactly `P${n}D`** | `rule.require.guaranteed-idempotency` — one written form, or the plan never converges |

### 🔴 why the canonicalizer is not optional here

`IsoDuration` is a union of two arms, and **each arm alone is already many-to-one**:

```ts
expire: { days: 30 }   // shape
expire: 'P30D'         // words
expire: 'PT720H'       // also words — the SAME duration, a different string
expire: 'P4W2D'        // also words — and also 30 days
```

⇒ four written forms, one state. **permadrift** — `serialize(remote) !== serialize(desired)`, so
`plan` reads UPDATE forever. that is `c1`'s whole subject, one level deeper than F14 found it.

### 🟢 aws fixes the target, so no judgment is left

`Expiration.Days` is an **integer count of days**, so the READ can only ever produce one shape:
`P${n}D`. the canonical form is not a taste — it is the only form the round-trip can return.

| the desired | what the canonicalizer does |
|---|---|
| `'P30D'` | 🟢 already canonical, untouched |
| `{ days: 30 }` · `'PT720H'` · `'P4W2D'` | 🟢 → `'P30D'` |
| `'PT12H'` · `'P1M'` · `'P4Y'` · `{ months: 1 }` | 🔴 **throw** — see the two-part test below |

### 🔴 the throw is a NEW behavior the wish does not cover — 🟢 **TAKEN 2026-09-10**

the wisher: *"sounds good."* aws stores an **integer count of whole days**, so a duration that is
not a whole number of days has no representation, and a silent pick is a lie the plan then
converges to.

⇒ **fail loud, with the fix named** (`rule.require.errors-name-the-fix`, `rule.forbid.failhide`) —
*"aws expires on whole days; `PT12H` cannot be expressed. use `P1D`."*

### 🔴 the test is TWO-part, and the obvious one-part test is WRONG

⚠️ **found by a read of `toMilliseconds.js:14-18`, and it overturns the simpler rule this entry
first implied.** iso-time converts years and months with **approximate** constants, and says so:

```js
// approximate constants for calendar-based durations
exports.DAYS_PER_YEAR  = 365.25;
exports.DAYS_PER_MONTH = 30.44;
// .note = years and months use approximate values (365.25 days/year, 30.44 days/month)
```

so the natural implementation — *"convert to ms, accept if it divides evenly into a day"* —
**passes a duration it must refuse**:

| the input | ms → days | the naive check | the truth |
|---|---|---|---|
| `'PT12H'` | 0.5 | 🟢 rejects | correct |
| `'P1M'` | 30.44 | 🟢 rejects | correct, **by luck** |
| 🔴 **`'P4Y'`** | 365.25 × 4 = **1461, an integer** | 🔴 **ACCEPTS** | 🔴 **wrong** — four real years is 1460 or 1461 days, and the cast picked one |

⇒ **`P4Y` is the counterexample.** an approximation that happens to land on an integer is still an
approximation, and the divisibility check cannot see the difference.

### 🟢 so: refuse the calendar units by NAME, then check divisibility on the rest

| component | verdict | why |
|---|---|---|
| `years` · `months` | 🔴 **throw, always** | iso-time's own ms value is approximate by construction |
| `weeks` · `days` | 🟢 accept | a week is exactly 7 days — no calendar dependency |
| `hours` · `minutes` · `seconds` · `milliseconds` | 🟡 **accept iff it divides evenly into a day** | `'PT48H'` = 2 days 🟢 · `'PT12H'` = 0.5 days 🔴 |

⚠️ **and the shape arm carries the same units** — `IsoDurationShape` is
`PickAny<{years, months, weeks, days, hours, minutes, seconds, milliseconds}>`
(`IsoDurationShape.d.ts:7-16`), so `{ months: 1 }` and `{ hours: 12 }` are legal inputs and the
guard must read the **shape**, never the string.

🟢 **that is a feature of the change, not a cost.** with `number` the caller cannot even ask for
`PT48H`; with `IsoDuration` they can ask, the legal ones convert, and the rest get one clear error.

### 🟢 the precedent is already in this repo, on the identical defect

`asDecimalAmountCanonical` (`src/domain.operations/budget/asDecimalAmountCanonical.ts`) exists
because **aws Budgets echoes `"21"` back as `"21.0"`** — its own `.why`, verbatim:

> *"left as-is, the cast-of-actual would never equal the declared value, so a re-plan would show
> perpetual drift and the budget would never converge to KEEP"*

⇒ **same defect, same fix, one field over.** so `asCanonicalIsoDurationInDays` is not a new pattern
— it is this repo's extant answer applied to a second many-to-one field.

⚠️ **and the peer's `.note` names the discipline to copy**: *"declared amounts should already be in
this canonical form … this cast guarantees the READ side matches."* ⇒ **canonicalize BOTH sides.**
to canonicalize the read alone leaves `{ days: 30 }` on the desired side and the drift returns.

### ⚠️ the narrower type was considered and does NOT reach

F15's own argument is *"close it at the type rather than in the canonicalizer — strictly better,
since a type cannot be forgotten."* it fails here on one fact: **`IsoDurationWords` alone is still
many-to-one** (`'PT720H'`, `'P4W2D'`). a narrow type would buy a worse input arm and save no work.

## .the aws boundary — the cast, and it is one line

aws speaks days. so the sdk layer casts, exactly as `rule.forbid.any-time` prescribes:

```ts
// read  — getBucketLifecycle.ts:49 — aws gives an integer, so the canonical form falls out
expire: rule.Expiration?.Days ? (`P${rule.Expiration.Days}D` as IsoDurationWords) : null

// write — putBucketLifecycle.ts:82 — the canonicalizer already threw on an inexpressible one
{ Expiration: { Days: asCanonicalIsoDurationInDays({ of: input.expire }) } }
```

🔴 **the canonicalizer runs on the DESIRED side too**, at construction — that is the half a
read-only cast misses, and the peer's `.note` says so in as many words.

## .rework — clean, on the same window as F3 and F16

a type change on three fields. ⚠️ one of them is shipped, so it rides the break A-1 already forces
this release (F3's *"break once"* table). clean until `ahbode/infrastructure#35` binds to `1.12.0`.

## .the propagation this owes

🔴 **wider than a normal fulcrum**, because it was never guessed — it was missed. the drive wrote
`number` in every downstream artifact:

- `1.vision.yield.md` — the demo block and the field table
- `2.1.criteria` — every bdd `[tn]` that names a `…AfterDays` value
- `1.vision.experience.case=1` — the wish snippet and the serialize diff
- the wish's own `blocker/1.vision.md` field list

## .see also

- `F3` — the rename this finishes; F3 removed the ambiguity of *expire what*, F17 removes *how long*
- `F16` — the reshape this independently argues for, from a type rule rather than the domain
- `rule.forbid.any-time` (**blocker**) · `rule.require.iso-time` · `rule.forbid.ambiguous-labels`
  (**blocker**) · `rule.require.errors-name-the-fix` · `rule.require.trust-but-verify`
