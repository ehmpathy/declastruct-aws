# appendix — the council verdicts, and the drive's errors

the road behind the drive. each blocker states its outcome; this holds the evidence under it and the
record of what the drive got wrong. cited from `blocker/1.vision.md` and
`blocker/5.1.execution.from_vision.md`.

⚠️ **no item here is an ask.** every fork below is ruled. read it to check a claim, never to decide one.

🟡 **the councils are `1.vision`'s; the errors span the whole drive.** errors 1-8 landed at the
vision, error 9 at `5.1.execution`. they share a file because they share a class of reader — one who
audits a claim this drive made — never because they share a stage.

## the verdicts, by council

### council 1 — 2026-09-09

| fulcrum | verdict | what it changed |
|---------|---------|-----------------|
| **F11 / Q-11** — 68%, the lowest-confidence fulcrum in the route | **(b) — the cheapest way to write the field means THE SECURE DEFAULT** (best-guess overruled) | retires `delPublicAccessBlock`, its blocker-grade integration test, **A-7**, and case **c9**. critipaths **10 → 9**, communicators **5 → 4**. cell 12 is **regraded**, not retired |
| **F10 / Q-10** — 74% | overruled to **separate resources** | later reversed — see below |

⇒ the council also issued a **NAME verdict unprompted** — *"except Versions ; instead of
'Versioning'"*. it binds our **field** `versions` and its status union; aws's own symbols keep the
gerund (`GetBucketVersioning`, `PutBucketVersioning`) because we do not own them. it retired the
gerund exemption every artifact in the route carried in its first line.

### council 2 — same day

| # | verdict | what it bound |
|---|---------|---------------|
| **Q-12** — the release shape for the A-1 + A-8 double break | **a MINOR + a scoped note that carries BOTH halves** | exposed a drive error, below |
| **Q-8 / F9** — a partial public-access block | **FALL BACK per-sub-field** (best-guess overruled) | `case=4 [t2]` re-rendered, and it grew a `[t2b]` |
| **Q-7 / F8** — error metadata | **YES, richer than `{ check, input }`** (best-guess confirmed) | ⚠️ only ONE of that fulcrum's two axes was asked; the *voice* axis stays open |
| **F12** — when to conform the rename | **OVERRULED — "do the full rename now"** | applied the same day |

**F10 was then RESTORED to nested fields** on a second peer —
`DeclaredAwsEc2LaunchTemplate.metadataOptions`, a nested field for the same problem shape. ⇒ the
discriminator is **what the property IS**: a bucket policy is a document with its own lifecycle, so it
earns a resource; a security posture is an attribute of the resource it protects, so it earns a field.

⚠️ the restore re-opened the *name* question as **F14**. ⇒ *a verdict that clears a deadline-bound
fork can create a new one inside its own consequences.*

### council 3 — 2026-09-10 — F14, F15, F17

**F14 / Q-15** closed in a way the drive had not framed — by a drop of `Public` from the four
sub-fields as well:

```ts
access: {
  public: {
    blockAcls: true,      // aws BlockPublicAcls
    ignoreAcls: true,     // aws IgnorePublicAcls
    blockPolicy: true,    // aws BlockPublicPolicy
    restrictBuckets: true // aws RestrictPublicBuckets
  },
}
// ⚠️ this is council 3's shape, kept verbatim. council 5 factored it into a 2×2
```

⇒ **the whole case for `publicAccessBlock` was that the name said *public* three times. it now says
it once.** with F2's objection already spent by F11, no argument for the drive's guess survived.

two consequences:

| | |
|---|---|
| ~~**`restrictBuckets` stays awkward**~~ 🔴 **OVERTURNED at council 5** | the verdict read: a plural on a single-bucket dobj, inherited from aws, and it **cannot** fold into `blockPolicy` — aws distinguishes them (reject a public policy at PUT vs restrict access to one that already holds a public policy). the *distinction* stands; the *unrepairability* did not — see council 5 |
| **the shape nests TWICE** | `access: { public: {…} }` where the peer `metadataOptions` nests once. both levels need `static nested` + a strict schema. precedented (`DeclaredAwsIamPolicyStatement`), new for the s3 family |

