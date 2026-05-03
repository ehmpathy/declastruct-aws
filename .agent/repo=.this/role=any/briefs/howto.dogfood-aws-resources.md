# howto.dogfood-aws-resources

## .what

we dogfood aws resources via `provision/*` when they require root/management account access.

## .why

some aws resources require management account credentials that are impossible to use in ci:
- organization service control policies (scps)
- organization account creation
- sso user/permission set management
- cross-account trust setup

integration and acceptance tests run against demo account credentials. management account operations cannot be tested there.

## .how

declare resources in `provision/aws.auth/account=.root/resources.*.ts`:

```bash
# authenticate as root admin
use.ehmpathy.root --owner admin

# create .env from example if it doesn't exist (one-time setup per worktree)
cp -n provision/aws.auth/account=.root/.env.example provision/aws.auth/account=.root/.env
# then edit .env with your values

# source environment variables
source provision/aws.auth/account=.root/.env

# plan
npx declastruct plan --wish provision/aws.auth/account=.root/resources.ts --into provision/aws.auth/account=.root/.temp/plan.json

# apply
npx declastruct apply --plan provision/aws.auth/account=.root/.temp/plan.json
```

this serves as real-world verification that the resource types work correctly.

see `provision/aws.auth/readme.md` for full documentation on auth setup and keyrack credentials.

## .when

use this pattern when:
- resource requires management account (organizations api)
- resource requires identity center admin
- integration tests would need credentials we cannot provision in ci

## .note

- scps: `resources.root.account.ts`
- sso users/permissions: `resources.admin.sso.ts`, `resources.demo.sso.ts`
- organization/accounts: `resources.demo.account.ts`
