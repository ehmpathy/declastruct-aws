# F7 — the remote-root denies do not transfer

**rework** · clean  ·  **status** · open  ·  **confidence** · **74%** ⬆

🔴 **round 6 raised this 70% → 74%, on a find that makes the RESIDUAL worse.** the fourth branch
below — *bound by RESOURCE, never by action* — had one half recorded as **proven** (scope
`ssm:StartSession` to the two port-forward documents; ahbode ships exactly that in prod). **it is not
proven here.**

`src/access/sdks/sdkSsmSession/setSession.ts:14` declares `documentName?: string` and passes it
straight through, so an absent value means aws applies its **default session document — the
interactive shell**. and `sdks.integration.test.ts:353` calls `setSession` with `instanceId` and
`reason` only.

⇒ **the suite drives the shell document through `StartSession` as well as through `SendCommand`**, so
a document scope breaks a test. ⚠️ **the earlier enumeration grepped for the three literal document
names, and a call that passes none is invisible to that method.**

| | before | after |
|---|---|---|
| `ssm:StartSession` bound by document | ✅ proven, suite-safe | ⛔ **breaks the suite; needs a suite change first** |
| `ssm:SendCommand` bound by resource | 🔎 residual | 🔎 residual — unchanged |

⇒ **the confidence rises because the decision is MORE right, never less**: the case against a blanket
transfer of ahbode's denies is now stronger, and the one escape that looked cheap has a price. ⚠️ **it
stays open** because the resource bound is still worth a check (question 12) — it merely buys less
than this record claimed.

## the fork, stated fairly

ahbode's grove target for **prep** is not a plain tier bundle. it is the tier bundle **plus two deny
statements** that shut the remote-root surface (`provision/aws.auth/resources.reach.ts:69-99`):

- `DenySsmSession` — `ssm:StartSession`, `ssm:ResumeSession`
- `DenyRemoteExecution` — `ssm:SendCommand`, `ssm:StartAutomationExecution`,
  `ec2-instance-connect:SendSSHPublicKey`, `…SendSerialConsoleSSHPublicKey`

its reason is specific and good: *"any process on the grove, with zero privilege, can start an
interactive session on a prep instance and land as `ssm-user`, whom stock AMIs grant NOPASSWD:ALL.
that is a root shell in prep, one unprivileged curl away."*

| candidate | why not |
|-----------|---------|
| do NOT carry the denies into demo | **taken** |
| carry them verbatim | it would break this repo's own suites — see below |
| carry a narrowed subset **by ACTION** (e.g. deny `SendCommand`, allow `StartSession`) | both are exercised; a partial deny breaks a partial suite, which is the worst of both |
| 🔴 bound by **RESOURCE**, never by action — scope the ssm grants to the fixtures the suite drives | ⚠️ **not weighed at write.** it is the one bound that does **not** break the suite. see below |

🔴 **the first three candidates are all scoped by ACTION, and that is the flaw in the list.** every
one of these grants is on `resource: '*'` (`resources.common.ts:265, 276, 282, 288`), so a fourth
branch exists that the fork never named: **keep every action, bound the resource.** the suite drives
ssm against fixtures this repo declares and tags (`managedBy: 'declastruct'`), so a grant scoped to
those instances keeps every cited suite green while it removes *"any demo host, forever"* from the
blast radius.

⚠️ **and the paired repo had already weighed this exact branch and recorded why it declined**
— one screen below the quote this fulcrum already uses (`resources.reach.ts:60-67`):

> *".tradeoff = the deny is FLAT (no port-forward carve-out) … when a session names no document, aws
> falls back to `SSM-SessionManagerRunShell`, and whether that implicit arn is authorized as a
> resource is UNMEASURED here. a NotResource carve-out … would therefore risk a shell that still
> lands — a FALSE green for any play that probes this. a flat deny fails closed with no such doubt."*

⇒ **that rejection does not transfer here, and the asymmetry is the point.** ahbode reasoned about a
resource carve-out on a **`Deny`**, where an unmeasured fallback arn means the deny may not bite —
fail-open, a false green. here the carve-out would sit on an **`Allow`**, where the same unmeasured
arn means the allow may not cover the suite's own call — **fail-closed, a loud test failure.** the
identical uncertainty is dangerous in ahbode's direction and merely inconvenient in ours.