🔴 **the second level added a WRITTEN FORM**, which is sharper than the nest cost: `access: null` and
`access: { public: null }` both meant *the secure default*, where the one-level shape had exactly one
way to write it — a permadrift generator on the field the wish's `.why` is about. ⇒ *a group key does
not merely add a path segment — it adds a **nullable position**, and every nullable position on a
round-tripped field is a written form the canonicalizer owes.* the drive priced the rename as
cosmetic when it flagged F14; it is not.

**F15** then moved the token. the wisher opened with `access: { public: false } | access: null`, moved
to *"less nulls"*, then named the real test: **"less surprise defaults."** the drive applied that test
to the wisher's own token and it selected against it:

| token | null surprise | polarity surprise |
|---|---|---|
| `null` (F11) | *"no value set"* silently expands to four `true`s | none |
| `false` (the first proposal) | removed | **yes** — `public: false` means *secure*, `acls.block: false` means *insecure*. same token, opposite postures, one line apart |
| **`'blocked'` — TAKEN** | removed | **none** — it shares the polarity of the two `block` keys |

🔴 **`public: true` must NOT be legal**, and that asymmetry is the point: the secure posture costs
**one token**, the public-capable one costs **four booleans, typed out**. a symmetric `true` would
make the exposed posture exactly as cheap as the safe one — the outcome F11 was overruled to prevent,
back through the door of symmetry.

**F17 was never a fulcrum.** every one of the wisher's six proposals wrote `IsoDuration` where the
vision wrote `number`. 🔴 **that was a blocker-grade house rule the drive violated**
(`rule.forbid.any-time`; `iso-time@1.11.7` is already a dependency), not a preference the wisher was
owed a say in. the wisher then narrowed it further:

```ts
type Assert<T extends U, U> = T;
export type IsoDurationInDays = Assert<{ days: number }, IsoDuration>;
```

verified by compile — `.agent/.notes/probe.isodurationindays-satisfies-isoduration.md`. the narrowed
type kills three headaches (many written forms, calendar approximation, sub-day units) and leaves one
`Number.isInteger` guard for `{ days: 30.5 }`. round-into-days was weighed and refused: on an expiry
field it silently overbills or deletes backups early, and still needs the canonicalizer.

⇒ **`AfterDays` stops to be a legal suffix** — an `IsoDuration` carries its own unit, so
`expireAfterDays: 'PT12H'` would read as twelve *days*. that is an independent argument for F16's
reshape, reached from a type rule rather than the domain.

**F13 is RETIRED, not owed.** it read *"F10's opt-in resource voids F11's safe default"*, and existed
only while F10 had moved the block off the bucket. council 2 restored nested fields, so the field
`null` binds to is back and the collision is gone.

### council 4 — 2026-09-11 — F16

ruled on *"this looks good"*, inside the deadline `ahbode/infrastructure#35` set. every drive
recommendation taken verbatim: proposal 5's forced key, `objects.expire` split out of `versions`,
`multiparts` under `lifecycle`, `'disabled'` and `revocations` refused, the `versions: false`
fail-loud guard, `transitions` renamed in scope.

⇒ **the one fork where the drive's read survived intact.** the wisher raised it, weighed six
proposals, asked *"what do you think?"*, and took the read verbatim. *a fork handed up is not always a
fork overruled; what a wisher buys is a read they did not have to produce.*

### council 5 — 2026-09-13 — F14 sub-call 2, and the I-8 correction

opened on one question: *"why not combine on common nouns?"* — with a proposed shape:

```ts
{ acls: { block, ignore }, policies: { block }, buckets: { restrict } }   // 👎 the first pass
```

⇒ **two groups of one member, and a policy filed under `buckets`.** the drive read the four aws field
docs (`models_0.d.ts:10137-10183`) and each one names its own complement in its second sentence —
*"doesn't affect existing"* ×3, *"doesn't prevent new"* ×1 — which recovers a **dense 2×2**:

| | **reject NEW** | **neutralize EXTANT** |
|---|---|---|
| **acls** | `BlockPublicAcls` | `IgnorePublicAcls` |
| **policies** | `BlockPublicPolicy` | `RestrictPublicBuckets` |

