# F5 — the declaration shape

**rework** · clean  ·  **status** · open  ·  **confidence** · 88%

## the fork, stated fairly

the paired repo already declares this exact construct — a dedicated cross-account target role plus
its policy attachments — as `getResourcesOfGroveReachTarget`
(`provision/aws.auth/resources.reach.ts:118-156`). we cannot import it: it lives in another org, in a
`provision/` directory, and is published in no package.

| candidate | why not |
|-----------|---------|
| mirror its shape by hand: `DeclaredAwsIamRole` + one `…AttachedInline` + N `…AttachedManaged` | **taken** |
| invent a leaner shape (e.g. inline-only, no managed attachments) | `demoPermissionsPolicy` carries `managed: ['…/ReadOnlyAccess']` (`resources.common.ts:39`), so an inline-only shape would silently drop the readonly grant |
| add a shared factory to `declastruct-aws`'s `src/` | out of scope by the wish: *"any `declastruct-aws` library change (`src/`)… this is provision work"* |
| a local factory in this repo, parameterized like ahbode's | premature: ahbode's factory earns its parameters from **two** call sites (prep + prod). we have one |

## taken, and why at the time

**mirror the shape by hand, unparameterized, at one call site.**

the triple is already this repo's own idiom — `resources.oidc.ts:43-86` builds exactly a role + one
inline attachment + N managed attachments from a `DeclaredAwsIamPolicyBundle`. so the "mirror" is
equally a match of the local file three lines up.

no factory: `rule.prefer.wet-over-dry` sets the bar at three usages, and this is one. ahbode's
factory exists because prep and prod differ by two arguments; here there is one account.

## 🔴 the ARRAY ORDER — a constraint this fulcrum owes and had not stated

**declastruct applies in DECLARED ARRAY ORDER. it runs no topological sort.**
(`handoff.declastruct-unix.make-ssh-fully-declarative`: *"the array must read … keep that order."*)

⇒ the triple is not an unordered set. **both attachments reference the role, so the role must be
declared FIRST** — else the apply reaches an attachment whose target does not yet exist:

```
[ the role, the inline attachment, ...the managed attachments ]
```

✅ **the peer already obeys it** — `resources.oidc.ts:43-86` declares role → inline → managed, in
that order. so this is a constraint to **state**, never one to discover.

⚠️ **this matters because `case=3` `[t2]` sketches *"the apply succeeds"*, and that claim is
CONDITIONAL on the order.** a shape stated as a set, applied in the wrong sequence, fails at apply —
after the role has been created, so the account is left mid-way through the triple.

⇒ **the general form: a declaration shape is a SEQUENCE here, never a set**, and any fulcrum that
picks a shape owes the sequence with it.

### the inline-policy name — a sub-call inside this one

`DeclaredAwsIamRolePolicyAttachedInline.unique = ['role', 'name']`
(`src/domain.objects/DeclaredAwsIamRolePolicyAttachedInline.ts:46`), so the new role *could* reuse the
literal name `ehmpathy-demo-permissions` that the oidc role uses (`resources.oidc.ts:83`) with no
identity collision.

**take ahbode's convention instead: `${roleName}-extension`** (`resources.reach.ts:150`). two
identically named rows in a plan diff differ only by a nested `role` ref, which is exactly the kind of
difference a human skims past — and `case=3`'s whole check is a human who reads a plan diff for an
unexpected `UPDATE`.

### 🔴 this shape is the VESSEL F1's alternatives need — and F1 priced it as a cost

found at review round 4, by a read of the two fulcrums **against each other**.

F1 declined its middle option because it *"costs one extra declaration, empty at first"* and because
*"an empty policy is a shape a reviewer would rightly question."* ⛔ **neither holds against the shape
taken here.** the `…AttachedInline` above is **mandatory** — `demoPermissionsPolicy` carries an
`inline` document, and a document must attach somewhere — and it is **never empty**, since it carries
that document.

⇒ so every option on F1's fork declares the **same three resources**. they differ only in the
`document:` value handed to the attachment F5 already commits to:

| F1 option | what changes in F5's shape |
|---|---|
| plain reuse | `document: demoPermissionsPolicy.inline` |
| spread + append | `document: <a document that spreads those statements and appends a Deny>` |

**⇒ F1's alternatives cost zero new declared RESOURCES.** ⚠️ **and not zero code** — a bundle
function, if ahbode's shape is mirrored, is a real declaration a reviewer reads. what dissolves is
the objection F1 actually raised: *"one extra declaration, empty at first."* the declaration is not
extra, and it is never empty.

this fulcrum is where that becomes visible, and it was invisible to every hunt that read one fulcrum
at a time.

## why the confidence is 88%

two independent conventions — the paired repo's and this file's own neighbour — agree on the shape,
and the wish's scope bound rules out the one alternative that would otherwise tempt. the 12% is that
the duplication is now **n=3 across two repos** (ahbode prep, ahbode prod, ehmpathy demo), exactly
where wet-over-dry says an abstraction becomes reasonable — and the abstraction's natural home would
be `declastruct-aws`'s `src/`, which this wish forbids. so the right long-term answer may be a raised
find rather than a local choice.

## rework, and why it is clean

an unparameterized declaration is the easiest shape to later extract into a factory. the reverse —
premature parameterization — is the expensive direction, and it is the one avoided here.

## where

`provision/aws.auth/account=demo/resources.reach.ts`.

## the verdict

_open._
