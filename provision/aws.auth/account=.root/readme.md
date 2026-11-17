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
3. `.env` holds `SSO_ADMIN_USERNAME`, `SSO_ADMIN_EMAIL`, `SSO_DEMO_EMAIL`. gitignored, so each
   worktree starts without it: fill it with `rhx aws.auth.root.env --mode apply` (below)

## apply

⚠️ one shell session, all steps; the admin sso session lasts 1h.

```bash
# authenticate
use.ehmpathy.root --owner admin

# fill .env from live aws (read-only; plan by default, apply writes; never overwrites other values)
rhx aws.auth.root.env --mode apply

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

`rhx aws.auth.root.env` reads the admin user (the one sso user beside `demo-agent`; pass `--admin`
if more exist) and the demo email (the `demo-agent` user and the `ehmpathy-demo` account must agree,
else it refuses). it refuses a profile that is not the org management account. the first apply, before
those users exist, still fills `.env` by hand from `.env.example`.

## after apply

manually send SSO user invitations:
1. go to [IAM Identity Center → Users](https://us-east-1.console.aws.amazon.com/singlesignon/home)
2. select the user(s) you created
3. click "Send email verification" or "Reset password"

(AWS does not support this via API)
