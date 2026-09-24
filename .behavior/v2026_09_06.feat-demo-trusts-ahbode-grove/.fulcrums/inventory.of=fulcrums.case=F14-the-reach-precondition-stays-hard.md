# F14 — the reach precondition stays HARD, with no lenient opt-out

**stage** · `5.1.execution.from_vision` · **rework** `clean` · **status** open · **confidence 84%**

## .the fork, stated fairly

the disclosure fix (T39) put the reach's principal behind two env vars read at the **composition
root**. `resources.ts` spreads both halves into one array, so the throw fires before the plan
renders — and it fires for **every** apply of `account=demo`, the grove-unrelated ones included.

peer lane `enroll-impl-arch-defects` (round 4) named the consequence and proposed a branch:

> *"an operator with no camp credentials on hand **cannot repair CI at all** right now. Since this
> repo already has the idiom for this exact tension (`keyrack.source({ mode: 'lenient' })`), the
> cleanest decompose-for-recompose move is to give `getOneCampReachIdentityFromEnv` the same lenient
> escape hatch — default fail-loud, but an explicit opt-out … that an operator can deliberately set
> to omit the reach for one urgent, unrelated apply."*

⇒ **two branches:**

| | the precondition | the cost it accepts |
|---|---|---|
| **A — taken** | stays hard. absent var ⇒ throw, always | an operator with no `.env` cannot apply the demo provision at all |
| **B — declined** | a `lenient` flag omits the reach and applies the rest | one env var can drop a live role from a plan, with no row |

## .taken, and why

**branch A — the hard precondition stays, and the ergonomic cost is paid with a READ-BACK rather
than an opt-out.**

🔴 **the decisive argument is this repo's own `case=7` `[t3]`.** the single most dangerous revoke
gesture it records is the **silent** one: drop a resource from `getResources()` and declastruct emits
**no plan row, no warn, no error** — the role stays live, still trusted, now unmanaged. F12 exists
because that gesture is uncaught by any check we can write today.

⇒ **branch B builds that exact gesture into the tool, and puts it behind an env var.** an operator
mid-outage sets `…_LENIENT=1`, applies, and the plan is silent about a role that carries
`iam:CreateRole` and `ssm:SendCommand` on `'*'`. worse than the manual gesture in two ways: it needs
no code edit, so **no diff and no review sees it**, and a shell export outlives the one apply it was
set for.

⚠️ **and the ask it was meant to serve is real.** so branch A only holds if the operator is not
actually stranded — which is what the rest of this call establishes.

### the mitigations, which are the whole reason A is affordable

| what was added | what it buys |
|---|---|
| the **read-back** — `aws iam get-role … Principal.AWS` | both values recovered in one command, from the account we own |
| the hint **names that command** | the throw is self-sufficient (`rule.require.errors-name-the-fix`) — no second lookup at 2am |
| `readme.md` → *no `.env`, and you need one NOW* | the canonical home, on disk, credential-free |
| `howto.reapply-demo-oidc-role` gains the `source` step + a pointer | the CI-repair runbook no longer hard-crashes when followed verbatim |

⇒ **neither value is a secret** — both live in the applied trust policy, and the demo-admin creds
every apply here already needs carry the `iam:GetRole` that reads them. the env var is disclosure
control against a **public git history**, so a read-back from our own account defeats no guarantee it
makes. **that asymmetry is what turns the wall into a step.**

## 🔴 .the residual branch A does NOT cover

**before the reach's first apply the role does not exist**, so `get-role` returns `NoSuchEntity` and
no value is recoverable. an ehmpathy admin who must repair CI in that window, and who is not
onboarded to the collaborator's tree, is genuinely blocked until they ask the applier.

⚠️ **it is bounded and short** — the window closes at the first apply of this wish, and the applier
is on hand by construction. but it is a real gap and the row exists so the council sees it rather
than infers it away.

## .rework, and why