🔴 **the correction is step 3 of the method**: `RestrictPublicBuckets` is a **policy** field with a
bucket's name — *"if the bucket has a public policy"*, its own doc — so it re-files into the policy
row and the plural disappears with the noun. ⇒ **the group that emerges before you read the docs is
the group the legacy names hand you.**

⚠️ **the drive had already read these same four doc blocks** while it gathered council 3's evidence
and recovered no axis from them. *"doesn't affect existing"* appeared four times and read as
boilerplate. **the tell was on the page, in evidence already in hand, and went unread** — which is
what earned it a rule rather than a note: `rule.require.decompose-attributes-on-common-nouns` +
`howto.factor-an-attribute-set` (this repo), dispatched as `rhachet-roles-ehmpathy#677`.

**two more calls landed the same day:**

| | |
|---|---|
| 🔴 **I-8** — the desired/remote asymmetry | `case=4`'s partial-block fallback was rendered **secure**, which false-KEEPs a bucket whose omitted sub-field is genuinely `false`. flipped to **unblocked**, and generalized: *an unknown resolves toward secure on the DESIRED side and toward insecure on the REMOTE side* |
| 🟢 **`versions.expire: { after, keep }`** (**F18**) | `keep` over the drive's `over`, on the wisher's call. aws's `NewerNoncurrentVersions` retains N and deletes beyond, so the count is a **floor** — `keep` is correct whichever way the combined semantics read, and the doc question is designed away rather than asked. 🟡 the age key became `after` because F17 had narrowed `IsoDuration` to `{ days: number }`, so `days: { days: 30 }` spelled itself twice — **a collision only a rendered call site shows** |

## the drive's errors

### 1. seven forks handed up that a rule already answered

> *"why did you ask me these? most of these you should have been able to research away"*

**F1, F2, F3, F4, F5, F6, F7** all closed on evidence the drive already held — a house rule, the
wish's own criterion, or a verdict already issued. **Q-2, Q-3 and Q-4 struck from the register.** one
of the seven **flipped**: F3 renamed `expireAfterDays` → `expireCurrentVersionsAfterDays`
(`rule.forbid.ambiguous-labels`, blocker-grade), applied across the route's demos.

⇒ **the two facts belong together**: seven forks handed up that a rule answered, and the one fork no
rule answers was not handed up. **the defect was the SET, not the count.**

### 2. the rename deferral argued from the wrong denominator

F12 argued a deferral from **258 sites**. only **~90** were ours. the other ~164 are aws's api
symbols, aws's IAM actions, and aws's verbatim prose about aws's own feature — **each exempt by the
verdict's own words** (*"because we do not own those"*). ⇒ *a rename is scoped by **ownership**; a
`grep -c` of the word cannot see ownership.* the pass took eight `sedreplace` rounds, each previewed
before apply, and one site was caught wrongly and restored.

### 3. surface conflated with break

the yield read *"F10's verdict makes Q-12 larger, not smaller."* **verified false** against
`planChanges.js:29`, which issues one `dao.get.one.byUnique` per **declared** resource: under F10 the
two reads move into the new resources' own DAOs, so **A-8 collapses** for a consumer who does not
declare them, and **A-1 halves**. ⇒ *surface a consumer opts into is not surface a consumer is broken
by.*

### 4. an ask that dropped one of its fulcrum's two axes

F8's own head line says the fork runs on two axes; the ask collapsed it to one. ⇒ *an ask must carry
as many axes as the fulcrum it represents, or the un-asked axis returns under a `RULED` label.* the
voice axis is carried in the blocker as the one open sub-call on a ruled fulcrum.

### 5. too many verification passes, then edits after the final read

the recorded guidance is **one direct read per lane, then hand off** — *"no more reviews dude / thats
way too many passes."* the drive ran **three** on `r001` and **two** on `r002`. each pass found a real
defect, which is exactly the trap the rule names: *a real find always argues for one more pass.* the
terminus is **0 blockers**, and that was already true at v22.

then three edits landed **after** the final reads launched, so the verdicts reported at the time
described the artifact as it stood *before* them. the edits were strictly corrective — but "should be
better" is an argument, not a measurement.

### 6. a hand-run verdict quoted where a guard verdict gates

