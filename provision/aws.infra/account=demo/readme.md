# aws.infra / account=demo

provisions infrastructure resources in the demo account.

## resources

- `resources.vpc.ts` — VPC, subnet, security group, internet gateway, route table
- `resources.ts` — aggregates all above

## purpose

dogfood infrastructure resources with standard demo credentials (same as CI/CD).

verifies that `demoPermissionsPolicy` includes all required permissions.

## prereqs

1. demo account must exist (provision `aws.auth/account=.root` first)
2. OIDC role must have VPC permissions (provision `aws.auth/account=demo` first)

## apply

```bash
# authenticate (standard demo credentials, not admin)
use.ehmpathy.demo

# plan
npx declastruct plan \
  --wish provision/aws.infra/account=demo/resources.ts \
  --into provision/aws.infra/account=demo/.temp/plan.json

# apply
npx declastruct apply \
  --plan provision/aws.infra/account=demo/.temp/plan.json
```

## if permissions are absent

update `demoPermissionsPolicy` in `aws.auth/resources.common.ts`, then apply both:
1. `aws.auth/account=.root` (updates SSO permission set)
2. `aws.auth/account=demo` (updates OIDC role)

then retry this provision.
