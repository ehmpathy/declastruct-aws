# F18 — `versions.expire` takes a COUNT beside its age

**rework** 🟢 **clean** · **status** 🟢 **RULED — the wisher's own call** · **confidence at the
guess** 71% · **where** `DeclaredAwsS3Bucket.lifecycle.versions.expire`

🔴 **raised 2026-09-13, by the wisher: *"could we expire after N versions instead of days?"*** — and
the answer is yes, aws carries both in one container, so the question is what our shape calls the
count and where it sits.

## .the evidence — aws binds the two into ONE container

`@aws-sdk/client-s3` `models_0.d.ts:6537-6562`:

```ts
export interface NoncurrentVersionExpiration {
  NoncurrentDays?: number | undefined;            // age
  NewerNoncurrentVersions?: number | undefined;   // count
}
```

> *"Specifies how many noncurrent versions Amazon S3 will retain … Amazon S3 will permanently delete
> any additional noncurrent versions **beyond** the specified number to retain."*

⇒ 🔴 **the count is a FLOOR, not a threshold**, and that one word settles the name.

## .the name — `keep`, not `over`

the drive proposed `expire: { over: 5 }` and the wisher struck it: **"yes! keep!"**

| | `over: 5` | `keep: 5` |
|---|---|---|
| reads as | *"expire once there are more than 5"* — a threshold | *"retain 5"* — a floor |
| aws's own word | *"how many … to retain"* | ✅ the same word |
| under *"delete beyond N"* | ambiguous — is the 5th kept or deleted? | unambiguous — the 5 newest stay |

🟢 **and `keep` is correct whichever way the COMBINED semantics turn out.** the open doc question is
whether `keep` is a floor the `days` rule cannot cross (*"5 newest survive even at 400 days old"*) or
merely a second condition. **`keep` reads right under both readings; `over` reads right under one.**

⇒ **the same move that retired A-3: where a question is expensive to answer, design it away rather
than ask it.** the doc read is still owed at `2.1.criteria` — it settles the `.note`, no longer the
name.

## .the shape — a union, so `{ after: null, keep: null }` is UNTYPEABLE

```ts
expire: null                                          // keep every version, forever
      | { after: IsoDurationInDays; keep: number | null }
      | { after: null;             keep: number }
```

⇒ it reads as a sentence: **`expire: { after: { days: 30 }, keep: 5 }`** — *expire after 30 days,
keep the 5 newest*.

### 🟡 the age key is `after`, never `days`

the first render wrote `{ days: IsoDurationInDays, … }`, and **F17 had already narrowed
`IsoDurationInDays` to `{ days: number }`** — so the field spelled itself twice:

```ts
expire: { days: { days: 30 }, keep: null }   // 👎 the collision F17 set up
expire: { after: { days: 30 }, keep: null }  // 👍
```

🟡 **`after` is this domain's own word for the age axis** — the flat field F3 and F16 decomposed was
`expireAfterDays`. so the fix is a recovery, not a coinage (`rule.require.ubiqlang`).

⚠️ **and the collision was invisible until a demo was written out.** the type reads fine; the call
site is where `days: { days: 30 }` appears. ⇒ *a nested value type can collide with the key that
holds it, and only a rendered call site shows it.*

🔴 **the flat-object alternative was rejected on F14's own lesson.** `expire: { after, keep } | null`
with both nullable admits **two written forms of one state** — `expire: null` and
`expire: { after: null, keep: null }` both mean *keep every version* — which is a permadrift
generator and a canonicalizer clause owed.

⇒ the union makes the all-null arm **unrepresentable**, which is `rule.prefer.prevent-over-correct`
**rung 1** where the canonicalizer sits at rung 3. ⚠️ **it is F16's own move, one level down** — the
forced `status` key made *"versions on, expiry forgotten"* untypeable; this makes *"an expiry rule
that expires nothing"* untypeable.

### 🟡 the sub-call — `keep` is REQUIRED-nullable, and the alternative is named

the common case is *"expire at 30 days, no count rule"*, and under the shape above it costs a typed
`keep: null` on every declaration:

```ts
versions: { status: 'enabled', expire: { after: { days: 30 }, keep: null } }
```

**taken, on two grounds already settled here**: `rule.forbid.undefined-inputs` is blocker-grade for a
declared field, and **F5 ruled the forced typed-out `null` IS the guard** — the same argument, one
level down.

