# F9 — the trust statement carries no `Condition`

**rework** · clean  ·  **status** · open  ·  **confidence** · **60%** 🔴

## the fork, stated fairly

a trust statement restricts assumption on **two** axes, and this vision only ever walked one:

| axis | what it answers | what the vision did |
|---|---|---|
| `Principal` | **who** may assume | ✅ walked at length — F1, F2, the "dedicated role" rule, `case=4` |
| `Condition` | **under what circumstances** they may | ⛔ **never mentioned once** |

⚠️ **and the omission is not a scope bound.** `DeclaredAwsIamPolicyStatement.condition` exists
(`src/domain.objects/DeclaredAwsIamPolicyStatement.ts:58`, nested at `:81`), with unit coverage
(`DeclaredAwsIamPolicyStatement.test.ts:252-266`). ⇒ a `Condition` is **expressible today**, with no
`src/` change — unlike `permissionsBoundary` (open question 2) or `delIamRole` (open question 3).

🔴 **this vision even reaches for a Condition elsewhere** — `case=7` `[t3'']` lists *"add a Condition
that cannot match — expressible today"* as a **revoke** shape. so the primitive was known, used for
teardown, and never weighed for **restriction at grant time**.

| candidate | what it would buy | why not |
|-----------|-------------------|---------|
| **no condition** | — | **taken** |
| `sts:ExternalId` | the canonical confused-deputy guard for cross-**org** trust — and this IS cross-org | ⛔ **it does not close `case=5`.** the secret would live on the grove box, and that box answers IMDS **for every uid** (ahbode `term=camper`), so the rogue process reads it exactly as the clone does. it degrades to obscurity |
| `aws:SourceIp`, bounded to the camp fleet's egress | 🔎 **a real narrow bound against TOKEN EXFILTRATION** — a stolen session replayed off-fleet fails | needs the caller-side egress range, which lives in another org's tree, and a NAT/egress change there would silently break the reach — a `case=2`-shaped failure with a new cause |
| `sts:RoleSessionName` matched to an instance-id pattern | would make cloudtrail's session name **trustworthy**, which `case=5` `[t5']` says it is not | ⛔ same defect — the session name is chosen by the **caller**, so a rogue picks one that fits |

## 🔴 round 6 — the `aws:SourceIp` candidate is now WALKED, and that changed how it reads

a peer reviewer blocked `case=5` as a sharp critipath with no demonstrated fail-safe. the repair
found that **two controls existed and neither had been claimed as one** — and this candidate was the
sharper of the two. it is now demonstrated at `case=5` `[t8]`.

⚠️ **the fulcrum's verdict is UNCHANGED — it is still `not taken`, and the caller-side-egress
objection above still stands.** what changed is its **status in the vision's argument**:

| before round 6 | after |
|---|---|
| a row in this table, weighed and declined | **a walked step** — the one control that fails an **exfiltrated** token, stated with its cost |
| `case=5` read as *"no fail-safe holds"* | `case=5` reads *"two controls hold, one residual is open"* |

🔴 **and the reason it read as absent is worth the record: a candidate weighed in a fulcrum and
declined is invisible to a coverage reviewer.** the reviewer grades the **experience artifacts**; a
fulcrum is where a *decision* lives, not where a *control* is demonstrated. ⇒ **a control you
considered and declined still owes a line in the case that would use it** — else the case reads as
though the control was never found.

⚠️ **the honest read for the wisher: it is cheap, it needs no unverified premise** (a `Condition` on
an `Allow`, not a `Deny` — contrast question 7), **and its cost is a cross-org dependency** on an
egress range another team can change with no signal to us. that tradeoff is the fork; it is unchanged.

## taken, and why at the time

**no condition — and it was never a decision, which is the defect this row records.**

the honest reconstruction: the vision decomposed the grant along *principal* and *permission*, and a
condition is neither. so no hunt reached it, through five review rounds.

⇒ the call itself is probably **right**: every candidate above either fails against `case=5`'s actual
actor or imports a foreign-repo dependency. ⚠️ **but a right answer reached without the question put
is indistinguishable from an oversight**, and a reviewer who knows aws will ask about `ExternalId`
within one screen of the trust policy.

## 🔴 what a condition WOULD buy, and it is not zero

`case=5` `[t4]` names token exfiltration and defends it with **one** control — the 1h expiry — and
`case=7` `[t4']` shows a revoke does not reach a live token. ⇒ against an **exfiltrated** token, the
vision's whole defence is *wait an hour*.

an `aws:SourceIp` bound to the camp fleet's egress is the one candidate that adds a second control
there: a token lifted off the box and replayed elsewhere fails at once. ⇒ **it is weak against the
on-box rogue and strong against the off-box replay**, which are two different threats the vision had
merged.

## why the confidence is 60%

the **empirical** half is solid: each candidate is checked against `case=5`'s actual actor and each
fails or costs a cross-repo dependency. the 40% is that this was **not weighed at write** — it was
reconstructed at review round 5, after the fact, which is precisely the shape of judgment
`rule.always.itemize-the-fulcrums-you-best-guess` exists to flag. and one candidate
(`aws:SourceIp`) has a real benefit against a threat the vision otherwise leaves to a clock.

## rework, and why it is clean

a `Condition` added to one trust statement is one field on one declaration, applied by one plan.
⚠️ **and it is clean in only one direction** — to add one later is cheap; to **remove** one after the
caller half has been written to pass an `ExternalId` is a coordinated two-repo change, the same shape
as F2's. ⇒ if a condition is ever taken, it acquires F2's clock.

## where

`provision/aws.auth/account=demo/resources.reach.ts` — the trust statement's `condition` field.

## the verdict

_open._ ⇒ the ask to the wisher is narrow: **is *wait an hour* an acceptable sole defence against an
exfiltrated token, or is an `aws:SourceIp` bound worth a dependency on ahbode's egress?**

## .see also

- `../1.vision.experience.case=5.any-process-on-the-box-holds-it.md` — `[t4]`, the exfiltration row
- `../1.vision.experience.case=7.the-reach-is-revoked.md` — `[t3'']`, where a Condition IS reached for
- `inventory.of=fulcrums.case=F2-the-role-name.md` — the same two-repo clock this would acquire
