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

`demoPermissionsPolicy` (one bundle in `resources.common.ts`) feeds TWO roles applied
by TWO separate provisions:

| role | assumed by | re-applied via |
|------|-----------|----------------|
| `ehmpathy-demo-sso` (SSO permission set) | local keyrack creds | `provision/aws.auth/account=.root/resources.ts` |
| `ehmpathy-demo-oidc` (OIDC role) | github actions CI | `provision/aws.auth/account=demo/resources.ts` |

a grant only goes live when each role's OWN provision is applied. add an action to the
shared policy, re-apply only one target, and you get local-green / CI-red (or the
reverse). the fix is to re-apply the stale target — here, the OIDC role.

## .the walkthrough (a human runs the admin auth)

the demo OIDC apply needs demo-account ADMIN creds (`use.ehmpathy.demo --owner admin`
→ keyrack `env=test owner=admin vault=aws.config`). that SSO login is interactive, so a
human runs it. an agent CANNOT do this step.

```bash
# 1. authenticate as demo-account admin (interactive SSO — human only)
use.ehmpathy.demo --owner admin

# 2. plan — confirm an UPDATE on the OIDC role's inline policy
npx declastruct plan \
  --wish provision/aws.auth/account=demo/resources.ts \
  --into provision/aws.auth/account=demo/.temp/plan.json

# 3. apply
npx declastruct apply \
  --plan provision/aws.auth/account=demo/.temp/plan.json
```

read the plan: expect an `UPDATE` on the OIDC role (its inline policy gains the absent
action). a full `KEEP` means the role was already current — look elsewhere.

`provision/aws.auth/account=demo/resources.ts` does NOT call `keyrack.source()` (unlike
the infra wishes) — it reads the ambient creds that step 1 exports. so steps 1-3 must
share one shell session.

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
