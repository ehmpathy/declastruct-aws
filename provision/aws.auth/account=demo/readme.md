# aws.auth / account=demo

provisions auth resources in the demo account.

## resources

- `resources.oidc.ts` — GitHub OIDC provider + role for CI/CD
- `resources.ts` — aggregates all above

## prereqs

1. demo account must exist (provision `account=.root` first)
2. store aws profile in keyrack (see `../readme.md` keyrack section)

## apply

```bash
# authenticate
use.ehmpathy.demo --owner admin

# plan
npx declastruct plan \
  --wish provision/aws.auth/account=demo/resources.ts \
  --into provision/aws.auth/account=demo/.temp/plan.json

# apply
npx declastruct apply \
  --plan provision/aws.auth/account=demo/.temp/plan.json
```

## permissions

the OIDC role uses `demoPermissionsPolicy` from `../resources.common.ts`.

to update permissions, apply to both accounts:
1. apply `account=.root` (updates SSO permission set)
2. apply `account=demo` (updates OIDC role)
