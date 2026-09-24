# F8 — the revoke shape

**rework** · clean  ·  **status** · open  ·  **confidence** · **55%** — the lowest on this list

## the fork, stated fairly

the vision's headline is *"revocation by declaration"*. it had assumed the mechanism was **deletion**
of the trust statement. that is **not expressible**: `DeclaredAwsIamRoleDao.ts:35` declares
`set.delete = null` (and the same on policy, user, instance profile, oidc provider), and `src/**`
holds no `DeleteRoleCommand`.

⚠️ **the delete surface is SPLIT, and this fulcrum had read it as uniform.** three iam DAOs **do**
implement `set.delete` — `…RolePolicyAttachedInlineDao.ts:38`, `…RolePolicyAttachedManagedDao.ts:38`,
`…IamUserAccessKeyDao.ts:41`. so the limit binds **the role**, never iam as a whole — which is what
makes candidate ⑤ below possible at all, and what makes the session-deny of the second act
**removable** once the incident closes.

so a revoke must be an **`upsert`** of the trust policy — and *which* upsert is unsettled.

⚠️ **seven rows below, and they sit at three different grains.** the count matters because the prose
elsewhere prices *"the four upsert candidates"*, and a reader who counts the table gets seven:

| grain | candidate | verdict |
|-------|-----------|---------|
| **class** | **an `upsert` that renders the statement unmatchable — shape TBD** | **taken, at the CLASS grain only** — it is the parent of the four below, never a fifth peer |
| **instance** ① | swap the principal to another arn | aws validates that an iam principal exists at write time (**unverified**, open question 9). the one arn certain to exist is the demo account **root** — which is **wider**, not narrower |
| **instance** ② | add a `Condition` that cannot match | ✅ expressible (`DeclaredAwsIamPolicyStatement:58`), keeps the policy at **one** statement per `case=3` `[t1]` — but a door held shut by a string comparison reads as a bug to the next maintainer |
| **instance** ③ | add an explicit `Deny` | needs a **second** statement, which breaks `case=3`'s own acceptance criterion |
| **instance** ④ | `NotPrincipal` via `principal.exclude` | ✅ expressible (`:37`), and aws documents `NotPrincipal` in a trust policy as a footgun |
| 🔴 **instance** ⑤ | **strip the role's ATTACHMENTS to zero** — a real declarative `delete` on each `…RolePolicyAttached{Inline,Managed}` | ✅ **fully expressible today**, and the only candidate that is a genuine DELETE rather than an upsert workaround. it leaves the trust policy at **exactly one** statement, so `case=3` `[t1]`'s acceptance criterion holds untouched. ⚠️ it revokes the **power**, never the **trust** — the grove could still assume a role that grants naught, so cloudtrail still logs the attempts (an audit gain) while the door reads as open (an operator-legibility cost). ⇒ strongest paired with ①–④, weakest alone |
| **out of class** | delete the role by hand (aws cli / console) | imperative, outside declastruct — it forfeits the whole *"by declaration"* claim |
| **out of class** | fund `delIamRole` + `set.delete` first | a `src/` change the wish scopes out ⇒ **raised, not absorbed** (open question 3) |

⇒ **①–④ are the TRUST-POLICY upserts; ⑤ is the ATTACHMENT delete.** they act on different resources
and answer different halves, so *"four"* in this file always means ①–④ and never includes ⑤. the last
two rows are the options this fulcrum **rejected the class of**, kept on the page so a reader knows
they were walked rather than overlooked.

## taken, and why at the time

**the CLASS was taken as *"an `upsert`, never a delete"*, and ⑤ narrows that to *"an upsert of the
TRUST POLICY, never a delete OF THE ROLE."*** the instance stays deliberately open.

what is settled is settled on evidence: the role-delete path does not exist, the trust policy path
does (`setIamRole.ts:69-75` issues `UpdateAssumeRolePolicyCommand` on every upsert), and *"delete the
declaration and apply"* is a **silent non-revoke** that leaves a fully-permissioned role live and
unmanaged.

🔴 **⑤ is what a uniform read of the delete surface had hidden.** with `set.delete` read as `null`
across iam, a delete-shaped revoke looked impossible in principle, so the search never left the trust
policy. three DAOs implement it, so **a genuine declarative delete is on the table** — it simply
targets the role's *power* rather than its *trust*.

what is **not** settled is which instance to write: ①–④ turn on an unverified aws behaviour (open
question 9) that would eliminate the most obvious and make the fallback *wider* than what it
replaces, and ⑤ turns on another (open question 11 **(d)**).

⇒ **a best-guess at the instance grain would be a guess about aws, not about this repo** — and this
vision has one rule it keeps: an unverified aws behaviour gets flagged, never asserted. so the class
is taken and the instance is deferred **with its five candidates priced**, which is more useful to
the wisher than a coin-flip dressed as a decision.

