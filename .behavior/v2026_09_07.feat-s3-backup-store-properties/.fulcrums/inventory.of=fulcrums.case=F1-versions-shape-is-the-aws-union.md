# F1 — `versions` is the aws union, not a boolean

**rework** clean · **status** 🟢 **RULED — CONFIRMED by the drive** (2026-09-09) · **confidence** ~~95%~~ → settled · **where** `DeclaredAwsS3Bucket.versions`

🟢 **the gerund exemption this line claimed was RETIRED by the council, 2026-09-09.** aws's own
symbols keep the api's letters; **our field is `versions` and our status union is
`DeclaredAwsS3BucketVersionsStatus`**. the rename is applied across the route (F12).

⚠️ **F10 settled the PLACEMENT, and it is not this fork's subject** — the union is a **nested field**
on `DeclaredAwsS3Bucket`. the shape below is unaffected; only its home was ever in question.

## .the fork, stated fairly

the wish names this undecided: *"`'Enabled' | 'Suspended' | null` maps the aws states directly; a
boolean reads nicer and cannot express Suspended. your call."*

| option | reads | can express Suspended |
|--------|-------|-----------------------|
| **(a)** `'Enabled' \| 'Suspended' \| null` | verbose, exactly aws's words | yes |
| **(b)** `boolean` (+ `null`?) | nicer at the call site | **no** |

## .taken — (a), the union

with a `withAssure` guard over one runtime const array — a mirror of `isDeclaredAwsS3StorageClass`.

⚠️ **the names below are the CORRECTED ones — the first pass's did not match the precedent it
claimed to mirror** (defect 27). the precedent, read in full at
`DeclaredAwsS3BucketLifecycleTransition.ts:9-33`, is a **trio that shares one noun**:

```ts
export const DECLARED_AWS_S3_STORAGE_CLASSES = [...] as const;          // NOUN = StorageClass
export type DeclaredAwsS3StorageClass = (typeof DECLARED_AWS_S3_STORAGE_CLASSES)[number];
export const isDeclaredAwsS3StorageClass = withAssure(…, { name: 'isDeclaredAwsS3StorageClass' });
```

so, with the noun held as **`Status`** — aws's own symbol (`BucketVersioningStatus`, and the
`Status` field of `GetBucketVersioningOutput`), not the invented `State`:

🟢 **renamed 2026-09-09 to obey the council's name verdict** — the trio is ours, so it takes
`Versions`, never the gerund:

```ts
export const DECLARED_AWS_S3_BUCKET_VERSIONS_STATUSES = ['Enabled', 'Suspended'] as const;
export type DeclaredAwsS3BucketVersionsStatus =
  (typeof DECLARED_AWS_S3_BUCKET_VERSIONS_STATUSES)[number];
export const isDeclaredAwsS3BucketVersionsStatus = withAssure(
  (value: string): value is DeclaredAwsS3BucketVersionsStatus =>
    (DECLARED_AWS_S3_BUCKET_VERSIONS_STATUSES as readonly string[]).includes(value),
  { name: 'isDeclaredAwsS3BucketVersionsStatus' },
);
```

⚠️ **these were repaired ahead of the rest deliberately** — they are the code F1 hands to
execution, and a wrong identifier there is copied into `src/`, where the rename stops to be clean.
🟢 the axis-B coordinate followed the same day, once the council overruled F12.

🟢 **and the council settled the sub-question this section used to leave open.** it read: *the
precedent drops its container path (`DeclaredAwsS3StorageClass`, not
`…BucketLifecycleTransitionStorageClass`), so the name here could shorten — a coin-flip worth a
council glance.* the glance came, and it landed elsewhere entirely: **the fork was never
long-vs-short, it was gerund-vs-noun.** `Bucket` stays — it is part of aws's own operation name
(`Get/PutBucketVersioning`), not a container we added.

⇒ 🔴 **the instructive part: a fulcrum framed on the wrong axis still got ruled, because it was
ITEMIZED.** the entry asked *"long or short?"*, the council answered a question it had not been
asked, and the answer settled the entry anyway. *a fork you frame badly is still better than a fork
you never write down.*

🔴 **note the prose/symbol split.** aws uses *both* words: `Status` as the api symbol, and
*"versioning state"* in its reference prose (*"If the versioning state has never been set…"*). so
**prose in these artifacts may say "state"; the symbols must say `Status`.** that is not a
contradiction — it is aws's own usage, matched exactly.

## .why, at the time

1. **a boolean cannot round-trip a suspended bucket.** `Suspended` is a state a bucket can be
   *found* in — someone suspends it in the console. a boolean model must map it to `false`, then
   the plan reads UPDATE, and the apply either writes `Enabled` or writes no change at all.
   **that is a permadrift**, and permadrift is the wish's stated acceptance criterion. this alone
   decides it.
2. **the shape names the one-way door.** three states make invariant I-1 (`Enabled → null` is
   unreachable) a statement about a union. a boolean makes `false` ambiguous between "never
   versioned" and "suspended", so the invariant becomes unstateable.
3. **precedent.** `isDeclaredAwsS3StorageClass` already sets this exact pattern in this package,
   and the wish's last acceptance bullet cites it by name.

## .rework, and why it is clean

a retype of one field plus its guard, before any consumer binds. `ahbode/infrastructure#35` is
blocked on this release, so no published consumer holds the old shape.

## .the invariant this fixes

**I-1** — the model must not offer `Enabled → null`. see cell 6 and `case=3`.

## .the verdict

🟢 **CLOSED BY THE DRIVE 2026-09-09 — CONFIRMED. the WISH answers it, so it was never a fulcrum.**

the wish's decisive criterion is stated outright: *"add them such that a **plan → apply → plan
converges to KEEP**."* a bucket aws reports as `Suspended` is one console click away and has **no
representation** in a boolean. so under a boolean it reads back as one of:

| the boolean read | what the plan then does |
|---|---|
| `true` — suspended counts as versioned | KEEP, and the bucket is **not** versioned. a **false KEEP** |
| `false` — only `Enabled` counts | UPDATE forever: the put re-issues, the read still says `Suspended`. **permadrift** |

⇒ **both violate the decisive criterion**, so the boolean is not a fork the wish left open — it is a
shape the wish's own acceptance bullet forbids. `howto.navigate-fulcrum-choices`: *impliedly
answered by the wish — take that answer, it was never a fulcrum.*

⚠️ **this entry never carried a `Q` number, and correctly so.** what was wrong was to hand it to the
wisher as though it awaited them. **a fulcrum the wish answers is a fulcrum the driver closes.**