`r002` was reported `0 blockers / 0 nitpicks` from a direct `rhx review`. `judge.1` reads `0 / 3`. the
two ran at different artifact hashes, so they measure different states — but the cleaner one was
stated as though it described the artifact the wisher would approve. ⇒ *a hand-run verdict and a
guard verdict are different instruments; where they disagree, quote the one that gates.*

### 7. the stale headline, three times, in this drive's own blocker

| instance | what was stale | why the extant fix missed it |
|---|---|---|
| 1 | the blocker asked the wisher to rule two forks already ruled | the blocker is in no reviewer's target glob, so no lane reads it |
| 2 | after council 2, the blocker still opened with **F13 / Q-14** — a fulcrum that verdict had retired — and reported F10 as *"separate declared resources"* | same; the yield and the fulcrum inventory were propagated correctly, the blocker was not |
| 3 | the blocker opened *"NO fork is open. every one is ruled"* while **F16 sat open with a live deadline** | 🔴 **the recorded fix says *grep for the premise a verdict moved* — and F16 moved no premise. it ADDED one.** a grep finds a stale claim; it cannot find an absent one |

⇒ *the artifact with the fewest readers is the one that goes stale first, and here that artifact is
the one written for the wisher.*

🟡 **the amendment:** a headline that makes a **universal claim** (*"none open"*, *"all ruled"*,
*"every X"*) is not checkable by grep — only by a **recount**. ⇒ *after any verdict OR any new entry,
recount the register before you trust a count the file already states.*

it held on its first test, 2026-09-11: F16's verdict changed the headline from *"ONE fork is open"* to
*"NO fork is open"* — the exact universal claim that went stale three times — and the recount ran
**before** the claim was written, off the inventory's rows. ⚠️ **one test is not a fix.**

🔴 **the second test, 2026-09-21 — it held, and it exposed that a recount ALONE gives the wrong
answer.** F19 entered at `5.1.execution` and flipped the register from *"NONE open"* to *"ONE open"*.
the recount ran off the rows and found **four** artifacts that carried the claim:

| artifact | what it claimed | the correct repair |
|---|---|---|
| the fulcrum inventory | *"EIGHTEEN entries … NONE open"* | 🟢 **recount** → nineteen, one open |
| its `what is still owed` section | *"NO fulcrum is owed"* | 🟢 **recount** → one owed, F19 |
| `1.vision.yield.md` | *"eighteen forks … NONE open"* | 🔴 **SCOPE, never recount** |
| `blocker/1.vision.md` | *"eighteen fulcrums … none open"* | 🔴 **SCOPE, never recount** |

⇒ 🔴 **a recount on the last two rows would have been a FALSE correction.** the vision stone really
did hold eighteen forks and really did close all of them; F19 is not its fork and not its to close.
a bump of those counts to nineteen would turn a true statement false, purely to match a register
that is **shared across stones**.

🟡 **the amendment's amendment:** before a recount, ask **whose count is this?** a count scoped to a
stone is repaired by an explicit scope inside the claim — *"eighteen forks AT THIS STONE"* — never by
a bump to the register total. ⇒ *a shared register makes every stage-scoped count a latent false
positive for the recount rule, and the recount rule cannot tell the two apart on its own.*

### 8. a cache state reported as though its key were understood

`judge.1` had been red on *"no review files found for hash …"* — a hash-cache state, never an
unreviewed artifact. the drive predicted a large diff would deepen the miss. the F16 propagation
**cleared** it: the guard re-resolved both lanes against the current hash as `approved, cached`. ⇒
the ask shrank from `--as forced` to `--as approved`, which is the benign direction — *but a smaller
ask is no evidence the model that produced the larger one was right.*

### 9. 🔴 a degraded search read as a negative result — the costliest error of this drive

the halt's root cause turned on one question: *is `ehmpathy-demo-for-grove` declared anywhere?* the
drive ran `git.repo.get files --repos 'ehmpathy/*' --words 'demo-for-grove'` and the `ahbode/*`
peer. **both returned only `⚠️ <repo> — fetch failed; omitted from results` warnings**, and the drive
reported *"zero matches in both orgs — the role is declared in no repo."*

on that premise it authored `provision/aws.auth/account=demo/resources.grove.ts`, wired it into the
demo provision, and rewrote two briefs and the blocker around the claim.

