# F9 — a partial public-access block throws, where the peer precedent falls back

**rework** clean · **status** 🟢 **RULED 2026-09-09 — OVERRULED to (b)** · **confidence** ~~72%~~ → settled
**where** case=4 `[t2]`, the sdk-read boundary

⚠️ **found by the r1 self-review, not by the first pass.** the first pass chose "throw" with no
knowledge that this repo had already faced the identical fork and chosen otherwise.

## .the fork, stated fairly

`PublicAccessBlockConfiguration` types all four booleans as **independently optional**
(`models_0.d.ts:10155-10182`), so a block with one boolean absent is representable on the wire. what
should the read do?

the repo's answer is on record — for a structurally identical aws sub-block.
`asDeclaredAwsEc2InstanceMetadataOptions.ts:45-57` **falls back per-sub-field**, and argues it:

> *"a PARTIALLY-present block is not a shape AWS emits (once the block is present AWS populates all
> three sub-fields), so an absent sub-field in a partial block is not an 'unknown posture' to
> assume-worst about — it is unreachable in practice, and the secure fallback is only a
> total-function guard for the impossible partial."*

note what that precedent does **not** do: it does not treat every absent as one signal. a **wholly**
absent block takes an honest insecure read (`ec2InstanceMetadataOptionsAwsImplicit`), precisely so a
pre-feature resource plans a change instead of a false KEEP. only a **partial** block — the shape
aws never emits — takes the fallback.

| option | |
|--------|---|
| **(a)** throw on any absent sub-field | loud; treats the impossible as a defect to surface |
| **(b)** fall back per-sub-field to the safe value, per the peer precedent | symmetric with the closest peer; a total function |
| **(c)** default an absent boolean to `false` | 🔴 **rejected outright** — invents a value aws never sent, then diffs our invention |

## .taken — (a), and flagged · ⛔ **SUPERSEDED — see `.the verdict`**

case=4 `[t2]` rendered the throw, with the precedent quoted beside it. 🔴 **it no longer does** — the
council overruled this to **(b)**, and `[t2]` was re-rendered the same day.

## .why, at the time — ⚠️ **reason 1 was later FALSIFIED by F11**

1. **the stakes differ from the peer's.** the metadata-options fallback lands on the **secure**
   value, so a wrong guess is safe. there is no comparably safe guess here: `true` invents a block
   aws did not report, `false` invents an exposure. the peer's argument leans on the existence of a
   safe fallback, and that leg does not carry over.
2. **an unreachable shape that arrives anyway is information.** if aws ever does emit a partial
   block, (b) absorbs it silently and (a) tells us. for a property whose failure mode is *silent
   public exposure*, the loud read is the conservative one.
3. **the peer's own reason is empirical, not structural** — *"aws populates all three"* is a claim
   about today's api. `case=4`'s whole thesis is that aws's shape is aws's to change.

## .the honest counter

**(b) is a live, reasoned, shipped precedent in this package, and (a) breaks symmetry with it**
(`rule.require.symmetry-with-peer-resources`). the peer author wrote a paragraph in defense of the
fallback and it is a good paragraph. worse, (a) makes the read a **partial function** — a shape aws
"never" emits becomes an outage if that ever proves false, which is the mirror-image risk of (b)'s
silent absorb.

⚠️ the two rules genuinely pull opposite ways here: `rule.forbid.failhide` favours (a);
`rule.require.symmetry-with-peer-resources` favours (b).

## 🔴 .the THIRD shape this fork missed — present-but-empty

⚠️ **added by defect 30.** the options above split the space into two — *wholly absent* (a 404) and
*partial*. the peer's cast splits it into **three**, and its `isWhollyAbsent` predicate is the proof:

```ts
const isWhollyAbsent =
  !mo ||                                   // aws omitted the key entirely
  (mo.HttpTokens === undefined &&          // ...OR aws sent a present-but-EMPTY {}
   mo.HttpPutResponseHopLimit === undefined &&
   mo.HttpEndpoint === undefined);
```

> *"'wholly absent' is BOTH shapes that carry no posture: AWS omits the MetadataOptions key entirely
> (`undefined`), OR emits a present-but-empty `{}` with every sub-field undefined. both mean 'no
> posture read from AWS' and MUST take the insecure read — **if an all-empty `{}` fell through to the
> per-sub-field secure fallback below, it would read back fully SECURE and false-KEEP an
> imdsv1-allowed box** (the exact false-KEEP hazard, just from the present-but-empty direction)."*

🔴 **a present-but-empty `PublicAccessBlockConfiguration` means exactly what the 404 means — no block
posture — and option (a) would THROW on it.** every one of the four booleans is absent, so an
"absent sub-field ⇒ throw" rule fires on all four. that is worse than a wrong fallback: it is a
**plan-time abort on a shape whose sense is "not configured"**, which
`rule.forbid.plan-fail-on-apply-guided-prereq` grades a **blocker** — the same class as A-5, reached
by a different road.

⇒ so whichever option the council takes, the read owes a **three-way** split, not a two-way one:

