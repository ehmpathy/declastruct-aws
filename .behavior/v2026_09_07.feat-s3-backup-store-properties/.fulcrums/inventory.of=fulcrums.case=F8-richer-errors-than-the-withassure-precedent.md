# F8 — richer errors than the `withAssure` precedent

**rework** clean · **status** 🟢 **RULED 2026-09-09 — CONFIRMED on axis one by the council; axis two
CLOSED by the drive on a measurement** · **confidence** ~~72%~~ → settled on both axes
**where** case=3, case=4, **and** case=6 — every error this wish renders, not one boundary

⚠️ **found by the r1 self-review, not by the first pass.** the first pass asserted an error shape
without a check against the precedent it cited.

⚠️ **scope and confidence both revised by defect 26.** this fulcrum was scoped to *"case=4, the
sdk-read boundary"* and weighed exactly one axis — **how much content** an error carries. two things
were wrong with that:

1. **the scope was too narrow.** the same question governs case=3's rejection throw and case=6's
   apply-time denial. all three render the same invented shape, so a verdict on case=4 alone would
   leave two artifacts inconsistent with whatever is decided.
2. 🔴 **a second axis was never weighed at all — the VOICE.** all three cases render
   `🐢 bummer dude` + `what:/why:/fix:` prose lines. that voice is real, and **all 17 of its uses are
   bash-skill stdout**. a thrown TypeScript error in this repo goes through `helpful-errors`, whose
   contract is `(message, metadata?)` and which emits *one message line plus serialized metadata*.
   ⇒ **the voice was not chosen over an alternative; it was carried over from the wrong surface** —
   an F10-style decision by omission, inside a fulcrum whose whole subject is error shape.

⇒ confidence drops 78% → **72%**: the *content* argument below is unchanged and still holds, but the
fulcrum now carries an axis on which no case was ever made.

## .the fork, stated fairly

the wish's last acceptance bullet: *"an unmodeled aws value fails loud at the sdk-read boundary,
**per the precedent `isDeclaredAwsS3StorageClass` already sets in this package**."*

that precedent's live output is on record in
`src/domain.operations/s3Bucket/__snapshots__/castIntoDeclaredAwsS3Bucket.test.ts.snap`:

```
assure.rejection: input does not satisfy type.check 'isDeclaredAwsS3StorageClass'

{ "check": "isDeclaredAwsS3StorageClass", "input": "ONEZONE_IA" }
```

it names the **check** and the **rejected value**. it does not name the modeled set, the bucket,
or the fix.

| option | |
|--------|---|
| **(a)** match the precedent exactly — bare `withAssure` rejections | symmetric, zero new code, verbatim what the wish asked for |
| **(b)** wrap in a `HelpfulError` that adds the modeled set, the bucket, and the next move | better ergonomics; **a deviation from the cited precedent** |
| **(c)** (b) for the new checks, (a) left alone for the extant one | richer where it matters; an asymmetric family |

## .taken — (b), and flagged

case=4's demo renders the (b) shape. the case now marks it explicitly as a **proposal**, with the
precedent quoted beside it.

## .why, at the time

1. **the read boundary is where a human has least context.** "input `SomeFutureState` does not
   satisfy `isDeclaredAwsS3BucketVersionsStatus`" leaves them to grep for the modeled set. the
   ergonomist's `rule.require.errors-name-the-fix` grades a symptom-only error a **blocker**.
2. **the stakes here are higher than the storage-class case.** an unmodeled
   `NewerNoncurrentVersions` is one replace-all put away from the silent destruction of a
   consumer's config. that failure earns more words than a mistyped storage class.
3. **the wish's `.what` outranks its `.how`.** "fails loud" is authoritative; "per the precedent"
   points at *the mechanism* (a `withAssure` type-check at the read boundary), which (b) keeps.
   only the message text differs.

## .the honest counter

