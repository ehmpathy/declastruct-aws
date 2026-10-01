# rule.always.keep-the-cicd-role-in-sync-with-the-tests

## severity: blocker

## .what

> **when a test case comes to need an aws action, grant it to the demo roles in the SAME change —
> unless the grant is an unacceptable security hazard, which you then name.**

the grant is declared **ahead of, or beside, the code that calls it** — never after the failure. an
iam grant for an action nobody calls yet is **inert**, so it can always land first at zero risk.

⇒ the mechanics — which provision owns which role, and the two apply commands — are
`howto.add-test-permissions` and `howto.reapply-demo-oidc-role`. this rule states **when** you owe
the edit and **who** may decline it.

---
---
---

# deets

## .why — the grant is free to add early and expensive to add late

| | a grant added **early** | a grant added **after the break** |
|---|---|---|
| risk of the grant itself | **zero** — an uncalled permission does naught | zero, identically |
| when you learn it was absent | never; it was there | in ci, on an unrelated PR, weeks on |
| what it costs to diagnose | — | 🔴 hours, and it reads as a code defect |

⇒ **the asymmetry is total.** there is no cost to the early grant and a measured cost to the late
one, which is why this is an `always` and not a `prefer`.

## 🔴 .why the failure defers, and why that is the whole hazard

an absent grant does **not** fail at the moment the test is written. it fails at the moment a **write
path first runs**, and those are usually far apart:

1. a declared resource converges to `KEEP` while it already exists, so its mutate action is never called
2. ⇒ the absent grant stays invisible across every green run
3. a create or an update eventually fires — a fresh account, a pruned orphan, a changed immutable attribute
4. **it breaks in whichever environment holds the stale role**, on a PR that touched none of it

⚠️ **and the reads and the writes fail at different STAGES**, which splits the signature again:

| grain | fails at | signature |
|---|---|---|
| an absent **read** grant | **plan** | every bucket, every consumer — loud and immediate |
| an absent **write** grant | **apply** | 🔴 **the plan is clean.** a green plan is no evidence the grants are live |

⇒ managed `ReadOnlyAccess` covers most `Get*`/`List*`, so **the write half is the half that bites**,
and it bites after the plan has already said all is well.

## severity: blocker

a stale role breaks the apply for every downstream resource, and the failure is **delayed and
misattributed** — it surfaces on a later PR, in one environment, as an `UnauthorizedOperation` for an
action the policy visibly declares. the local-green / ci-red signature is this repo's own documented
misdiagnosis hazard and has cost real hours. no leniency.

## .the trigger — the rule fires on a TEST, not on a deploy

| when… | then… |
|---|---|
| a new declared resource enters the acceptance fixture | 🔴 the trigger. enumerate its `Create*`/`Put*`/`Delete*` and grant them |
| a test case exercises a new sdk call | the same, at the call grain |
| a **field** is added to an extant resource | ⚠️ **the one that gets missed** — a new field can add a whole new api call. `access.public` needed two grants nobody predicted from "add a field" |
| a set op grows a new sdk command | read the diff for `new XxxCommand(...)`; each maps to an action |
| you would say *"ci will tell us"* | 🔴 ci will tell you **weeks late**, on someone else's PR |
| the test only ever reads | still grant the write, if the resource's `set` can fire |
| the grant is a real hazard | **decline it, and record why** — see below |

## .how to enumerate what is owed

read the set operation's sdk calls. each `new XxxCommand(...)` maps 1:1 to an iam action, so the
diff that adds the call is the diff that names the grant.

do **not** derive the list by a forced failure and a read of the first `UnauthorizedOperation` — that
finds them one at a time, one slow ci run each.

## 🔴 .the declaration is half. the APPLY is the other half, and it reads ONE tree

`demoPermissionsPolicy` is one bundle that feeds several roles, applied by **two separate
provisions**:

| role | assumed by | re-applied via |
|---|---|---|
| `ehmpathy-demo-sso` | local keyrack creds | `provision/aws.auth/account=.root/resources.ts` |
| `ehmpathy-demo-oidc` | github actions ci | `provision/aws.auth/account=demo/resources.ts` |
| `ehmpathy-demo-for-grove` | a camp grove box's instance badge | `provision/aws.auth/account=demo/resources.ts` |

⚠️ **"I applied the policy" is ambiguous, and that ambiguity is the hazard's engine.** one provision
applied and the other stale yields local-green / ci-red — or the reverse. the root provision can even
report *"all is up to date"* while a demo-account role is stale, because it aggregates a different set.

⇒ both applies need **admin, interactive** creds, so an agent declares and a **human applies**.

### 🔴 the bound on "declare it early" — the grant and its CONSUMER must share a tree