⚠️ **and the counter is real, so it is recorded rather than argued away.** F5's `null` is forced
because an omitted `expire` is a **cost leak**; an omitted `keep` is not — `days: 30` already bounds
the pile, so the force buys no safety here and costs a keystroke on every wish.

⇒ the ready alternative is `keep?: number` — legal, since `rule.forbid.undefined-inputs` exempts a
public contract in `src/contract/`, and it adds **no written form** because `serialize` drops
`undefined`. **the call goes to `2.1.criteria` with the ergonomics of the real call sites in view**;
this vision takes the stricter arm so no demo reads as though the key were optional.

## 🔴 .the sibling shape was rejected for the OPPOSITE reason to F14's

the other candidate put `keep` beside `expire` rather than inside it:

```ts
versions: false | { status, expire: IsoDurationInDays | null, keep: number | null }   // 👎
```

⇒ 🟡 **it also dodges the `after` collision by accident, which is a tell in its own right**: a shape
that reads better only because it flattened a real group has traded a name defect for a model defect.

it buys one written form per state and costs the **grouping aws's own container declares**.
`NoncurrentVersionExpiration` holds both fields and its doc binds them; to split them into siblings
is to flatten a real group.

⇒ ⚠️ **that is the inverse of the error F14 sub-call 2 corrected, in the same drive.** F14 found a
group the flat names hid; this one would hide a group the container already names. **the tell is the
same in both directions: read what the docs group, not what the names suggest.**

🟡 the cost is real and stated: `versions.expire` is now an object where its two siblings
`objects.expire` and `multiparts.expire` stay `IsoDurationInDays | null`. **the asymmetry is aws's,
inherited** — only noncurrent versions have a count to retain.

## 🟢 .what was NOT settled — all three closed 2026-09-21, by ONE user-guide fetch

| | |
|---|---|
| 🟢 ~~**A-10**~~ — does aws accept a `NewerNoncurrentVersions`-only rule, with no `NoncurrentDays`? | 🟢 **YES — conditionally, and this row's own disposition was wrong.** it read *"not closable by a doc read; needs one live apply"*; the s3 user guide states it outright: *"you must **also provide a `<Filter>` element**. If you don't … Amazon S3 generates an `InvalidRequest` error."* ⇒ the constraint is **not** the one A-10 asked about — the count-only arm is legal, and what it needs is a Filter. ✅ `putBucketLifecycle.ts:84` sends `Filter: { Prefix: '' }` unconditionally, so the `{ after: null, keep }` arm applies cleanly. a `.note` now pins that line: a conditional Filter would break every `keep` declaration. ⚠️ **numbered A-10, not A-7** — A-7 is retired, and a retired id is still a cited id (`case=9` names it four times) |
| 🟢 ~~the combined semantics~~ | 🟢 **an AND** — *"For the deletion to occur, both the `<NoncurrentDays>` **and** the `<NewerNoncurrentVersions>` values must be exceeded."* ⇒ `keep` **IS** a floor `after` cannot cross, so the name holds. ⚠️ **and the `.note` it settles corrects a misread the doc-comment INVITED**: `{ after: {days:30}, keep: 5 }` reads as two independent rules, so a reader expects a 40-day version deleted — it is **retained** if it is among the 5 newest |
| 🟢 ~~the range guard~~ | 🟢 **ALREADY LIVE**, verified at `asS3BucketLifecycleParams.ts:45-56` — a `BadRequestError` on any `keep` that is not a whole number in 1-100, with a `fix:` line. ⇒ *the row was owed when it was written and was closed in execution before this read; an owed-list is checked against the code, never against its own memory* |

## .rework — clean

no consumer has bound. `versions` is new in this wish; `expire` under it is new; `keep` is new inside
that. a change to any of the three is a re-author of one interface.

## .see also

- `F16` — the lifecycle reshape this extends, and the forced-key precedent the union arm reuses
- `F17` — the `IsoDuration` unit, and the `{ days: 0 }` range guard this inherits
- `F14` — the group-vs-flat lesson, run in the opposite direction
- `A-3` — the prior instance of *design the question away rather than ask it*
- `rule.prefer.prevent-over-correct` (ergonomist) — the ladder, and why the union beats the canonicalizer
