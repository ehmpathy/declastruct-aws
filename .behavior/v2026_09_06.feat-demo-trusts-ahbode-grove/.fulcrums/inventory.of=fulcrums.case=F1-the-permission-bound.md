# F1 — the permission bound

**rework** · clean  ·  **status** · 🔴 **RULED — the wisher upheld the pick** · **as of** 2026-09-08

⇒ **the verdict is at the foot of this file.** the 38% below is the confidence **at the time of the
guess**, kept because a fulcrum record's whole job is to show what the wisher was handed. ⚠️ **do not
read it as a live grade** — the call is no longer a guess.

## the fork, stated fairly

the wish asks for *"everyday-power permission — enough for routine work, not enough to mint or
rewrite identity"*. **three** ways to supply it — the third found at review round 4, by a census of
the paired repo:

| path | cost |
|------|------|
| **reuse `demoPermissionsPolicy`** | fast, one source of truth, consistent with cicd. but it grants `iam:` writes — which ahbode's `term=tier` reserves for `emergency-admin` — and gives the `oidc-role-not-reapplied` hazard a third **consumer**. ⚠️ **not a third arm** — a cost this row had OVERSTATED; see below |
| **declare a grove-specific bundle** | honest to the tier word, and a grove is the most exposed box in the fleet. but a second bundle is a second artifact to drift, and it must still grant most of the same actions |
| 🔴 **spread + append** — a target-specific bundle FUNCTION that spreads the shared bundle's statements and appends the target's own | ⚠️ **not weighed at write, and it is the paved shape in the paired repo.** costs **zero new declared resources** — F5 already declares the attachment it lands in — plus one expression, or one small function if ahbode's shape is mirrored. keeps ONE source of truth for the shared statements, and gives the target a reviewable place to append a `Deny`. see below |

## taken, and why at the time

**reuse `demoPermissionsPolicy` unchanged, and state its cost out loud.**

the evidence that decided it is that the two halves of the wish's own sentence conflict, and the
conflict is empirical rather than stylistic:

- *"enough for routine work"* — the grove's routine work IS this repo's suite. that suite mints iam
  roles: `setIamRole.ts:71` issues `UpdateAssumeRolePolicyCommand` and
  `setIamRole.integration.test.ts` runs it against demo; `provision/aws.infra/account=demo/resources.iam.ts:35-38`
  attaches a managed policy to a role.
- *"not enough to mint or rewrite identity"* — that excludes exactly those actions.

⇒ **no bundle satisfies both.** to honour the second clause is to fail the first on day one.

so the guess picks the clause that keeps the wish's purpose alive, and pays for it with an explicit,
demonstrated statement of the residual (`1.vision.experience.case=5.*`) rather than a quiet
assumption. a narrowed bundle that breaks the suite would be a worse outcome *and* a dishonest one —
it would look safer while it delivered less.

**a second, weaker reason:** the demo bundle is narrower than ahbode's everyday-power in most
services (it carries `ReadOnlyAccess`, not `PowerUserAccess`) and wider in exactly one — `iam:`. so
"reuse" is no blanket widen; it is a targeted one, and the target is the one place it matters.

## 🔴 the cost this call had mispriced — found at review, not at write

reuse does **not** merely trade the tier word for convenience. it also partly defeats the wish's own
**hard** constraint (R1: a new, dedicated role, never one shared with cicd), whose stated reason is
verbatim:

> *"never one shared with cicd — so a widen for one consumer can never silently widen the other"*
> (`provision/aws.infra/account=camp/resources.reach.ts:24-26`)

a dedicated **role** delivers that at **four** layers and **not at two** — six layers, three rows,
because the four that hold collapse into one:

