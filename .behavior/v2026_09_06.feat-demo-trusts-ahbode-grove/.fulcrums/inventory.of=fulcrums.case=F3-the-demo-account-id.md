# F3 — the demo account id

**rework** · clean  ·  **status** · open  ·  **confidence** · 90%

## the fork, stated fairly

two conventions meet at this one grant, and the wish names the collision:

| convention | where | rationale it states |
|-----------|-------|--------------------|
| **hardcode the account id** | ahbode `provision/aws.auth/resources.reach-arns.ts:7-16` | *"an account id is a STABLE fact — once an account exists, its id never changes. so it is config, not runtime state"* |
| **read it from live credentials** | this repo, `provision/aws.auth/account=demo/resources.oidc.ts:24` | `provider.context.aws.credentials.account` |

## taken, and why at the time

**keep this repo's convention: the demo account id is read from live credentials, and appears in no
source file.**

three reasons, in order of weight:

1. **this side does not need it.** the target half declares a role *in* the demo account, with the
   *camp* arn as its principal. the demo account id appears in no arn we construct. the ahbode side
   hardcodes account ids because it builds **cross-account arns**; we build one **same-account
   role** and one **foreign principal arn**. different need, so the precedent does not carry.
2. **the wish's own constraint** — *"do not let the value end up in two places that can disagree."*
   an id absent from source can disagree with no one.
3. **local consistency wins a tie.** `resources.oidc.ts` sits in the same folder and reads the id
   the same way. a second convention in one directory is a cost with no payoff here.

⇒ the id the grove needs to *call* the role does live in a second place — the ahbode caller policy.
that is the paired tree's decision to make under its own hardcode convention, and it is correct
there for the reason ahbode states.

## 🔴 the scope note — the CONVENTION is theirs, the VALUE is ours

⚠️ **the sentence above answers one question and was read as though it answered two.** *"whose
hardcode convention applies?"* — theirs, correctly. *"who supplies the number?"* — **us**, and this
entry never said so, so no artifact in the vision named the handoff at all until review round 5.

the value ahbode must write composes **our** demo account id with **F2's** role name:

```
arn:aws:iam::<demo-account-id>:role/ehmpathy-demo-for-grove
```

🔴 **and reason 1 above is what makes it hard to supply.** *"the demo account id appears in no source
file"* is true and stays true — so **a reader of our tree cannot construct that arn.** the decision
is right for our half and it leaves the reach's one shared value unwritten anywhere.

⇒ **the decision stands at 90%; what it gains is an obligation.** the execution stage owes the arn as
a named deliverable of this wish, with the id resolved at author time. that is a value stated once in
a yield, never a constant in source — so the wish's *"do not let the value end up in two places that
can disagree"* is unharmed.

⚠️ **why it matters more than tidiness:** `case=7` `[t7]` establishes that their identity policy
matches **by arn string**. a typo yields a permanently dead reach that **both halves apply cleanly
into**, and it fails with the same `AccessDenied` as three other causes — the one cause the runbook's
`get-caller-identity` step cannot discriminate. see open question 20.

## why the confidence is 90%

the argument turns on a checkable fact — that no arn this side builds needs the demo account id —
and the check holds against the extant `resources.oidc.ts`, which needs it only for the **oidc
provider** arn (a construct this wish does not add). the 10%: if the execution stage finds a genuine
need for a self-arn, this flips, and it flips cheaply.

## rework, and why it is clean

to add a constant later is an additive one-line change. no consumer hardens against the absence.

## where

`provision/aws.auth/account=demo/` — an id constant would land here, and deliberately does not.

## the verdict

_open._