🔴 **CORRECTION, review round 5 — the fourth branch is NOT speculative. it is in production next
door, and ahbode names it "the target shape."** the sentence below called the resource shape
*"genuinely unmeasured"*; a census of `ahbode/infrastructure`'s `term=tier._.choice.reason.md:99-104`
falsifies that:

> *"the honest weight: the SSM shell is **not** an escalation — it is one expression of power the tier
> already grants. a deny on the shell document alone would patch a symptom while `ec2:*`, `s3:*`,
> `rds:*`, `lambda:*` all remain. **the tier is the cause; every such path is a leaf of it.**"*
>
> *"contrast **prod**, which shows the target shape: its reader bundle **scopes `ssm:StartSession` to
> the port-forward document alone**, so the shell document is out of reach **by construction, not by
> deny**."*

⇒ **three consequences follow, and each moves this fulcrum:**

1. **the resource-scoped `Allow` is a shipped shape**, not a hypothesis. ahbode's prod reader bundle
   already scopes `ssm:StartSession` to one document. so *"unmeasured"* was a claim about **our**
   knowledge, stated as a claim about **the shape**.
2. 🔴 **ahbode grades the action-scoped deny — the shape this fulcrum declined — as a SYMPTOM PATCH**
   in its own words. so the three branches this fork first weighed are, by the source repo's own
   analysis, the weak ones; the fourth is the one it endorses.
3. ⚠️ **and it names the real cause as the TIER, never the action list** — *"the tier is the cause;
   every such path is a leaf of it."* ⇒ that hands F1 the argument, not F7: a resource scope on
   `ssm:` closes one leaf while `ec2:*`, `s3:*`, `secretsmanager:*` stay open under the same bundle.

⚠️ **and the mechanism THIS fulcrum cites is itself hedged at its source.** `:97` grades the
root-shell claim — *"`StartSession` yields a shell as `ssm-user`, whom stock AMIs grant
NOPASSWD:ALL"* — as **"inferred, NOT measured on this host."** our `case=5` `[t1]` states it flatly.
⇒ the vision is **more confident than its own source**, which is blocker 31's shape on a foreign
citation: a summary that drifted upward across a repo boundary.

🔎 **that one residual is now open question 12 in the yield.** it was recorded here and nowhere the
triage looks, so the round-5 census both voided this fulcrum's decline reason and created a
checkable question the question list did not hold. ⇒ a census that moves a fulcrum owes a pass over
the question list too.

