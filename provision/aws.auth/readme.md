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
use.ehmpathy.root.admin
source provision/aws.auth/account=.root/.env
npx declastruct plan --wish provision/aws.auth/account=.root/resources.ts --into provision/aws.auth/account=.root/.temp/plan.json
npx declastruct apply --plan provision/aws.auth/account=.root/.temp/plan.json
```

**after.p1:** configure your cli to enable admin access under the new account

```bash
# findsert the profile block into ~/.aws/config
grep -q '^\[profile ehmpathy\.demo\.admin\]' ~/.aws/config 2>/dev/null || cat >> ~/.aws/config << 'EOF'

[profile ehmpathy.demo.admin]
sso_session = ehmpathy.demo.admin
sso_account_id = xxxxxxxxx
sso_role_name = AdministratorAccess
region = us-east-1
EOF

# findsert the session block into ~/.aws/config
grep -q '^\[sso-session ehmpathy\.demo\.admin\]' ~/.aws/config 2>/dev/null || cat >> ~/.aws/config << 'EOF'

[sso-session ehmpathy.demo.admin]
sso_start_url = https://d-xxxxxxxx.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access
EOF

# add a bash alias for convenience
findsert_alias() {
  local func_def='use_ehmpathy_demo_admin() { export AWS_PROFILE=ehmpathy.demo.admin; aws sts get-caller-identity &>/dev/null || aws sso login; }'
  local alias_def='alias use.ehmpathy.demo.admin=use_ehmpathy_demo_admin'
  grep -qxF "$func_def" ~/.bash_aliases || echo "$func_def" >> ~/.bash_aliases
  grep -qxF "$alias_def" ~/.bash_aliases || echo "$alias_def" >> ~/.bash_aliases
  source ~/.bash_aliases
}
findsert_alias
```


**after.p2:** manually send sso user invitations to new users
1. go to [iam identity center → users](https://us-east-1.console.aws.amazon.com/singlesignon/home)
2. select the user(s) you created
3. click **"Send email verification"** or **"Reset password"**

(aws does not support this via api - [wontfix](https://github.com/aws/aws-sdk-js/issues/4226))

**after.p3** configure your cli to enable demo access under the new account
```bash
# findsert the profile block into ~/.aws/config
grep -q '^\[profile ehmpathy\.demo\]' ~/.aws/config 2>/dev/null || cat >> ~/.aws/config << 'EOF'

[profile ehmpathy.demo]
sso_session = ehmpathy.demo
sso_account_id = xxxxxxxxx
sso_role_name = ehmpathy-demo-sso
region = us-east-1
EOF

# findsert the session block into ~/.aws/config
grep -q '^\[sso-session ehmpathy\.demo\]' ~/.aws/config 2>/dev/null || cat >> ~/.aws/config << 'EOF'

[sso-session ehmpathy.demo]
sso_start_url = https://d-xxxxxxxx.awsapps.com/start
sso_region = us-east-1
sso_registration_scopes = sso:account:access
EOF

# add a bash alias for convenience
findsert_alias() {
  local func_def='use_ehmpathy_demo() { export AWS_PROFILE=ehmpathy.demo; aws sts get-caller-identity &>/dev/null || aws sso login; }'
  local alias_def='alias use.ehmpathy.demo=use_ehmpathy_demo'
  grep -qxF "$func_def" ~/.bash_aliases || echo "$func_def" >> ~/.bash_aliases
  grep -qxF "$alias_def" ~/.bash_aliases || echo "$alias_def" >> ~/.bash_aliases
  source ~/.bash_aliases
}
findsert_alias
```

## account=demo

resources provisioned in the demo account (requires demo account credentials).

**files:**
- `resources.oidc.ts` - github oidc provider + role
- `resources.ts` - aggregates all above

**prereq:** demo account must exist (provision account=.root first)

**setup:**
```bash
use.ehmpathy.demo.admin
npx declastruct plan --wish provision/aws.auth/account=demo/resources.ts --into provision/aws.auth/account=demo/.temp/plan.json
npx declastruct apply --plan provision/aws.auth/account=demo/.temp/plan.json
```

## order of operations

1. bootstrap identity center manually (see `account=.root/bootstrap.md`)
2. provision `account=.root/resources.ts` with admin sso
3. configure demo account sso profile
4. provision `account=demo/resources.ts` with demo account credentials