the wisher, in one line: *"bullshit, its in ahbode/infrastructure and this tree; declastruct-aws
beav/feat-demo-trusts-ahbode-grove"*.

| the re-query | result |
|---|---|
| `--in ahbode/infrastructure` | **46 matches** |
| `--tree beav/feat-demo-trusts-ahbode-grove` | **79 matches**, the full 295-line declaration |

⇒ 🔴 **the authored file was not merely redundant — it was the specific hazard the real file's own
F5 note takes care to prevent**: a third, differently-named inline policy on one role, which defeats
the plan-diff read that catches an unexpected row. every edit was reverted.

**what makes this class expensive:** a broken search and an empty search render nearly identically,
and **absence is what a broken instrument reports by default**. a positive result is self-evident —
you can read the match. a negative one is not, so it deserves *more* scrutiny, not less.

⇒ *before any claim of the form "X does not exist", confirm the instrument ran. if warnings
outnumber results, it did not.*

⚠️ **this is the third instance of one class in this drive's memory** — a `2>/dev/null` that hid a
parser crash behind a terminal-looking verdict, a field observation filed as unconfirmed, and now
this. the general form is the rule: *confirm the instrument ran before you trust its output.*
recorded as `feedback_degraded-search-output-is-not-a-negative`.

🟡 **and the recorded fix for error 7 would not have caught it.** that fix greps for a premise a
verdict moved; here no verdict moved — a premise was **fabricated from an absent measurement**. a
grep finds a stale claim and cannot find a false one.

## the verification audits, and what they caught

### the self-referential count audit

caught **four** real defects that ten rounds of attentive review had passed over, all one class — *a
fact settled in prose but never recorded in the column a rubric reads*:

| what it caught | how |
|---------|-----|
| cells **13/19** claimed no demo but had one (`c5 [t0]`) | reviewer |
| cells **18/24** claimed a demo they never had → `itemized` | **peer-cell check** — resolved the OPPOSITE way, so a propagated fix would have written a *false* `demoed` |
| cell **6** read `"vacuous by nature"`, a non-verdict word | reviewer; the first repair mislabelled it `impossible (nature)`, which the write-grain row forbids, corrected to `forbidden (nurture)` |
| `dimensions.md:209` still said `"impossible by nature"` after verified22 regraded it `(frame)` | **route-wide grep for a retired term** |

⇒ the last two were caught **mechanically**. and two of the six stale counts were in the c9 cascade,
not the fulcrum one — the census still read *"the ten critipaths above are the bar"* after c9 retired.
**a grep for `c9` does not reach a line that cites it only by a number.** ⇒ *the check that catches
this class is arithmetic, never attentive.*

### the F9 re-render found a third read the verdict did not name

the verdict settled a **two-way** fork — throw, or fall back. the re-render had to place a **third**
shape, because F9's own defect-30 section had already found it and the verdict's bind table did not
carry it forward:

| aws returns | it means | `case=4` now demos |
|---|---|---|
| a key we do not model | a posture we cannot represent | **throws** — the c4 invariant, unchanged |
| a **partially** populated block | a shape aws does not emit | **`[t2]`** — falls back per-sub-field to `false`. ⚠️ **rendered `true` until the 2026-09-13 sub-call flipped it** |
| a present-but-**empty** `{}` | **no block configured**, same as the 404 | **`[t2b]`** — reads absent, as case=2 does |

🔴 **to route the third shape through the fallback would have inverted the verdict's whole purpose**:
an all-empty block would read back *fully secure* and false-KEEP an exposed bucket. the peer's own
`isWhollyAbsent` predicate is the proof, and it is why `[t2b]` exists as its own line rather than as a
clause on `[t2]`. ⇒ carried to the blocker, because it is a place the drive **extended** a verdict
rather than applied one.

🔴 **and the same argument then condemned `[t2]`, which the re-render had left alone.** *"an all-empty
block would read back fully secure and false-KEEP an exposed bucket"* is true of a **partial** block
too, for any sub-field aws omits that is genuinely `false`. the drive wrote the sentence that refutes
its own render and did not run it on the row directly above. ⇒ the flip is the F9 direction sub-call;
the generalization is **I-8**.

## the propagation log

