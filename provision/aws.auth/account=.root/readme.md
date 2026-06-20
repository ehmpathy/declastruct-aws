# aws.auth / account=.root

provisions auth resources in the management (root) account.

## resources

- `resources.admin.sso.ts` — admin SSO user + permission set
- `resources.demo.account.ts` — organization + demo account
- `resources.demo.sso.ts` — demo SSO user + permission set
- `resources.root.account.ts` — root account settings
- `resources.ts` — aggregates all above

## prereqs

1. bootstrap identity center manually (see `bootstrap.md`)
2. store aws profile in keyrack (see `../readme.md` keyrack section)
3. create `.env` from `.env.example` and fill in values

## apply

```bash
# authenticate
use.ehmpathy.root --owner admin

# create .env from example if needed (one-time)
cp -n provision/aws.auth/account=.root/.env.example provision/aws.auth/account=.root/.env
# edit .env with your values (SSO_ADMIN_USERNAME, SSO_ADMIN_EMAIL, SSO_DEMO_EMAIL)

# source env vars (required for SSO user emails)
source provision/aws.auth/account=.root/.env

# plan
npx declastruct plan \
  --wish provision/aws.auth/account=.root/resources.ts \
  --into provision/aws.auth/account=.root/.temp/plan.json

# apply
npx declastruct apply \
  --plan provision/aws.auth/account=.root/.temp/plan.json
```

## after apply

manually send SSO user invitations:
1. go to [IAM Identity Center → Users](https://us-east-1.console.aws.amazon.com/singlesignon/home)
2. select the user(s) you created
3. click "Send email verification" or "Reset password"

(AWS does not support this via API)