## 🔴 the scope this fulcrum had drawn too narrow — the revoke is TWO acts, not one

the four **trust-policy** candidates (①–④) answer *"which upsert of the trust policy?"*. that question
is only half of a revoke:

| the question | the act | ①–④ | 🔴 ⑤ |
|---|---|---|---|
| can a **new** session be obtained? | the trust-policy upsert | ✅ all four | ⛔ no — the trust statement is untouched |
| can an **extant** session still act? | an inline `Deny *` on `aws:TokenIssueTime` | ⛔ **none of them** | ✅ **plausibly yes** — see below |

🔴 **candidate ⑤ may answer the half that ①–④ cannot, and that is the strongest argument for it.**
iam evaluates a session's permissions **per call**, against the role's policies *as they stand at
that moment* — never against a snapshot frozen at issue time. so an attachment stripped mid-session
should take effect on the **next api call**, with no ≤1h tail.

⚠️ **UNVERIFIED**, and folded into open question 11 as sub-claim **(d)**. if it holds, ⑤ + ① is a
two-act revoke that is **wholly declarative and has no writable tail** — strictly better than the
inline-`Deny` shape, which needs a policy attached and later removed.

⚠️ **and the two out-of-class rows fare no better.** *"delete the role by hand"* **may** end live
sessions — a deleted role has no policy left to authorize a token, so its sessions plausibly die with
it — but that is **UNVERIFIED** (open question 11), and it forfeits the *"by declaration"* claim
outright regardless; *"fund `delIamRole`"* is the scoped-out `src/` change. so no row on this page is
a one-act revoke that stays declarative.

🔴 **that flag is itself a find.** the claim first landed here **asserted**, in a review-round repair
— inside the one file that states *"an unverified aws behaviour gets flagged, never asserted,"* four
sections below. ⇒ **a repair inherits none of the discipline of the artifact it repairs.** it is
written in review voice, where a confident sentence reads as a correction rather than as a new claim,
so the file's own rules do not apply themselves to it.

a trust-policy edit gates the next `AssumeRole` and does not reach a token already issued, so every
**trust-policy** candidate (①–④) leaves a **≤1h tail** in which a live session acts in full — and,
under F1's best-guess, writes `iam:` (`case=7` `[t4']`, `case=5` `[t2']`).

⚠️ **the second act has TWO expressible shapes, so it is a small fork rather than a settled point.**

| shape | mechanism | cost |
|---|---|---|
| an inline `Deny *` on `aws:TokenIssueTime` | `DeclaredAwsIamRolePolicyAttachedInline` **findsert**, then **delete** once the incident closes | a policy to add and later remove — ✅ both halves expressible, since that DAO implements `delete` |
| 🔴 **strip the attachments** (candidate ⑤) | `delete` on each attachment | no cleanup to undo, but the role sits inert rather than restored — a re-grant is a re-attach |

⇒ **the order is fixed regardless: power first, trust second.** end what a live holder can DO before
you close the door, or the door-close is a warn that hands them the tail (`case=5` `[t2']`).

⇒ **so this fulcrum's scope is: which trust-policy upsert (①–④) pairs with which power-side act
(the inline deny, or ⑤).** the second half narrowed from open to a two-way pick; it did not settle.

## why the confidence is 55%

- 🔴 **the whole question exists because the vision's aha was wrong**, and it was wrong across six
  files and four review rounds. a call born from a corrected headline has not had the scrutiny an
  eight-round-old call has.
- ⚠️ **the taken option is a workaround in every variant.** each of ①–④ carries a real cost:
  a wider trust, a comparison that reads as a bug, a broken acceptance criterion, or a documented
  footgun. **when every branch has a defect, the honest confidence is low** — the strong answer is
  the one the wish scopes out.
- ⚠️ it depends on an **unverified** aws behaviour (open question 9) that could remove the most
  intuitive candidate entirely.
- ✅ the *class* half is solid and cited from source, which is the only reason this is 55% rather
  than lower.

## rework, and why it is clean

the revoke is a future edit to one field of one declaration; no code is built on it today, and no
caller hardens against it. if `delIamRole` lands later, the workaround is deleted and replaced by
the real thing in one change. **the cost of a wrong guess here is paid only at revoke time** — which
is precisely why it must be settled **before** then, not during an incident.

## where

`provision/aws.auth/account=demo/resources.reach.ts` — the trust statement, at revoke time. and an
incident runbook, which is the artifact that actually needs the answer.

## the verdict

_open — and it is the one fulcrum whose answer is needed **before** the moment it is used, since the
moment it is used is an incident._

## .see also

- `../1.vision.experience.case=7.the-reach-is-revoked.md` — `[t3]`/`[t3']`/`[t3'']`, the walk
- `../1.vision.yield.md` — open question 3 (fund `delIamRole`?) and open question 9 (does aws
  validate trust-policy principals?)