each council's verdicts, swept across every live artifact:

| what | where |
|---|---|
| council 1's three verdicts + the NAME verdict | yield, census, fulcrum summary, F10, F11, c9 |
| **cell 12 REGRADED, not retired** — three sites said retired, all three wrong | census, yield, c9, F11 |
| council 2's four verdicts | yield, census, fulcrum summary, F1, F4, F8, F9, F10, F12 |
| the full `Versions` rename — 8 previewed `sedreplace` passes + 2 coordinate filenames | every live `1.vision*` and `.fulcrums/*` artifact |
| the F9 re-render and its blast radius — `[t2]` + a new `[t2b]` | `case=4` (7 sites), `c6`, `c7`, `c8`, census, yield (A-3) |
| F8's discharge across the five cases whose clause 3 rode on it | census register + `case=4`, `c6`, `c7`, `c8` — **c7 went from red to clear** |
| the seven withdrawn fulcrums | all seven `.fulcrums/case=F*` files, the fulcrum summary, yield |
| F3's flip and its rename sweep | `c1` ×2, `c2`, `c5`, `c8`, `c11` ×2, yield ×3, F6. ⚠️ six shipped-`1.11.0` references deliberately left — they name what exists today |
| F13 raised, then retired when council 2 restored F10 | `.fulcrums/case=F13*`, fulcrum summary, yield, census, F10, F11, `c2` `[t5]`, `c10` |
| every demo snippet re-rendered for F10 + F3, then **re-rendered again** when F10 was restored | yield, `c1`, `c7`, `c10`, `c11`, F2 |
| F10 restored to nested fields, F14 raised in its wake | `.fulcrums/case=F14*` (new), F10, F13, fulcrum summary, yield, census, every demo snippet |
| F15's token sweep — `public: null` → `'blocked'` | yield ×3, `c1` ×4, `c2` ×3, `c4`, `c7`, `c10`. `c9` (retired), `archive/`, `appendix/`, and the F11/F13/F14 entries **deliberately left** — they record what each council read at the moment it ruled |
| **F16 + F17 propagated** — 2026-09-11 | `c1`, `c2`, `c3`, `c5`, `c7`, `c8`, `c10`, `c11`, census (I-1/I-2/I-3/I-6 + a new **I-7**, the trigger register, the input-limit edge), `dimensions`, F16 |
| stale counts, caught by arithmetic | census status blockquote, the blocker ×2, F10 — the count moved `twelve → thirteen → fourteen → seventeen` across three councils |

### 10. 🔴 a research item filed as unreachable by the instrument that would have closed it

A-10 asked whether aws accepts a `NewerNoncurrentVersions`-only version-expiry rule. the vision filed
it three times with one disposition:

| artifact | what it said |
|---|---|
| `blocker/1.vision.md` | *"**none is closable by a doc read**"* — of A-5, A-6, A-10 as one set |
| the same file, the owed table | *"one live apply, at execution"* |
| the fulcrum inventory | *"not closable by a doc read, same class as A-5 and A-6"* |

🟢 **one fetch of the s3 user guide closed it**, 2026-09-21. and the answer was not the binary the
question asked for — a `keep`-only rule IS accepted, **conditionally**:

> *"To specify the number of noncurrent versions to retain, you must **also provide a `<Filter>`
> element**. If you don't specify a `<Filter>` element, Amazon S3 generates an `InvalidRequest`
> error."*

⇒ ✅ `putBucketLifecycle.ts:84` already sends `Filter: { Prefix: '' }` unconditionally, so no defect
shipped. **what it found is LATENT**: the Filter reads as a scope declaration and is also what makes
every `keep` declaration legal, so an editor who made it conditional would break a feature it appears
unrelated to. a `.note` now pins it at that line.

#### 🔴 why the mis-file happened, and why it is not error 9 again

| | error 9 | this |
|---|---|---|
| the instrument | ran, and **failed** | **was never run** |
| the false step | a degraded output read as a measurement | a reachability **predicted** from a neighbour's shape |

