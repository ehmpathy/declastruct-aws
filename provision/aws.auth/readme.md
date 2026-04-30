# aws auth

this directory provisions auth resources for aws accounts.

## overview

```
account=.root/resources.ts     account=demo/resources.ts
       ↓                              ↓
  provisions:                    provisions:
  - admin sso user               - github oidc provider
  - admin permission set         - oidc role for github actions
  - organization
  - demo account
  - demo sso user + permission set
```

## account=.root

resources provisioned in the management (root) account.

**files:**
- `resources.admin.sso.ts` - admin sso user + permission set
- `resources.demo.account.ts` - organization + demo account
- `resources.demo.sso.ts` - demo sso user + permission set
- `resources.ts` - aggregates all above

**setup:**
1. manually execute `account=.root/bootstrap.md`
2. verify setup via declastruct (all resources should show as KEEP):

```bash
use.ehmpathy.root --owner admin
source provision/aws.auth/account=.root/.env
npx declastruct plan --wish provision/aws.auth/account=.root/resources.ts --into provision/aws.auth/account=.root/.temp/plan.json
npx declastruct apply --plan provision/aws.auth/account=.root/.temp/plan.json
```

**after:** manually send sso user invitations to new users
1. go to [iam identity center → users](https://us-east-1.console.aws.amazon.com/singlesignon/home)
2. select the user(s) you created
3. click **"Send email verification"** or **"Reset password"**

(aws does not support this via api - [wontfix](https://github.com/aws/aws-sdk-js/issues/4226))

## account=demo

resources provisioned in the demo account (requires demo account credentials).

**files:**
- `resources.oidc.ts` - github oidc provider + role
- `resources.ts` - aggregates all above

**prereq:** demo account must exist (provision account=.root first)

**setup:**
```bash
use.ehmpathy.demo --owner admin
npx declastruct plan --wish provision/aws.auth/account=demo/resources.ts --into provision/aws.auth/account=demo/.temp/plan.json
npx declastruct apply --plan provision/aws.auth/account=demo/.temp/plan.json
```

## update demo permissions

`resources.common.ts` defines `demoPermissionsPolicy` which is shared by:
- **root account** — SSO permission set (`resources.demo.sso.ts`)
- **demo account** — OIDC role for github actions (`resources.oidc.ts`)

to update permissions, apply to both accounts:

```bash
# 1. update SSO permission set in root account
use.ehmpathy.root --owner admin
source provision/aws.auth/account=.root/.env
npx declastruct plan --wish provision/aws.auth/account=.root/resources.ts --into provision/aws.auth/account=.root/.temp/plan.json
npx declastruct apply --plan provision/aws.auth/account=.root/.temp/plan.json

# 2. update OIDC role in demo account
use.ehmpathy.demo --owner admin
npx declastruct plan --wish provision/aws.auth/account=demo/resources.ts --into provision/aws.auth/account=demo/.temp/plan.json
npx declastruct apply --plan provision/aws.auth/account=demo/.temp/plan.json
```

## keyrack credentials

store aws profiles in keyrack:

```bash
# root account admin (env=sudo)
rhx keyrack set --key AWS_PROFILE --env sudo --owner admin --vault aws.config

# demo account admin (env=test)
rhx keyrack set --key AWS_PROFILE --env test --owner admin --vault aws.config
```

unlock credentials:

```bash
use.ehmpathy.root --owner admin   # root account admin (env=sudo)
use.ehmpathy.demo --owner admin   # demo account admin (env=test)
use.ehmpathy.demo                 # demo account standard access
```

## order of operations

1. bootstrap identity center manually (see `account=.root/bootstrap.md`)
2. store aws profile in keyrack (see keyrack credentials above)
3. provision `account=.root/resources.ts` with `use.ehmpathy.root --owner admin`
4. provision `account=demo/resources.ts` with `use.ehmpathy.demo --owner admin`