**clean.** branch B is additive: one env read, one conditional spread at the composition root, and a
loud warn on the plan. no caller hardens against A, and no artifact binds on the throw's presence.
⇒ the council can take B later at the cost of one small edit plus the warn design.

⚠️ what would NOT be clean is the reverse. once a lenient flag ships and an operator's runbook uses
it, a later removal breaks a documented path mid-incident.

## .confidence, and why it is not higher

**84%.** the mechanism half is settled: `case=7` `[t3]` is this vision's own finding, the read-back
is verified against the trust-policy shape this wish declares, and the throw now names it.

what is **not** settled is a judgment the wisher owns:

🔴 **branch B trades a SILENT hazard for an operator's autonomy, and reasonable people weigh that
differently.** the argument above prices the silent hazard as the larger one — but it prices it
against a **hypothetical** misuse, while the CI-outage cost is a **measured** procedure this PR
already had to repair. a wisher who has been on the wrong end of a 2am outage may judge the trade the
other way, and a warn loud enough on the plan would narrow the gap.

⇒ and the residual window above is the honest weak point: for that window, branch A leaves the
operator with no path at all, where branch B would have left one.

## 🔴 .corroborated from OUTSIDE at 5.3 — and the confidence still does not move

peer lane `repo-rules` (5.3 verification, `i001` `r001`) reached this same surface **independently**,
from a different rubric, with no sight of this row. it graded it a **nitpick**, and it named the
blast radius in its own words:

> *"this precondition fires for EVERY account=demo apply, … the OIDC CI-repair path … that names the
> grove not at all. … it is a broad blast radius for a plan-time precondition on an unrelated
> resource, even though the tradeoff is documented (F14)."*

⚠️ **and it graded the rule-fit against branch A honestly**, before the driver could:

> *"This is not the exact failure class the rule forbids — there is no set op that 'guides or fixes'
> a … input, it is a mandatory identity for the declared resource, and the throw names the fix — so
> it is not a blocker."*

| what the corroboration settles | what it leaves open |
|---|---|
| the **mechanism** half — the blast radius is real, and a second reader sees it unaided | ⛔ **the judgment half, entirely.** the lane agreed the tradeoff is *documented*; it never weighed it |

🔴 **so the confidence stays at 84%.** an independent agreement about **what the code does** is
evidence; an independent silence about **which branch is right** is not. ⇒ the 16% is the wisher's
call by construction, and no count of reviewer rounds can close it
(`rule.always.raise-a-blocker-a-taken-cannot-close`).

⚠️ **the lane also could not see the residual below** — it assumes the read-back always works, which
makes the surface read milder than it is in the pre-first-apply window.

## .where

- `provision/aws.auth/account=demo/resources.reach.ts` — `CAMP_REACH_ENV_HINT` and the two throws
- `provision/aws.auth/account=demo/resources.ts` — the composition root that reads the identity
- `provision/aws.auth/account=demo/readme.md` — *no `.env`, and you need one NOW*
- `.agent/repo=.this/role=any/briefs/howto.reapply-demo-oidc-role.md` — the repaired walkthrough
- `provision/aws.auth/resources.common.ts` — the consumer roster the sibling readme now cites

## .the verdict

⏳ open.

## 🔴 .the lesson — a precondition on a COMPOSITION is a precondition on every member

the env read is scoped to the reach. its **blast radius is the aggregator**, because one array
literal evaluates both halves before either is usable.

⇒ so the fix's cost did not land where the fix did. it landed on `howto.reapply-demo-oidc-role`, an
incident-repair procedure that names the grove not at all — and on two command blocks in
`provision/aws.auth/readme.md` that no reviewer read.

⚠️ **the tell: when you add a precondition, ask what COMPOSES the thing you guarded, never what the
guard is about.** a census of *"who applies this file?"* finds every one of those callers; a census
of *"who uses the reach?"* finds none of them.
