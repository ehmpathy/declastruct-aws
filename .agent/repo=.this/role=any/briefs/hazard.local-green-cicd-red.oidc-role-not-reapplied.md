# hazard.local-green-cicd-red.oidc-role-not-reapplied

## .what

## severity: blocker

every AWS action a declared resource needs at apply time must be granted to the demo test
roles via `demoPermissionsPolicy` (`provision/aws.auth/resources.common.ts`) AND those roles
must be re-applied so the grant is live. the trap: that one shared policy feeds THREE roles
across TWO SEPARATE provisions —

| role | assumed by | re-applied via |
|------|-----------|----------------|
| `ehmpathy-demo-sso` (SSO permission set) | local `keyrack test` creds, `test:acceptance:locally` | `provision/aws.auth/account=.root/resources.ts` |
| `ehmpathy-demo-oidc` (OIDC role) | GitHub Actions CI | `provision/aws.auth/account=demo/resources.ts` |
| `ehmpathy-demo-for-grove` (grove reach role) | an ahbode camp grove box's own instance badge | `provision/aws.auth/account=demo/resources.ts` |

re-apply one and forget the other and you get the signature failure: **local passes, CI
breaks** (or the reverse) on an `UnauthorizedOperation` for an action that IS present in the
declared policy.

🔴 **the third row is a third CONSUMER, never a third apply target.** it rides the SAME
`account=demo` provision as the OIDC role, so the two-command re-apply below still covers it.
what changes is the **plan-read**: a `demoPermissionsPolicy` edit now shows **TWO** `UPDATE`
rows in the demo plan, one per role. ⚠️ **ONE `UPDATE` alone means the apply was partial**, and
a singular check has no way to express that.

⚠️ **and the third row's failure looks unlike the other two.** the SSO and OIDC roles fail
inside our own suites, where a red check names them. the grove role fails on **another org's
box**, as an `AccessDenied` nobody here sees — see
`howto.revoke-grove-reach` for the four causes that one
`AccessDenied` can carry, and which of them `get-caller-identity` can rule out.

## 🔴 .the grant must be DECLARED and the ROLE must be DECLARED, in the SAME tree

the row above says the third consumer rides the same provision. ⚠️ **that is true only once its
declaration is in the tree you apply from** — and a branch can carry one half without the other:

| half | file | what it does |
|------|------|--------------|
| the **grant** | `provision/aws.auth/resources.common.ts` | adds the action to `demoPermissionsPolicy` |
| the **consumer** | `provision/aws.auth/account=demo/resources.reach.ts` | declares the role + attaches that policy |

an apply reads ONE tree. so a tree with the grant and no consumer never reaches the role, and a
tree with the consumer and no grant attaches a policy that lacks the action. **both halves must be
present in the tree you apply from** — a correct apply of an incomplete tree is still a red lane.

⚠️ measured 2026-09-20: both provisions applied correctly, and the local suite stayed red at 7/7 on
`s3:PutBucketPublicAccessBlock`. the role was live in AWS (hand-applied ahead of its declaration)
while its declaration sat on an unmerged branch that predates the grant.

🟢 **that instance closed 2026-09-24** — `#105` merged `resources.reach.ts` to main, so the grant
and its consumer now share a tree. **the hazard is not retired with it.** the two halves still live
in two files, either can land alone again, and the failure reads identically each time.

⇒ **the two sections above are one check in two grains, and the order matters**: the TREE question
comes first (is the consumer declared at all?), the two-`UPDATE` question second (did the apply
reach both consumers it declares?). ⚠️ **a tree that declares one consumer yields ONE `UPDATE` and
looks partial — while being complete for that tree.** so the row count is evidence only once the
tree is known.

**so when a lane stays red after a correct two-target apply, ask which TREE you applied from** —
not merely which provision you ran.

---
---
---

# deets

## .why this trap is so easy to fall into

all three roles read the SAME source of truth (`demoPermissionsPolicy`), so it FEELS like
one act. but the grant only goes live when each role's OWN provision is applied — and
those are two different commands against two different accounts:

- the SSO permission set lives in the management/root account → `account=.root` provision
- the OIDC role AND the grove-reach role live in the demo account → `account=demo` provision

so "I applied the policy" is ambiguous. you likely applied ONE of the two targets.

## .the "up to date" red herring

the root provision (`account=.root`) aggregates admin-sso + demo-account + demo-sso +
root-account. after you apply it, it may report **"all is up to date"** — because the SSO
permission set was already current. that green result feels like "done", but it is silent
about the OIDC role, which is a wholly separate provision. the OIDC role can still be stale
while root reports up-to-date.

## .the diagnostic signature

this hazard has a very specific fingerprint — learn to recognize it:

- **local acceptance passes** (`npm run test:acceptance:locally`) — the SSO role is current
- **CI acceptance fails** with `UnauthorizedOperation` on an EC2/IAM action — the OIDC role
  is stale
- the failed principal in the error names the OIDC role, e.g.
  `assumed-role/ehmpathy-demo-oidc/GitHubActions is not authorized to perform: ec2:...`
- the SAME action IS present in `demoPermissionsPolicy` (so it looks declared and correct)

if local is green and only CI is red on a permission error, suspect an un-reapplied OIDC
role FIRST — before you suspect the code.

## .why it stays hidden until a create/update