| layer(s) | isolated under reuse? |
|----------|----------------------|
| trust policy · cloudtrail principal · revocation · role-layer attachments — **4 layers** | ✅ |
| **the shared bundle's contents** — **1 layer** | ⛔ an edit to `demoPermissionsPolicy` moves the grove and cicd **in one commit** |
| 🔴 **the runtime capability the grant confers** — **1 layer** | ⛔ **the worse of the two misses.** the bundle carries `iam:UpdateAssumeRolePolicy` on `'*'`, so the credential this grant issues can **rewrite `ehmpathy-demo-oidc`'s own trust policy** — add a principal, or strip cicd out of it. walked at `case=5` `[t2']` |

⇒ so reuse recreates, at the **policy layer**, exactly the entanglement R1 forbids at the **role
layer** — and then goes one further at the **capability layer**, where the isolation is not merely
weakened but inverted: a dedicated role that cannot be widened toward cicd nonetheless hands its
holder the power to rewrite cicd directly.

⚠️ **that third row is the one a reviewer is most likely to miss**, because R1's language is about
*widens* and this is not a widen — it is a runtime act by the grantee. the constraint's stated
*reason* (*"a widen for one consumer can never silently widen the other"*) is aimed at the
declaration, so a reader who checks R1 literally passes it, and a reader who checks R1's **purpose**
does not. that is a materially different cost than *"it grants more than the tier word promises"*.

⚠️ **it does not flip the call.** the empirical argument still holds: no bundle satisfies both halves
of the wish's sentence, and a narrowed bundle breaks the suite on day one. but it moves the fork from
*"purpose vs a tier word"* to *"purpose vs a stated wish constraint"*, which is a decision the wisher
must price rather than a driver.

⇒ the honest middle, **not taken and named here so the wisher can reach for it**: reuse
`demoPermissionsPolicy` **plus** a grove-only inline attachment as the designated home for every
future grove widen. ~~it costs one extra declaration, empty at first~~ — see the correction below.

## 🔴 the cost this call INVENTED — F5 already declares the artifact

**F1 priced its middle option at *"one extra declaration, empty at first"*, and declined it partly on
that ground (*"an empty policy is a shape a reviewer would rightly question"*). ⛔ both halves are
false, and the refutation is in a peer fulcrum.**

**F5 takes** — as its whole declaration shape — `DeclaredAwsIamRole` + **one
`…AttachedInline`** + N `…AttachedManaged`, and even settles that attachment's name
(`${roleName}-extension`, F5 `.the inline-policy name`). it is not optional: `demoPermissionsPolicy`
carries an `inline` document, and a document must be attached somewhere.

| | F1 claimed | what F5 already commits to |
|---|---|---|
| a grove-only inline attachment | *"one **extra** declaration"* | ⛔ **already in the taken shape** — mandatory, not extra |
| its content | *"**empty** at first"* | ⛔ **never empty** — it carries `demoPermissionsPolicy.inline` |

⇒ **so the middle and third options cost ZERO new declared RESOURCES.** the attachment exists under
every option on this fork. what differs is the **value** handed to it:

```ts
// under plain reuse — the pick
document: demoPermissionsPolicy.inline,

