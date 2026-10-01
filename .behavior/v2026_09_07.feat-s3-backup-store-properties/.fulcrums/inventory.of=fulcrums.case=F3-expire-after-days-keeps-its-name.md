# F3 — `expireAfterDays` keeps its name

**rework** clean *(now)* · **status** 🔴 **RULED — FLIPPED to (b) by the drive** (2026-09-09) · **confidence** ~~80%~~ → settled · **where** `DeclaredAwsS3BucketLifecycle`

## .the fork, stated fairly

`1.11.0` shipped `expireAfterDays`, which expires **current** versions. this wish adds a second
expiry. once both exist, the shipped name is ambiguous — *expire what?*

| option | | |
|--------|---|---|
| **(a)** keep `expireAfterDays`; the new field carries `Noncurrent` in its name | no break | the shipped name stays ambiguous on its own |
| **(b)** rename to `expireCurrentVersionsAfterDays` | symmetric, unambiguous | **a breaking change to a shipped public field** |

## .taken — (a), with the new names verbose and exact

```ts
expireAfterDays: number | null;                              // unchanged (current versions)
abortIncompleteMultipartUploadAfterDays: number | null;      // new
expireNoncurrentVersionsAfterDays: number | null;            // new
```

plus a `.note` on `expireAfterDays` that names what it expires.

⚠️ **and that note is not an ADDITION — it is a CORRECTION.** the field already carries one, read
verbatim at `DeclaredAwsS3BucketLifecycle.ts:26`:

```ts
/**
 * .what = days after object creation before it expires (is deleted)
 * .note = null = never expire (keep in the coldest class forever)
 */
expireAfterDays: number | null;
```

🔴 **this wish makes that note false.** with `expireNoncurrentVersionsAfterDays` present, `null` no
longer means *"never expire … forever"* — it means *never expire the **current** version*, while
noncurrent versions may still be pruned on their own schedule. so option (a) does not merely leave a
name ambiguous and pay a doc line: **it obliges an edit to shipped documentation that this change
invalidates.** the cost of (a) was understated, though it remains far below (b)'s source break.

## 🔴 .the argument this fulcrum never made — A-1 already breaks the release

⚠️ **added by the `has-questioned-requirements` self-review.** the case for (a) rests on *"a break
costs every consumer"*, and the case for (b) rests on *"the shortest clean window"*. **neither cites
A-1**, and A-1 is decisive.

**A-1 breaks consumer source this release, whatever this fulcrum decides.** the four new fields are
required-nullable per `rule.forbid.undefined-inputs`, so *"a `1.11.0` wish that omits the four does
not typecheck against `1.12.0`"* — and the vision proves it with this package's **own** acceptance
fixture, `resources.acceptance.ts:826-836`, which declares `mailStore` with only two lifecycle fields
and must be edited.

⇒ so the objection to (b) — *"it breaks consumers"* — describes a cost **already paid**:

| | (a) keep the name | (b) rename |
|---|---|---|
| does the consumer edit their wish this release? | **yes** — A-1 forces it | **yes** — A-1 forces it |
| how many lines? | four field additions | four field additions **+ one rename** |
| how many releases that break source must they absorb? | one now, and **a second later** if the council ever wants (b) | **one, ever** |

**if you are about to break source once, break once.** the marginal cost of (b) is one more line in
an edit the consumer is already committed to; the cost of deferral is a second coordinated upgrade.

⚠️ **the counter-argument deserves a fair test, and is weaker.** one could hold that a release should
carry the **minimum** break, so A-1's necessity is no license for an optional rename. but that
optimizes the count of changed **lines**, and what actually costs a consumer is the count of releases
that break source — which (b)-now reduces from two to one.

⇒ **Q-4 re-frames**: not *"rename or not?"* but ***"the break is already paid — is there a reason to
spend a second one later?"***

## .why, at the time

1. **a break costs every consumer; the ambiguity costs a doc line.** ⚠️ **this premise is what the
   section above overturns** — under A-1 the break is not avoidable, only postponable.
   `rule.forbid.term.addition.ambiguous`
   is real, but the disambiguation the pair needs is carried by the *new* name. a reader who sees
   `expireNoncurrentVersionsAfterDays` beside `expireAfterDays` infers the split.
2. **the two new names mirror the extant `…AfterDays` suffix**, so the family reads as one
   (`rule.require.symmetry-with-peer-resources`).
3. `abortIncompleteMultipartUploadAfterDays` is long. **it is aws's own noun phrase**, and
   "multipart" is the word a searcher would grep for when a bill shows stranded parts.

## .rework — clean now, dirtier later

a rename is clean **today**: no published consumer binds the field beyond `1.11.0`'s own
acceptance fixture. it gets dirty the moment `ahbode/infrastructure#35` ships against it. **so
this is the fulcrum with the shortest clean window** — if the council wants (b), it should say so
at this council, not the next.

## .the verdict

🔴 **CLOSED BY THE DRIVE 2026-09-09 — FLIPPED to (b), RENAME to `expireCurrentVersionsAfterDays`.**
a house rule decides it, and the entry's own analysis already pointed here.

⚠️ **it was put to the wisher as Q-4 and should not have been.** two things it needed were both in
hand: the A-1 argument (in this file, three sections up) and a blocker-grade rule (below).

### the rule that settles it

`rule.forbid.ambiguous-labels` (ergonomist) — *"no name, flag, field, or output label may read more
than one way… **a label that reads more than one way in context = blocker**."* its own test:

> *"can a human read this label exactly one way, without context?"*

with `expireNoncurrentVersionsAfterDays` present, `expireAfterDays` answers **no** — *expire what?*
that is not a nitpick in this canon; it is the rule's stated blocker.

⇒ and reason 1's defense (*"the disambiguation is carried by the new name"*) is exactly the
inference-from-a-sibling that the rule refuses: a label must read one way **on its own**.

### why the objection is already spent

the sole cost of (b) is a source break — and **A-1 breaks source this release regardless**, proven
by this package's own fixture (`resources.acceptance.ts:826-836`). the table three sections up
shows (b) dominating (a) on every row: same edit, one more line, **one** breaking release instead
of two.

🔴 **and this is the fulcrum with the shortest clean window** — clean until `ahbode/infrastructure#35`
ships against it, dirty after. a deferral here is the one deferral on this route that expires.

### what the rename binds

```ts
expireCurrentVersionsAfterDays: number | null;   // renamed from expireAfterDays
expireNoncurrentVersionsAfterDays: number | null;
abortIncompleteMultipartUploadAfterDays: number | null;
```

⚠️ the shipped `.note` at `DeclaredAwsS3BucketLifecycle.ts:26` (*"null = never expire … forever"*)
is **made false by this wish** whichever option is taken, and is owed a correction either way.

⇒ ⚠️ **the council may still overrule** — this is a name, and a wisher who wants the minimum diff
may prefer (a) knowingly. what changed is that it is no longer an open question with no default.
