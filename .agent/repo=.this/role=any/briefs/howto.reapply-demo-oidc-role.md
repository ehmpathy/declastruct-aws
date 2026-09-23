# howto.reapply-demo-oidc-role

## .what

the exact walkthrough to re-apply the demo account's OIDC role after a
`demoPermissionsPolicy` change — the CI half of the two-target re-apply that
`hazard.local-green-cicd-red.oidc-role-not-reapplied` warns about.

reach for this the moment a REQUIRED `suite / test-integration` (or
`test-acceptance-locally`) check fails in CI with an `AccessDeniedException` whose
principal is `arn:aws:sts::…:assumed-role/ehmpathy-demo-oidc/GitHubActions`, for an
action that IS already declared in `provision/aws.auth/resources.common.ts`.

## .the diagnostic signature (confirm before you act)

- CI (github actions) fails; local `test:integration` / `test:acceptance` passes.
- the error names the OIDC principal: `…/ehmpathy-demo-oidc/GitHubActions is not
  authorized to perform: <service>:<Action>`.
- that `<service>:<Action>` is ALREADY granted in `demoPermissionsPolicy` (often via
  a wildcard like `ses:*`, `budgets:*`, `ce:*`).

if all three hold: the grant is declared, the SSO role (local) has it, the OIDC role
(CI) is STALE. this is not a code change — it is a re-apply.

## .why it is not a code change

`demoPermissionsPolicy` (one bundle in `resources.common.ts`) feeds THREE roles applied
by TWO separate provisions:

| role | assumed by | re-applied via |
|------|-----------|----------------|
| `ehmpathy-demo-sso` (SSO permission set) | local keyrack creds | `provision/aws.auth/account=.root/resources.ts` |
| `ehmpathy-demo-oidc` (OIDC role) | github actions CI | `provision/aws.auth/account=demo/resources.ts` |
| `ehmpathy-demo-for-grove` (grove reach role) | an ahbode camp grove box's instance badge | `provision/aws.auth/account=demo/resources.ts` |

🔴 **the third row rides the SAME provision as the second**, so the walkthrough below
covers both — it is a third **consumer**, never a third apply target. what it changes is
the **plan-read** in step 2: expect **TWO** `UPDATE` rows, one per demo role. **ONE alone
means the apply was partial.**

a grant only goes live when each role's OWN provision is applied. add an action to the
shared policy, re-apply only one target, and you get local-green / CI-red (or the
reverse). the fix is to re-apply the stale target — here, the OIDC role.

## .the walkthrough (a human runs the admin auth)

the demo OIDC apply needs demo-account ADMIN creds (`use.ehmpathy.demo --owner admin`
→ keyrack `env=test owner=admin vault=aws.config`). that SSO login is interactive, so a
human runs it. an agent CANNOT do this step.

🔴 **step 2 is NOT optional, though this repair concerns the grove not at all.**
`resources.ts` composes **both** demo roles into one array, so its reach half reads
`GROVE_REACH_CAMP_ACCOUNT_ID` + `GROVE_REACH_CAMP_ROLE_NAME` before the plan renders. absent
either, the plan **hard-throws and names the var** — mid-outage, on a command that used to work.

```bash
# 1. authenticate as demo-account admin (interactive SSO — human only)
use.ehmpathy.demo --owner admin

# 2. supply the reach's caller identity (see below when you do not have it)
source provision/aws.auth/account=demo/.env

# 3. plan — confirm TWO UPDATE rows, one per demo role's inline policy
npx declastruct plan \
  --wish provision/aws.auth/account=demo/resources.ts \
  --into provision/aws.auth/account=demo/.temp/plan.json

# 4. apply
npx declastruct apply \
  --plan provision/aws.auth/account=demo/.temp/plan.json
```

read the plan: expect an `UPDATE` on **each** demo consumer of the bundle — the OIDC role
and the grove-reach role — since each holds its own inline attachment of the same
document. ⚠️ **ONE `UPDATE` where two are owed means the apply was partial.** a full
`KEEP` means both roles were already current — look elsewhere.

`provision/aws.auth/account=demo/resources.ts` does NOT call `keyrack.source()` (unlike
the infra wishes) — it reads the ambient creds that step 1 exports, and the reach's
principal from the vars step 2 exports. so steps 1-4 must share one shell session.

### ⚠️ no `.env`, mid-outage?

`.env` is gitignored, so a fresh clone has none, and the values come from a **private** collaborator
tree. that is a real wall at 2am — and there is a read-back that gets you through it, since neither
value is a secret and step 1's creds already carry the `iam:GetRole` it needs.

⇒ **`provision/aws.auth/account=demo/readme.md` → *no `.env`, and you need one NOW*.** it holds the
command, the one window it does not cover, and why a placeholder is worse than the wall.

✅ **and the throw itself names that command**, so an operator who trips step 3 needs no lookup at
all — this pointer serves the one who reads ahead.

## .after the apply

- re-run the failed CI: `rhx git.release --watch` (or push a no-op) — the required
  `test-integration` check now passes with the live grant.
- if LOCAL later fails on the same action, the SSO side is stale too — re-apply
  `account=.root` per `howto.add-test-permissions` (needs root admin creds).

## .the tell

"a required CI test fails on a permission the policy already grants" → suspect a stale
OIDC role FIRST, before you suspect the code. the fix is this re-apply, not an edit.

## .see also

- `hazard.local-green-cicd-red.oidc-role-not-reapplied` — the full hazard + why it hides
- `howto.add-test-permissions` — the SSO (root) side + how to add a NEW action
- `provision/aws.auth/readme.md` — the auth provision map + keyrack creds