🔴 **SECOND CORRECTION, same round — the fourth branch is TWO bounds, and a grep of `src/` settles
the first one.** the residual above was written as one question (*"does a scoped `Allow` cover the
documents this repo's suite drives?"*). the suite drives exactly **three** ssm documents, and they
do not answer alike:

| document | driven at | scopable by document? |
|---|---|---|
| `AWS-StartPortForwardingSession` | `setSsmSshTunnel.ts:120` | ✅ yes |
| `AWS-StartPortForwardingSessionToRemoteHost` | `asSsmStartSessionArgs.ts:17` | ✅ yes |
| 🔴 **`AWS-RunShellScript`** | `access/sdks/sdkSsm/execCommand.ts:45` | ⛔ **no — this IS the shell** |

⇒ **so the fourth branch splits, and only half of it is the shape ahbode ships:**

| action | the bound | status |
|---|---|---|
| `ssm:StartSession` | **by document** — the two port-forward docs | ✅ **proven** — this is ahbode's prod shape, verbatim |
| `ssm:SendCommand` | **by instance resource** — the fixtures this repo tags | 🔎 unmeasured, and it is the whole residual |

⚠️ **and the split changes what the branch BUYS.** ahbode's prod bundle puts the shell document
*"out of reach by construction"* — it needs no shell. **this repo does**, at `execCommand.ts:45`.
so a document scope here cannot exclude `AWS-RunShellScript`; it can only narrow **where** that
document may land. ⇒ escalation path (c) survives a full fourth-branch bound as *arbitrary commands
on the declastruct-tagged fixtures* — **smaller, never closed** — which is a materially weaker claim
than *"out of reach by construction."*

**it is still not taken here**, and the reason is now sharper: half the branch is a proven shape and
half is unmeasured, and even fully applied it narrows path (c) rather than a close of it. it is
named so the wisher is offered it with that bound stated, and so the next traveler does not
re-derive a three-branch fork that has four.

## taken, and why at the time

**do not carry them.** the actions ahbode denies are the actions this repo's demo work **is**:

| action ahbode denies | granted here | the sdk call | the suite that drives it |
|---------------------|--------------|--------------|--------------------------|
| `ssm:StartSession` / `TerminateSession` / `ResumeSession` | `resources.common.ts:267-277`, *"for SSH/VPC tunnel connections"* | `sdkSsmSession/setSession.ts:29` — `StartSessionCommand` | `ssmSshTunnel.integration.test.ts`, `ssmSshTunnel.journey.integration.test.ts`, `ssmVpcTunnel/setSsmVpcTunnel.integration.test.ts` |
| `ssm:SendCommand` / `GetCommandInvocation` | `resources.common.ts:278-283`, *"for remote command execution"* | `sdkSsm/execCommand.ts:43` — `SendCommandCommand` | `ssmCommand.integration.test.ts` |
| `ec2-instance-connect:SendSSHPublicKey` | `resources.common.ts:284-289`, *"push ephemeral SSH keys to instances"* | `sdkEc2InstanceConnect/setSshPublicKey.ts:33` — `SendSSHPublicKeyCommand` | `ec2SshKeyAuthorized.integration.test.ts` (which names the grant at `:69`) |

⇒ the deny that protects ahbode's prep would **delete the purpose** in ehmpathy's demo. the two
accounts differ in kind: prep hosts a live service a grove has no business at root on; demo hosts
test fixtures a grove exists to drive.

⚠️ **why this earns a written record rather than a silent omission:** an engineer who reads both
trees will see ahbode deny exactly what ehmpathy allows, on structurally identical roles, and will
reasonably suspect an oversight. it is not one. the divergence is deliberate and the two accounts
genuinely differ.

## why the confidence is 70%

⇒ the chain: **91% → 78% → 70%**, across review rounds 4 and 5.

every action is cited from this repo's own source, with the grant's own `.why` comment that names the
use, and **the empirical half is untouched**: the actions ahbode denies are the actions the demo
suite drives, so a verbatim carry breaks the suite. that argument holds exactly as written.

- the residual is that the denies remain the right answer for any **future** ehmpathy account that is
  not a sandbox — so this call is scoped to demo and must not be read as a general position.
- 🔴 **91% → 78% at review round 4.** the fork was stated with **three** branches, all scoped by
  ACTION, and the fourth — scoped by RESOURCE — is the only one that narrows the surface **without**
  a suite break. it was never weighed, and the evidence for it was one screen below a quote this
  fulcrum already cites. ⚠️ **the drop is no change of verdict** — the fourth branch is unmeasured
  and correctly stays untaken. it is a drop because the **do-not-carry** pick was made against an
  incomplete list, and a do-nothing pick is exactly the one an incomplete list flatters.

- 🔴 **78% → 70% at review round 5**, and the drop has two independent causes:
  - the round-4 entry justified the untaken fourth branch as **"unmeasured"**. a census of the paired
    repo shows it is **shipped in ahbode prod**, and that ahbode grades the action-scoped shape this
    fulcrum took as a **"symptom patch"**. ⇒ the pick's own stated reason for the decline is void.
  - ⚠️ **and the premise this fulcrum cites is hedged at its source** — ahbode marks the root-shell
    mechanism *"inferred, NOT measured"*, while `case=5` `[t1]` states it flatly. so the empirical
    half is **not** wholly untouched after all: its severity rests on a claim the source repo
    declines to assert.
- ⚠️ **the verdict still stands, and for the unchanged reason**: a verbatim carry of the denies breaks
  the suite, cited action by action. what has fallen is the **quality of the fork's reasoning**, twice
  over — and per round 4's own lesson, **a confidence is a claim about the branches and their prices,
  never only about the pick.**

## rework, and why it is clean

a deny statement is additive to one document.

## where

`provision/aws.auth/account=demo/resources.reach.ts` — deny statements that deliberately do not
appear.

## the verdict

_open._

## .see also

- `../1.vision.experience.case=5.any-process-on-the-box-holds-it.md` — `[t1]`, the surface this call leaves open
- `inventory.of=fulcrums.case=F1-the-permission-bound.md` — the wider posture this narrows