every role converges to KEEP while the resources already exist, so no role's mutate
action is ever called and the drift stays invisible. the divergence only surfaces when the
resource must be created or updated (fresh account, pruned orphan, changed immutable
attribute) — and it surfaces in whichever environment holds the STALE role. CI recreates
resources far more often than a warm local account does, so CI is usually the one that
breaks first — which is exactly why "works on my machine" is the classic tell here.

a real incident: #59 added a NAT instance (which needs `ec2:ModifyInstanceAttribute` to
disable its source/dest check) and correctly declared that action in `demoPermissionsPolicy`
— but the live roles were never re-applied. acceptance stayed green because the NAT persisted
(KEEP). a later cleanup terminated the NAT; the recreate called `ec2:ModifyInstanceAttribute`;
the stale OIDC role lacked it; the whole CI acceptance suite aborted. the declaration was
already correct — only the re-apply was owed.

## severity: blocker

a broken apply in CI blocks every downstream resource and every release, and the failure is
delayed and misattributed (it surfaces on the next create/update, in whichever env holds the
stale role — not on the PR that introduced the resource), so it costs hours to trace back to
a stale policy. there is no leniency.

## .how to avoid it

treat a `demoPermissionsPolicy` change as a **two-provision** change, always:

1. **declare** every action the resource's create/update path can issue in
   `demoPermissionsPolicy` — the single policy all three roles consume. never grant an
   action ad-hoc to one role only.
2. 🔴 **check the TREE holds every consumer** before you apply. an apply reads ONE tree, so a
   branch that carries the grant and not its consumer never reaches that role. `git ls-tree`
   the `account=demo/` and `account=.root/` provisions and confirm each role you expect is
   declared THERE, not merely somewhere. ⚠️ **this step also fixes the row count step 4
   expects** — a tree that declares one demo consumer owes ONE `UPDATE`, not two.
3. **re-apply both targets** so the grant is live, not just declared:
   - the demo account (CI oidc + the grove reach): apply `provision/aws.auth/account=demo/resources.ts`
   - SSO permission set (local): apply `provision/aws.auth/account=.root/resources.ts`
4. **read each plan** — confirm an `UPDATE` on the inline policy of **every** role that
   target owns **and that step 2 confirmed is declared there**. ⚠️ `account=demo` owns **two**
   on a complete tree, so ONE `UPDATE` there means either a partial apply or an incomplete
   tree — step 2 is what tells the two apart. an `UPDATE` on one target does not mean the
   other is current, and a single "up to date" is not proof every role is synced.
5. **verify live** before you depend on it — a create/update apply of the resource (not just
   a KEEP) must succeed.

## .how to know which action a resource needs

read the set operation's SDK calls. each `new XxxCommand(...)` maps to an IAM action
(`ec2:RunInstances`, `ec2:ModifyInstanceAttribute`, `ec2:CreateNetworkInterface`, ...). every
action the create/update path can issue must be in `demoPermissionsPolicy`. when in doubt,
force a create (prune the resource, re-apply) in a scratch run and read the first
`UnauthorizedOperation` — but prefer to enumerate from the SDK calls up front.

## .the tell

ask two questions, in this order — the first is the one that gets skipped:

1. 🔴 **"which TREE did I apply from, and does it declare every role I expect to reach?"**
2. "did I re-apply BOTH targets, and did I SEE the expected `UPDATE` on **every** role each
   target owns?"

- both applied from a tree that holds every consumer, every `UPDATE`/up-to-date confirmed → safe
- only root applied ("up to date") → the two demo roles are probably still stale → CI will break
- only demo applied → local/SSO may still be stale
- ⚠️ demo applied, but only ONE `UPDATE` row seen → **ambiguous until Q1 is answered.** on a
  complete tree `account=demo` owns two bundle consumers, so one row means a role's inline
  attachment never reached the aggregator — but on a tree that declares one consumer, one row
  is correct and complete
- 🔴 **both applied, correct plans, and a lane STILL red** → suspect Q1. a role live in AWS but
  undeclared in the tree you applied from consumes the policy from naught
- a create-from-scratch of the resource must succeed with each role's live creds

## .enforcement

- a `demoPermissionsPolicy` change with only one of the two provisions re-applied = blocker
- 🔴 an apply from a tree that does not declare every role the grant must reach = blocker
- an apply-time action absent from `demoPermissionsPolicy` = blocker
- a required action granted to only one of the three roles = blocker (they must stay in sync
  via the shared policy)
- a `demoPermissionsPolicy` change applied to `account=demo` **from a tree that declares both
  consumers** with only ONE `UPDATE` row read = blocker (that target owns two; one row is a
  partial apply)
- a "local passes, CI fails on a permission" symptom triaged as a code defect before the
  role-drift check = wasted cycles; check role drift first
- a still-red lane after a correct two-provision apply, triaged as a code defect before the
  TREE check = the 2026-09-20 signature; check which tree you applied from first

## .see also

- `howto.add-test-permissions` — the mechanics: which provision owns which role, and the
  apply commands for both
- `rule.forbid.silent-resource-theft` — the ownership gate whose fail-loud (correctly)
  surfaced the pruned-orphan recreate that first exposed this drift
- `rule.forbid.test-blocking-orphans` — the orphan lifecycle whose prune forces the
  create/update that reveals the stale role
