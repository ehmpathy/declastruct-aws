# aws.auth / account=demo

provisions auth resources in the demo account.

## resources

- `resources.oidc.ts` — github oidc provider + role for cicd
- `resources.reach.ts` — a role a collaborator's grove box assumes ⇒ **`readme.reach.md`**
- `resources.ts` — aggregates all above

## prereqs

1. demo account must exist (provision `account=.root` first)
2. store aws profile in keyrack (see `../readme.md` keyrack section)
3. 🔴 **`.env` filled and sourced** — `resources.reach.ts` reads its trust principal from two env
   vars, and the throw gates **every** apply here, reach-related or not. see `readme.reach.md`

## apply

⚠️ **one shell session, all four steps.** `resources.ts` does not call `keyrack.source()` — it
reads the ambient creds step 1 exports and the vars step 2 exports.

```bash
# authenticate
use.ehmpathy.demo --owner admin

# supply the reach's caller identity
source provision/aws.auth/account=demo/.env

# plan
npx declastruct plan \
  --wish provision/aws.auth/account=demo/resources.ts \
  --into provision/aws.auth/account=demo/.temp/plan.json

# apply
npx declastruct apply \
  --plan provision/aws.auth/account=demo/.temp/plan.json
```

### what to check in the plan

| check | expect |
|---|---|
| 🔴 a change to `demoPermissionsPolicy` | **TWO** `UPDATE` rows, one per consumer role. ONE alone means the apply was partial |
| 🔴 `ehmpathy-demo-oidc`'s trust policy | **exactly one** statement. a second means the reach leaked into cicd's identity |
| a **re-plan**, no source change | all `KEEP` |
| 🔴 the reach role's **trust principal** | see `readme.reach.md` — the shell supplied it, so this read is its only review |

## permissions

both roles here read `demoPermissionsPolicy` from `../resources.common.ts`, and the sso permission
set reads it too — **three consumers**, applied by **two** provisions:

1. apply `account=.root` (updates the sso permission set)
2. apply `account=demo` (updates the oidc role **and** the reach role)

⚠️ see `hazard.local-green-cicd-red.oidc-role-not-reapplied` — re-apply one target and forget the
other and you get local-green / cicd-red on an action the shared policy already grants.