the zero-risk claim above has one limit, and it is not obvious: **an inert grant is only
inert-and-ready if the tree that carries it also declares every role that must consume it.**

- an apply reads ONE tree
- so a branch with the grant and no consumer never reaches that role
- and a branch with the consumer and no grant attaches a policy that lacks the action
- ⇒ each branch applies **cleanly**, and the lane stays red

⚠️ **the signature is a correct apply with a red lane.** every plan reads `UPDATE`, every provision
was run, and the action is visibly declared — so it reads as a code defect and gets triaged as one.

⇒ measured 2026-09-20 (`declastruct-aws#99`): the four s3 grants sat on the feature branch and
`-for-grove`'s declaration sat on `beav/feat-demo-trusts-ahbode-grove`, unmerged. the live role had
been hand-applied ahead of its declaration. both provisions applied correctly and the local suite
stayed red at 7/7 on `s3:PutBucketPublicAccessBlock`.

**so the rule gains a step: declare the grant early, AND confirm the tree you apply from declares
every consumer.** where it does not, the remedy is a merge/sequence call — never a second
declaration, which would attach a duplicate policy to a role another tree already owns.

## .the carve-out — an unacceptable security hazard

the rule has one exit, and it is not *"it felt broad"*:

| decline it | do not decline it |
|---|---|
| the action can **exfiltrate** or **destroy** beyond the demo account | it is a write, and writes feel scary |
| it grants **iam** privilege escalation (`iam:PassRole` to an unbounded role, `iam:*`) | it is a wildcard on a service already wildcarded here |
| it reaches a **non-demo** account or a shared resource | the resource pattern is `'*'`, as every peer statement here already is |

**when you decline, you owe two things:**

1. the reason, recorded where the grant would have gone
2. 🔴 **the test's disposition** — a test that cannot run is not a test. it is removed, re-scoped to
   a surface the role may touch, or marked as a known human-run check with an owner

⚠️ **a declined grant plus a retained test is the worst of the three outcomes** — a permanently red
lane that everyone learns to read past, which is `philosophy.verification-strictness`'s exact target.

## .the tell

> **"did this change teach a test to call an action the demo roles cannot?"**

- no → naught owed
- yes, and the grant is safe → **declare it in this change**, then a human applies both provisions
- yes, and the grant is a real hazard → decline it, record why, and say what happens to the test

⇒ then the second tell, once the grant is declared:

> **"does the tree I apply from declare every role this grant must reach?"**

- yes → apply both provisions, read both plans
- no → a merge/sequence call, **not a second declaration**

## .enforcement

- a test that needs an action absent from `demoPermissionsPolicy` = **blocker**
- a grant declared and only **one** of the two provisions re-applied = **blocker**
- 🔴 a grant applied from a tree that does not declare every consumer of it = **blocker**
- 🔴 a duplicate declaration authored for a role another tree already declares = **blocker**
  (it attaches a second, differently-named policy to one role)
- a grant declined with no recorded reason = **blocker**
- a grant declined with the test left in place and red = **blocker**
- a `demoPermissionsPolicy` change that adds an action the tests do not exercise = **nitpick**
  (dead grants accrete; every action should trace to a caller)

## .the discovery case

`declastruct-aws#99` @ `1.vision`. the vision named an iam gap as a **critipath demoed for
`system:ci`** (`case=6`) and then found a worse one (`case=10`): a consumer's minimal upgrade issues
no write, so the signal never fires, ci goes green, and the failure defers to an unrelated one-line
PR weeks on.

⇒ the wisher's question closed both: *"we can just add these grants now though right?"* — **yes, and
the reason generalizes.** the grant was never the risky part; the **lateness** was. an inert
permission can precede its caller at zero risk.

⚠️ **and the same wish then found that claim's bound.** the grants landed early, exactly as argued,
and the lane stayed red anyway — the tree that carried them did not declare the role that had to
consume them. *early* is necessary and not sufficient; *same tree* is the other half.

⚠️ the prior incident this rule is also written from: `#59` added a NAT instance and correctly
declared `ec2:ModifyInstanceAttribute` — **and the roles were never re-applied.** acceptance stayed
green for weeks because the NAT persisted (KEEP). a later cleanup terminated it, the recreate called
the action, the stale oidc role lacked it, and the whole ci acceptance suite aborted. **the
declaration was already correct; only the re-apply was owed.**

## .see also

- `hazard.local-green-cicd-red.oidc-role-not-reapplied` — the failure signature and why it hides
- `howto.add-test-permissions` — the mechanics: which provision owns which role
- `howto.reapply-demo-oidc-role` — the ci-side walkthrough, for a human
- `rule.require.declarative-test-infra` — the same dogfood discipline, for the resources themselves
- `philosophy.verification-strictness` (behaver) — why a permanently-red lane is worse than none