| aws returns | it means | the read must |
|---|---|---|
| the absent-signal error (404) | no block configured | the honest absent read — `null` (or, under **F11**, the explicit all-false const) |
| a present-but-**empty** `{}` | **also** no block configured | 🔴 **the SAME read as the 404** — never a throw, never a per-field fallback |
| a **partially populated** block | a shape aws does not emit | *this* is the genuine (a)-vs-(b) fork |

⚠️ **this narrows the fork rather than settles it** — (a) and (b) still disagree on row three. but it
removes the row where (a) was outright unsafe, and it means A-3 ("aws returns all four once a config
exists") needs a companion: *and a config may be reported as present-but-empty*.

## .rework, and why it is clean

one branch at one cast boundary, plus its test. no caller binds to it — a consumer sees either an
error or a value, and (b)'s value is the one they wanted anyway.

## .the verdict

🟢 **RULED 2026-09-09 — the council OVERRULED the best-guess to (b), FALL BACK PER-SUB-FIELD.**
a partially populated block no longer throws; each absent sub-field takes the safe value, exactly
as `asDeclaredAwsEc2InstanceMetadataOptions.ts:45-57` already does.

### what the verdict binds

| | |
|---|---|
| 🟢 **row three of the three-way split takes (b)** | rows one and two are unchanged — the 404 and the present-but-empty `{}` both take the honest absent read, and **neither throws** |
| 🔴 **case=4 `[t2]` must be re-rendered** | it currently demos the throw. the demo becomes a per-sub-field fallback, and the case's remaining two surfaces (the `Status` union, `NewerNoncurrentVersions`) still throw |
| 🟢 **the cast owes a `.note`** | the entry asked for this outright and the council's answer does not retire the objection: *"no safe fallback exists"* is a real argument, and a future reader will re-raise it. the `.note` states the ruling and cites this fulcrum |
| ⚠️ **`rule.forbid.failhide` is not waived** | it is **scoped**. the fallback is a total-function guard for a shape aws does not emit; a genuinely unknown value on any other surface still throws (case=4's other two rows) |

### 🔴 why the ruling is more than a symmetry call — **F11 removed F9's deciding reason**

F9's reason 1 was that the peer's argument does not carry over, *"because there is no comparably
safe guess here: `true` invents a block aws did not report, `false` invents an exposure."*

**that leg was true when it was written and is not true after F11.** the council ruled the same day
that `publicAccessBlock: null` means **the secure default**, so this package now holds a declared
position on what the safe posture for this property IS. ⇒ a per-sub-field fallback to `true` is no
longer an invention; it is the value F11 already made canonical.

⚠️ **stated as a coupling, not as a proof** — F11 governs a *declared desired* value and F9 governs
a *read remote* value, which are opposite sides of the diff. what F11 supplies is the missing
premise (a principled safe value), never the conclusion.

### 🔴 the DIRECTION sub-call — ruled 2026-09-13, and the paragraph above is what predicted it

**the fallback resolves toward UNBLOCKED (`false`), not toward blocked (`true`).** the fork F9
settled — throw versus fall back — is untouched; what this settles is the *direction*, which the
verdict never named.

🔴 **the caveat directly above is the whole argument, carried one step further.** it says F11 and F9
sit on **opposite sides of the diff** and then applies F11's value to F9's side anyway. run it:

```
remote:   { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true }
                        ← RestrictPublicBuckets omitted, genuinely FALSE on aws
read:     all four true                      ← the secure fallback
desired:  all four true
⇒ KEEP.   RestrictPublicBuckets stays false. silently. forever.
```

🟡 **the remote side is aws's flat wire shape, and stays flat** — F14's 2×2 factors **our** contract,
so the cast still owns the call about what an omitted wire field reads as. the factor moves this
defect not at all; **I-8** is what settles it.

⇒ **the two sides default in opposite directions, and both serve safety:** a **desired** unknown
resolves secure (`'blocked'` costs one token — F11, F15); a **remote** unknown resolves *insecure*,
because a plan writes desired over remote, so only the insecure read produces the UPDATE that writes
the block.

🟢 **the peer says this outright at `:27-30`, and F9's first read of it stopped at `:45-57`** —
*"read it back as that honest insecure default so a pre-feature template plans a change … instead of
a false KEEP that masks an insecure box."* its secure sub-field fallback is a total-function guard
for a shape it **proves** unreachable, never a claim that unknown-remote means secure.

⚠️ **and our unreachability is weaker than the peer's** — theirs is grounded in aws behaviour, ours
is **A-3**, unverified. 🟢 **the unblocked fallback is correct under both branches of A-3**, so the
sub-call removes A-3 from the safety argument rather than leaves it as a live risk.

⇒ 🔴 **the generalizable lesson, and it is this drive's repeat defect in a new coat:** F9 wrote the
caveat that refutes its own render — *"opposite sides of the diff"* — and then did not run it. **a
caveat is a check that has been written down and not executed.** the fix is mechanical: when an entry
states a boundary its own conclusion crosses, walk the conclusion through the boundary before you
ship it.

⇒ 🔴 **and this is the third time on this drive that one verdict silently re-graded another
fulcrum's argument.** the census's revision-trigger register exists for exactly this, and it did
not carry a row for it — because F9's reason was prose in a `.why`, never a registered trigger.
*a fulcrum's REASONS are as revisable as its verdict, and only the verdict is tracked.*