// under spread + append — the same declaration, a different value
document: new DeclaredAwsIamPolicyDocument({
  statements: [ ...demoPermissionsPolicy.inline.statements, denyRewriteOfOidcTrust ],
}),
```

🔴 **this is the sharpest available form of this fulcrum, and it inverts the fork's cost side.** the
wisher was to be told *"reuse is free, the close costs an artifact."* the truth is that **the
attachment is declared either way, and only its `document:` value differs** — so the
*"a reviewer would question an empty policy"* objection has no referent at all.

⚠️ **be precise about what is and is not free, because this record has already over-corrected once.**
the honest ledger:

| cost | plain reuse | spread + append |
|---|---|---|
| declared **resources** | 3 | **3 — identical** |
| **code** | a field reference | one expression inline, **or** one small function if ahbode's shape is mirrored |
| an **empty** artifact to defend | — | **none exists** |

⇒ so the close is not literally free: a bundle **function** is a real declaration a reviewer reads,
and F1's own fork row above names one. **what it is not is a new declared resource, nor an empty
policy.** those two — the objection actually raised — are the ones that dissolve.

⚠️ **no hunt that read fulcrums one at a time could reach this.** F1 is coherent alone; F5 is coherent
alone; the defect lives **between** them. ⇒ a fulcrum's cost estimate must be checked against what its
**peer fulcrums have already committed to build**.

## 🔴 the option this fork never weighed — the paired repo already runs it

**both reasons this record gave for the decline are falsified by a census of `ahbode/infrastructure`,
run at review round 4.** the declines were: *"`rule.prefer.wet-over-dry` sets the bar at a real second
usage and there is none yet"*, and *"an empty policy is a shape a reviewer would rightly question."*

| the decline | what the census found |
|---|---|
| *"no second usage yet"* | ⛔ **false.** `getResourcesOfGroveReachTarget` is called at **two** sites — `account=prep/resources.ts:43` and `account=prod/resources.ts:41` — and its factory emits a per-role inline attachment `${roleName}-extension` **every time** (`resources.reach.ts:149-153`). n=2, in production, on the identical fork |
| *"an empty policy would be questioned"* | ⛔ **it is never empty in the paved shape.** the attachment carries `input.bundle.inline`, so the shared statements are delivered THROUGH the per-role attachment. there is no empty artifact to defend |

⚠️ **and the paved shape is a THIRD option, not the middle one.** ahbode does not reuse a shared
bundle and bolt an empty policy beside it. it declares a **bundle function per target**
(`getGroveReachPrepBundle`, `resources.reach.ts:69-99`) that **spreads** the shared bundle's
statements and **appends** the target's own:

```ts
inline: new DeclaredAwsIamPolicyDocument({
  statements: [
    ...roleEverydayPowerPolicyBundle.inline.statements,  // ONE source of truth
    new DeclaredAwsIamPolicyStatement({ sid: 'DenySsmSession', effect: 'Deny', ... }),
  ],
}),
```

and its stated reason is **this fulcrum's exact argument**, in the paired repo's own words
(`resources.reach.ts:53-55`):

> *"the deny lands on the grove's DEDICATED prep role, NEVER on the shared everyday-power bundle —
> cicd deploys still use ssm, and the whole reason the reach got a dedicated target … is so the two
> can be tuned apart."*

⇒ **so the answer to *"is there precedent for a per-target policy divergence?"* is yes, twice, with a
rationale that cites the same R1 constraint.** the wet-over-dry objection does not apply to a shape
already at n=2 in the tree this reach pairs with.

### what it buys here, precisely

- **it closes the capability-layer inversion**, which the middle option does **not** — append one
  `Deny` on `iam:UpdateAssumeRolePolicy` scoped to `ehmpathy-demo-oidc`'s arn, and the grant can no
  longer rewrite cicd's trust policy (`case=5` `[t2']`)
- **it costs one function**, never a second bundle to drift — the shared statements are **spread**,
  so a change to `demoPermissionsPolicy` still reaches the grove on the next apply
- **it is the shape ahbode's F7 denies live in**, so if those denies ever *should* transfer, the
  vessel already exists (`inventory.of=fulcrums.case=F7-the-denies-do-not-transfer.md`)

⚠️ **it does NOT close the shared-bundle layer.** a spread is evaluated at declare time, so an edit
to `demoPermissionsPolicy` still moves the grove and cicd in one commit. ahbode's shape has the same
property and states it (`:113-116`: *"today each bundle matches the one its cicd counterpart uses;
the split is what makes an independent tune possible later, and it does NOT narrow power on its
own"*). ⇒ it buys the **capability** layer and a **place to diverge**, never the bundle layer.

**it is still not taken**, because the `Deny`'s effect is open question 7 (unverified — does an `iam:`
`Deny` scoped to a role's arn actually block `UpdateAssumeRolePolicy` on it?), and a shape adopted on
an unverified premise is the trap F8 already fell into. ⇒ it is named here as the option the wisher
should be offered **first**, since it is cheaper than the second bundle and strictly stronger than
plain reuse.

## ⚠️ the cost this call had OVERSTATED — the same review pass, the other direction

the "third arm" in the fork table above is **wrong**, and it was inherited from the wish rather than
checked. the hazard's arms are **provisions**, not consumers — it names *"TWO SEPARATE provisions …
two different commands against two different accounts"*:

| | before | after |
|---|---|---|
| bundle consumers | 2 | **3** |
| apply targets (arms) | `.root`, `demo` | **`.root`, `demo` — unchanged** |

`ehmpathy-demo-for-grove` lands in `account=demo/resources.ts`, the **same** provision as
`ehmpathy-demo-oidc`. one apply covers both. ⇒ the re-apply hazard is **cheaper** under reuse than
this fork table claimed, and the correction moves in reuse's favour.

what the third consumer really adds is a **plan-read** obligation: the hazard's step 3 expects one
`UPDATE` row per provision, and `account=demo` now owes two.

⚠️ **this does not move the 65%.** the number is driven by the R1 tension above and by the posture
call below, neither of which this touches — and to bump a confidence for a small correction in the
call's own favour would be exactly the self-flattering arithmetic a fulcrum record exists to prevent.
recorded because the fork must be stated **fairly**, and an overstated con is as unfair as an
understated one.

## why the confidence is 38%

⇒ the chain, in one line: **72% → 65% → 58% → 52% → 44% → 38%**, across five review hunts. each step
below names the hunt that took it.

- ✅ the empirical half is solid — the suite's iam needs are cited from source, never assumed.
- 🔴 **the R1 tension above was found at review rather than at write**, which is itself a signal: a
  call whose full cost surfaced only on a second pass had not been weighed as carefully as its
  confidence implied. 72% → 65%.
- 🔴 **and the capability-layer row was found LATER STILL — on the pass that attacked the
  decomposition's own orthogonality.** it is the third distinct cost this one call has grown, each on
  a different hunt, and it is the largest: the grant lets its holder rewrite the incumbent it was
  built to be isolated from. **65% → 58%.** ⚠️ the drop is no change of verdict — the empirical
  argument is untouched, and the middle option below now closes **two** layers rather than one. it is
  a change to *how much the wisher's verdict is worth*, and the answer is: more than it looked.
- ⚠️ the acceptance of in-demo admin is a **posture call that belongs to the wisher**, never to a
  driver. this is a security bound on an account, and "demo is a sandbox" is an assumption about
  what demo holds that has not been audited. `secretsmanager:GetSecretValue` on `'*'` is in the
  bundle (`resources.common.ts:239-247`), and the vision has not checked what secrets demo actually
  stores.
- 🔴 **and the population this bound applies to is the whole camp FLEET, present and future.** the
  principal is a role, so every grove box holds it, and **a box added tomorrow inherits it with no
  change or review here** (`dimensions.md`, axis A; ahbode's own identity form
  `<camp-grove-role-name>/<instance-id>`). ⇒ the wisher is not asked *"may this box hold demo
  admin?"* but **"may an open-ended, externally-governed fleet hold demo admin?"** — a question the
  driver cannot answer, since the fleet's growth is declared in another org's repo.
- 🔴 **and at round 4 a census found the fork itself was stated as a BINARY when it has three
  branches** — and that the third is the paved shape in the very repo this reach pairs with, declined
  here on two premises the census falsifies. **58% → 52%.** ⚠️ this is a different KIND of drop from
  the three above. those each found a **cost** the call had unpriced; this one found the call had
  **not enumerated its own options**. a confidence over a fork is a claim about the fork's branches
  as much as about the pick, so an un-enumerated branch discounts the number directly.
- 🔴🔴 **and the same round found this call had INVENTED the cost it declined those options on.**
  F5 already commits to the per-role `…AttachedInline`, so the alternatives cost **zero new declared
  resources** — plus one expression, or one small function if ahbode's shape is mirrored — and the
  *"empty policy"* objection has no referent. **52% → 44%.** ⚠️ **this
  is the most serious of the four drops, and the only one that touches the call's own honesty rather
  than its information.** the three before it found costs the driver had not yet learned; this one
  found a cost the driver **supplied**, in the direction that favoured the pick. ⇒ the reuse call
  now rests on its empirical half **alone** — which is still solid, and is now visibly the *only*
  thing holding it up.
- 🔴🔴 **and at round 5 a census of the paired tree found the model this pick INVERTS, stated as an
  invariant.** `term=tier._.choice.reason.md:163` — *"**EVERY `iam:` write needs the admin tier.** the
  everyday tiers carry `iam:Get*`/`List*` only"* — and `:166-168` — *"the admin tier is **HUMAN-ONLY
  in practice**: it is reached by an interactive sso login, **which a clone cannot perform**. so
  'this needs the admin tier' and 'this needs a human' are the same sentence."*
  ⇒ **44% → 38%.** the earlier entries graded the tier word as a poor **fit**; this is stronger and
  different in kind. the caller-side repo holds a **stated invariant** that the identity which writes
  `iam:` is the one a clone can never assume — and the pick hands a clone exactly that, in demo.
  ⚠️ **so the divergence is not a vocabulary mismatch across two orgs; our grant breaks a rule the
  grantee's own repo runs on.** a reviewer of both trees will read it as one or the other, and only
  this row tells them which.
- ⚠️ **and the same brief names the CAUSE, which bears on F7 as much as here** — *"the tier is the
  cause; every such path is a leaf of it"* (`:99-101`). ⇒ an action- or resource-level carve-out on
  `ssm:` closes one leaf; `ec2:*`, `s3:*`, `secretsmanager:*` stay open under the same bundle. **the
  bundle is the dial, and F1 is where it turns.**
- ⚠️ it is **shared with the paired ahbode tree**, which may rule the other way. if that tree landed
  first, its yield wins. 🔴 **and the census shows this is no longer a hypothetical** — that tree has
  already answered this fork, in code, at two call sites.

## rework, and why it is clean

the bundle is one argument to one declaration. to swap it later is a one-line change plus a re-apply
of one account. no caller hardens against it — the grove reads whatever the session grants. so a
reversal costs one apply, never a teardown.

## where

`provision/aws.auth/account=demo/` — whichever file declares the grove target role's policy
attachments.

## 🔴 the verdict — RULED 2026-09-08, the pick UPHELD

the wisher, in their own words:

> *"yeah this is fine; demo account needs full access. no worries"*

⇒ **plain reuse of `demoPermissionsPolicy` stands.** the declaration carries
`document: demoPermissionsPolicy.inline` — no spread, no append, no second bundle.

### what the wisher was handed, and ruled on

the ask was put as the **conjunction**, never the headline: is admin acceptable, **AND** a shared
permission surface with cicd, **AND** a grantee that can rewrite cicd's own trust policy, **AND**
arbitrary command execution on every demo host? ⇒ all four, and the answer covers all four.

⚠️ **and it was put BOTH ways**, since the two framings argue opposite postures:

| framing | what it says |
|---|---|
| **standalone** — what an auditor sees | admin of an aws account, handed to a foreign org's fleet |
| **marginal** — what the wisher decides | **+1 sandbox** onto an actor that already reaches ahbode **prep and prod** through its ambient badge |

### 🔴 what the ruling closes, beyond this fork

| it settles | how |
|---|---|
| **open question 1** | the crux. answered |
| **the actor × stage orthogonality** | it was ✅ *under the pick* and would be ✗ under the narrowed branch. **the pick is now ruled, so the contingency is discharged** — the 9 hostage rows stand as walked, unconditionally |
| **the last two `rhx review` residuals** | both reduced to this one open item. both close with it |
| **questions 7, 12, 13, 14** | they gated the **ask**, never the design. with the ask answered they are no longer prerequisites — 7 and 12 priced whether the escalation paths were closeable; 13 and 14 their magnitude |

⚠️ **they do not become worthless — they become OPTIONAL.** each still measures a real residual
(`case=5`), and 13 in particular (*does demo hold a production-grade secret?*) is one `ListSecrets`
call. ⇒ **downgraded from gate to hygiene**, never struck.

### ⚠️ what the ruling does NOT settle

- the **spread + append** option stays named and un-taken. if a future round wants the capability
  layer closed, the vessel is described above and costs zero new declared resources
- ahbode's stated invariant — *"EVERY `iam:` write needs the admin tier … which a clone cannot
  perform"* — **is still inverted by this grant.** the wisher ruled for ehmpathy's demo account,
  which is ehmpathy's to rule. ⇒ **the paired tree may still object on its own half**, and that is
  a conversation for the merge, not a defect here
- the residual itself is unchanged. `case=5` remains an accurate account of what the grant confers

## .see also

- `../1.vision.experience.case=5.any-process-on-the-box-holds-it.md` — the cost, lived through
- `inventory.of=fulcrums.case=F7-the-denies-do-not-transfer.md` — the paired call on ahbode's denies