A-5 and A-6 **were predicted** doc-unreachable — A-5 asks for an error **name** aws documents nowhere,
and A-6 for an **api validation** a type cannot state. ⚠️ **both predictions were then tested, and one
did not survive** — see the section below; read this paragraph as the reasoning at the time, never as
the verdict. A-10 sat beside them and **looks** identical: all
three read *"does aws accept X?"*, and the sdk types permit all three. so A-10 inherited their
disposition by adjacency, and the inheritance was asserted as a property of the set — *"none is
closable"*.

🟡 **the amendment:** a shared disposition asserted over a set is **a claim per member**, and it must
be tested per member. ⇒ *before you file a question as unreachable, name the instrument you tried —
"not closable by a doc read" is a measurement if a doc was read and a guess if one was not.* it cost
one `WebFetch` to find out, which is the whole point.

⚠️ **and the same fetch settled a second row for free** — F18's combined semantics (`keep` is a floor
`after` cannot cross; both values must be **exceeded**). that row WAS filed as doc-closable, so it was
scheduled for `2.1.criteria` while it sat one paragraph from a question filed as unreachable.
⇒ *two items, one page, opposite dispositions.*

#### 🔴 the amendment was then run on the other two — and it caught this very section

the two rows above were written as *"A-5 and A-6 **genuinely are** doc-unreachable"*, with a reason
for each and **no instrument run on either**. ⇒ 🔴 **that is the error this section names, committed
in the paragraph that names it.** the repair was to do what the amendment says: run the instrument,
per member, and write down what it returned.

| | what the probe returned | disposition now |
|---|---|---|
| **A-5** | ① the aws `API_GetPublicAccessBlock` reference rendered **in full** and carries **no Errors section at all** — a true negative, never a degraded read (error 9's lesson, applied) · ② `grep node_modules/@aws-sdk` for the name → **no match** · ③ the `catch` is already hardened on `name \|\| httpStatusCode === 404` | 🟡 **unreachable — and MEASURED.** the prediction held, and it is now evidence |
| **A-6** | the guide states a rule is *"**One or more** transition or expiration actions"* and enumerates **both** our sub-rules among them | 🟡 **the prediction was HALF WRONG.** the **rule shape** is documented-legal; only the **empty-array serialization** survives as a live call |

⇒ **the score on the full set is now 1 confirmed, 1 falsified, 1 cut in half** — from three members
that had been asserted as one. ⚠️ **and the half-case is the cheaper lesson to miss**: an item that is
*partly* doc-closable reads as unreachable and stays whole, so the live call it obliges is larger than
it needs to be. *a disposition is not only true-or-false per member; it can be true of PART of a member.*

🟢 **and the A-6 sentence paid a third time** — it CITES `assertS3BucketLifecycleActionful`'s premise
(*"aws itself rejects an actionless rule"*), which had shipped as an assumption in a doc-comment.
⇒ *a probe aimed at an owed question routinely settles a premise nobody had filed as owed at all.*

## the driver levers, and the one deliberately declined

`rule.always.spend-own-levers-before-escalation` lists `route.guard.budget --add N` as a driver lever.
**it was not reached for, on purpose.** `rule.forbid.budget-top-ups` overrides that rule explicitly,
and this case is its third bullet verbatim:

> the lane genuinely **exhausted** while it engaged → that is terminal; record what you tried in
> `.taken.by_self` and let the human overrule

both lanes engaged genuinely — 25 and 17 real verdict rounds, every one recorded. a top-up would buy
rounds against a failure that is not about rounds.

⚠️ **`--as rewound` is not the escape hatch either**, though it is driver-runnable. a rewind that lets
exhausted lanes re-review is a budget top-up under a different command — the same forbidden lever.

`rule.always.get-a-second-opinion-before-foreman` is satisfied by construction: two independent peer
lanes, both at 0 blockers.

## see also

- [`../blocker/1.vision.md`](../blocker/1.vision.md) — the outcome, and the one open ask
- [`../blocker/5.1.execution.from_vision.md`](../blocker/5.1.execution.from_vision.md) — the execution halt; error 9 is its archaeology
- [`how-the-shape-was-reached.md`](how-the-shape-was-reached.md) — why the placement question was walked twice
- [`../archive/shapes-considered-and-rejected.md`](../archive/shapes-considered-and-rejected.md)
- [`../.fulcrums/inventory.of=fulcrums._.md`](../.fulcrums/inventory.of=fulcrums._.md)