**(a) is a completely defensible read of the wish**, and it is what a literal read asks for. it
also keeps one family symmetric (`rule.require.symmetry-with-peer-resources`). if (b) wins, (c) is
the trap to avoid — an asymmetric family is worse than either pure option, so the extant
storage-class check should be lifted to the same shape.

## .rework, and why it is clean

an error message is the cheapest item in the wish to change. the one cost is a **snapshot
update** — `castIntoDeclaredAwsS3Bucket.test.ts.snap` holds the current text verbatim, so any
change to it is visible in review (which is the point of the snapshot).

## .the second axis — the voice, on which no option was ever weighed

| option | |
|--------|---|
| **(v1)** the `helpful-errors` render — `(message, metadata)`, one line + serialized metadata | what every extant `src/` throw already emits; zero new machinery; the metadata keys are greppable and machine-readable |
| **(v2)** the `🐢 bummer dude` + `what:/why:/fix:` block, as all three cases currently draw | warmer, and matches what a human sees from `rhx` skills — **but no TypeScript throw in this repo renders this way**, so it would need a new formatter, and it would be the only one |

⚠️ **(v2) is what the demos show, and it was never argued for** — it was inherited from the skills
surface because that is where `🐢 bummer dude` was found. a council that rules on content richness
and skips this axis leaves three artifacts drawn in a shape the code cannot emit.

⇒ the axes are **independent**: one may take (b) rich content in the (v1) render — a `BadRequestError`
whose metadata carries `why`/`fix`/the modeled set — which is what case=3's corrected block now
shows. **richness does not require the bash voice.**

## .the verdict

🟢 **RULED 2026-09-09 — the council CONFIRMED the best-guess: richer metadata than `{ check, input }`.**
the errors this wish renders carry the field, the value, the modeled set, and the fix — not the
bare two-key shape the `withAssure` precedent emits.

### what the verdict binds

| | |
|---|---|
| 🟢 **(b) on axis one** | the new errors are richer than the precedent |
| 🔴 **so the extant storage-class check is now the ASYMMETRIC one** | the entry named this as (b)'s cost and it is now owed: lift it to match, or the family carries two error shapes with no rule that says which is which (`rule.require.symmetry-with-peer-resources`) |
| 🟢 **(v1) on axis two** | the errors render through `helpful-errors` — one message line plus serialized metadata. **no new formatter** |
| 🔴 **so the extant storage-class check is now the ASYMMETRIC one** | the entry named this as (b)'s cost and it is now owed: lift it to match, or the family carries two error shapes with no rule that says which is which (`rule.require.symmetry-with-peer-resources`) |

### 🟢 axis two — CLOSED BY THE DRIVE 2026-09-09, on a measurement rather than an ask

the drive measured the package instead of a fourth hand-up:

| measured in `src/` | count |
|---|---|
| `🐢` / a bash-skill voice in a thrown error | **0** |
| `helpful-errors` throws | **23 across 10 files** |

⇒ `rule.require.symmetry-with-peer-resources` reaches (v1) **unopposed**. no rule and no wish clause
argues for (v2), so this was never a wisher's fork — `howto.navigate-fulcrum-choices`: *a fork is a
wisher's when the rules conflict, never merely because the driver feels unsure.*

🟢 **and axis one already bought the richness.** the `why`/`fix`/modeled-set content the council
confirmed lives in the **metadata**, which costs no new formatter. **richness never required the
bash voice.**

⇒ owed at execution: `case=4` and `case=6` take `case=3`'s corrected block. the `🐢 bummer dude`
shape is retired to `../archive/shapes-considered-and-rejected.md`.

🔴 **the axis-two gap was a driver defect, not a council one.** the question offered was *"richer
metadata — yes or no?"*, which is axis one alone. the entry's own head line says the fork runs on
**both axes**, and the ask collapsed it to one. ⇒ *an itemized fulcrum states its axes; the ask that
carries it to a human must state the same number of them.*
